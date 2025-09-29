import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Search, RefreshCw, User, Users, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface EmailLog {
  id: string;
  template_id?: string;
  recipient_email: string;
  recipient_name: string;
  recipient_type: 'candidate' | 'client';
  recipient_id?: string;
  subject: string;
  content: string;
  variables: Record<string, string>;
  status: 'sent' | 'delivered' | 'failed' | 'bounced';
  sent_at: string;
  email_templates?: {
    name: string;
  };
}

export function EmailHistory() {
  const { toast } = useToast();
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadEmailHistory();
  }, []);

  const loadEmailHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_logs')
        .select(`
          *,
          email_templates (
            name
          )
        `)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      setEmails(data as EmailLog[] || []);
    } catch (error: any) {
      console.error('Error loading email history:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải lịch sử email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      sent: 'default',
      delivered: 'default',
      failed: 'destructive',
      bounced: 'destructive'
    } as const;

    const labels = {
      sent: 'Đã gửi',
      delivered: 'Đã giao',
      failed: 'Thất bại',
      bounced: 'Bị trả về'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getRecipientTypeIcon = (type: string) => {
    return type === 'candidate' ? (
      <User className="h-4 w-4" />
    ) : (
      <Users className="h-4 w-4" />
    );
  };

  const getRecipientTypeLabel = (type: string) => {
    return type === 'candidate' ? 'Ứng viên' : 'Khách hàng';
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      email.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || email.status === statusFilter;
    const matchesType = typeFilter === 'all' || email.recipient_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lịch sử Email</h2>
          <p className="text-muted-foreground">
            Theo dõi tất cả email đã gửi
          </p>
        </div>
        <Button onClick={loadEmailHistory} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="sent">Đã gửi</SelectItem>
                <SelectItem value="delivered">Đã giao</SelectItem>
                <SelectItem value="failed">Thất bại</SelectItem>
                <SelectItem value="bounced">Bị trả về</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Loại người nhận" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="candidate">Ứng viên</SelectItem>
                <SelectItem value="client">Khách hàng</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              Tổng: {filteredEmails.length} email
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Đang tải lịch sử email...</p>
            </CardContent>
          </Card>
        ) : filteredEmails.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Chưa có email nào</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Không tìm thấy email nào phù hợp với bộ lọc'
                  : 'Bắt đầu gửi email để xem lịch sử tại đây'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredEmails.map((email) => (
            <Card key={email.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{email.subject}</h3>
                      {getStatusBadge(email.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getRecipientTypeIcon(email.recipient_type)}
                        <span>{getRecipientTypeLabel(email.recipient_type)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        <span>{email.recipient_name} ({email.recipient_email})</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(email.sent_at), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                    </div>

                    {email.email_templates && (
                      <div className="text-sm text-muted-foreground">
                        Template: <span className="font-medium">{email.email_templates.name}</span>
                      </div>
                    )}

                    {Object.keys(email.variables).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(email.variables).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}