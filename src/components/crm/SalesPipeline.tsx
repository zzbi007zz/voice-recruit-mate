import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// Note: Drag and drop will be added after dependency is installed
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Phone, Mail, Calendar, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string | null;
  status: string;
  value: number;
  notes: string | null;
  last_contact: string | null;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
  updated_at: string;
}

interface SalesPipelineProps {
  onCreateClient?: (leadData: Lead) => void;
}

export const SalesPipeline = ({ onCreateClient }: SalesPipelineProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newLead, setNewLead] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    value: 0,
    notes: '',
    next_action: '',
    next_action_date: '',
  });
  const { toast } = useToast();

  const statusConfig = {
    lead: { label: 'Lead', color: 'bg-muted text-muted-foreground', icon: Users },
    prospect: { label: 'Prospect', color: 'bg-primary text-primary-foreground', icon: Phone },
    presentation: { label: 'Presentation', color: 'bg-warning text-warning-foreground', icon: Calendar },
    negotiation: { label: 'Negotiation', color: 'bg-accent text-accent-foreground', icon: DollarSign },
    contract: { label: 'Contract', color: 'bg-success text-success-foreground', icon: TrendingUp },
    closed_won: { label: 'Won', color: 'bg-success text-success-foreground', icon: TrendingUp },
    closed_lost: { label: 'Lost', color: 'bg-destructive text-destructive-foreground', icon: AlertCircle },
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const saveLead = async () => {
    try {
      const leadData = {
        ...newLead,
        status: 'lead' as const,
        last_contact: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('sales_leads')
        .insert([leadData]);

      if (error) throw error;

      await loadLeads();
      setNewLead({
        company_name: '',
        contact_person: '',
        email: '',
        phone: '',
        value: 0,
        notes: '',
        next_action: '',
        next_action_date: '',
      });
      setIsEditing(false);

      toast({
        title: "Lead đã được tạo",
        description: "Lead mới đã được thêm vào pipeline",
      });
    } catch (error) {
      console.error('Error saving lead:', error);
      toast({
        title: "Lỗi tạo lead",
        description: "Không thể tạo lead mới",
        variant: "destructive",
      });
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sales_leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      await loadLeads();
      toast({
        title: "Cập nhật thành công",
        description: "Trạng thái lead đã được cập nhật",
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Lỗi cập nhật",
        description: "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const leadId = result.draggableId;
    const newStatus = result.destination.droppableId;
    
    updateLeadStatus(leadId, newStatus);
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const getTotalValue = () => {
    return leads
      .filter(lead => !['closed_lost'].includes(lead.status))
      .reduce((sum, lead) => sum + lead.value, 0);
  };

  const getWonValue = () => {
    return leads
      .filter(lead => lead.status === 'closed_won')
      .reduce((sum, lead) => sum + lead.value, 0);
  };

  const convertToClient = async (lead: Lead) => {
    try {
      // Create client record
      const clientData = {
        name: lead.contact_person,
        company: lead.company_name,
        email: lead.email,
        phone: lead.phone,
        notes: lead.notes,
        status: 'active',
      };

      const { error } = await supabase
        .from('clients')
        .insert([clientData]);

      if (error) throw error;

      // Update lead status
      await updateLeadStatus(lead.id, 'closed_won');

      onCreateClient?.(lead);

      toast({
        title: "Chuyển đổi thành công",
        description: "Lead đã được chuyển thành khách hàng",
      });
    } catch (error) {
      console.error('Error converting to client:', error);
      toast({
        title: "Lỗi chuyển đổi",
        description: "Không thể chuyển lead thành khách hàng",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Sales Pipeline</h2>
          <p className="text-muted-foreground">Quản lý quy trình bán hàng và theo dõi leads</p>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Thêm Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Thêm Lead Mới</DialogTitle>
              <DialogDescription>
                Thêm khách hàng tiềm năng vào sales pipeline
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tên công ty</label>
                <Input
                  value={newLead.company_name}
                  onChange={(e) => setNewLead(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="VD: ABC Tech Co."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Người liên hệ</label>
                <Input
                  value={newLead.contact_person}
                  onChange={(e) => setNewLead(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Số điện thoại</label>
                <Input
                  value={newLead.phone}
                  onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0123456789"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Giá trị dự kiến (VNĐ)</label>
                <Input
                  type="number"
                  value={newLead.value}
                  onChange={(e) => setNewLead(prev => ({ ...prev, value: Number(e.target.value) }))}
                  placeholder="10000000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Hành động tiếp theo</label>
                <Input
                  value={newLead.next_action}
                  onChange={(e) => setNewLead(prev => ({ ...prev, next_action: e.target.value }))}
                  placeholder="VD: Gọi điện follow up"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Ghi chú</label>
                <Textarea
                  value={newLead.notes}
                  onChange={(e) => setNewLead(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Thông tin bổ sung về lead..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Hủy
              </Button>
              <Button onClick={saveLead} className="bg-gradient-primary">
                Tạo Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Giá trị Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getTotalValue().toLocaleString('vi-VN')} ₫
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Đã thành công</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {getWonValue().toLocaleString('vi-VN')} ₫
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ chuyển đổi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'closed_won').length / leads.length) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 overflow-x-auto">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusLeads = getLeadsByStatus(status);
          const IconComponent = config.icon;
          
          return (
            <div key={status} className="min-w-72">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="w-4 h-4" />
                  <h3 className="font-medium">{config.label}</h3>
                  <Badge variant="secondary">{statusLeads.length}</Badge>
                </div>
              </div>
              
              <div className="min-h-96 p-2 rounded-lg border-2 border-dashed border-border">
                <div className="space-y-3">
                  {statusLeads.map((lead, index) => (
                    <Card
                      key={lead.id}
                      className="cursor-move transition-shadow hover:shadow-card"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{lead.company_name}</CardTitle>
                        <CardDescription className="text-xs">
                          {lead.contact_person}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-success">
                            {(Number(lead.value) || 0).toLocaleString('vi-VN')} ₫
                          </div>
                          {lead.next_action && (
                            <div className="text-xs text-muted-foreground truncate">
                              Next: {lead.next_action}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="w-3 h-3" />
                            </Button>
                            {status === 'contract' && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  convertToClient(lead);
                                }}
                              >
                                → Client
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};