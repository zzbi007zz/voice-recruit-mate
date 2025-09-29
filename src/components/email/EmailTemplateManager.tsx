import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Plus, Edit, Trash2, Send, Globe, Zap } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'candidate' | 'client' | 'follow_up' | 'interview' | 'rejection' | 'offer';
  language: 'vi' | 'en';
  variables: string[];
  created_at: string;
}

interface EmailTemplateManagerProps {
  onSendEmail?: (template: EmailTemplate, recipient: string) => void;
}

export const EmailTemplateManager = ({ onSendEmail }: EmailTemplateManagerProps) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'candidate' as const,
    language: 'vi' as const,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.category) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập tên và chọn loại template",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-email-template', {
        body: {
          name: newTemplate.name,
          category: newTemplate.category,
          language: newTemplate.language,
        }
      });

      if (error) throw error;

      setNewTemplate(prev => ({
        ...prev,
        subject: data.subject,
        content: data.content,
      }));

      toast({
        title: "Tạo template thành công",
        description: "AI đã tạo nội dung email tự động",
      });
    } catch (error) {
      console.error('Error generating template:', error);
      toast({
        title: "Lỗi tạo template",
        description: "Không thể tạo template tự động",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveTemplate = async () => {
    try {
      const templateData = {
        ...newTemplate,
        variables: extractVariables(newTemplate.content),
      };

      const { error } = await supabase
        .from('email_templates')
        .insert([templateData]);

      if (error) throw error;

      await loadTemplates();
      setNewTemplate({
        name: '',
        subject: '',
        content: '',
        category: 'candidate',
        language: 'vi',
      });
      setIsEditing(false);

      toast({
        title: "Lưu thành công",
        description: "Template đã được lưu",
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Lỗi lưu template",
        description: "Không thể lưu template",
        variant: "destructive",
      });
    }
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2).trim()) : [];
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadTemplates();
      toast({
        title: "Xóa thành công",
        description: "Template đã được xóa",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Lỗi xóa template",
        description: "Không thể xóa template",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      candidate: 'bg-primary text-primary-foreground',
      client: 'bg-success text-success-foreground',
      follow_up: 'bg-warning text-warning-foreground',
      interview: 'bg-accent text-accent-foreground',
      rejection: 'bg-destructive text-destructive-foreground',
      offer: 'bg-success text-success-foreground',
    };
    return colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      candidate: 'Ứng viên',
      client: 'Khách hàng',
      follow_up: 'Theo dõi',
      interview: 'Phỏng vấn',
      rejection: 'Từ chối',
      offer: 'Đề nghị',
    };
    return labels[category as keyof typeof labels] || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">Quản lý Template Email</h2>
          <p className="text-muted-foreground">Tạo và quản lý template email tự động</p>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Tạo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tạo Email Template Mới</DialogTitle>
              <DialogDescription>
                Sử dụng AI để tạo template email chuyên nghiệp
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Thông tin cơ bản</TabsTrigger>
                <TabsTrigger value="content">Nội dung</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Tên template</label>
                    <Input
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="VD: Email chào mừng ứng viên"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Loại</label>
                    <Select
                      value={newTemplate.category}
                      onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="candidate">Ứng viên</SelectItem>
                        <SelectItem value="client">Khách hàng</SelectItem>
                        <SelectItem value="follow_up">Theo dõi</SelectItem>
                        <SelectItem value="interview">Phỏng vấn</SelectItem>
                        <SelectItem value="rejection">Từ chối</SelectItem>
                        <SelectItem value="offer">Đề nghị</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Ngôn ngữ</label>
                  <Select
                    value={newTemplate.language}
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, language: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">🇻🇳 Tiếng Việt</SelectItem>
                      <SelectItem value="en">🇺🇸 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={generateTemplate} 
                  disabled={isGenerating}
                  className="w-full bg-gradient-primary"
                >
                  {isGenerating ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Tạo nội dung với AI
                    </>
                  )}
                </Button>
              </TabsContent>
              <TabsContent value="content" className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tiêu đề</label>
                  <Input
                    value={newTemplate.subject}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Tiêu đề email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nội dung</label>
                  <Textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Nội dung email... Sử dụng {{tên_biến}} để chèn thông tin động"
                    rows={10}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tip: Sử dụng {'{{'} tên_ứng_viên {'}},'} {'{{'} tên_công_ty {'}},'} {'{{'} vị_trí {'}},'} etc. để chèn thông tin
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Hủy
              </Button>
              <Button onClick={saveTemplate} className="bg-gradient-primary">
                Lưu Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-hover transition-all">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {getCategoryLabel(template.category)}
                    </Badge>
                    <Badge variant="outline">
                      <Globe className="w-3 h-3 mr-1" />
                      {template.language === 'vi' ? 'VI' : 'EN'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedTemplate(template)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteTemplate(template.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm font-medium mb-2">
                {template.subject}
              </CardDescription>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {template.content.substring(0, 100)}...
              </p>
              {template.variables.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Biến:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onSendEmail?.(template, '')}
                >
                  <Send className="w-4 h-4 mr-1" />
                  Gửi
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có template nào</h3>
            <p className="text-muted-foreground mb-4">
              Tạo template email đầu tiên để bắt đầu
            </p>
            <Button onClick={() => setIsEditing(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Tạo Template Đầu Tiên
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};