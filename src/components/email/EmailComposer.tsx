import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, User, Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  position?: string;
  skills?: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  contact_person?: string;
}

interface EmailComposerProps {
  template?: EmailTemplate;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EmailComposer({ template, trigger, open, onOpenChange }: EmailComposerProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(template || null);
  const [recipientType, setRecipientType] = useState<'candidate' | 'client'>('candidate');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setIsOpen(open);
    }
  };

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : isOpen;

  useEffect(() => {
    loadRecipientsData();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setSubject(selectedTemplate.subject);
      setContent(selectedTemplate.content);
      
      // Initialize variables
      const initialVars: Record<string, string> = {};
      selectedTemplate.variables.forEach(variable => {
        initialVars[variable] = '';
      });
      setVariables(initialVars);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (selectedRecipient && (candidates.length > 0 || clients.length > 0)) {
      autoFillVariables();
    }
  }, [selectedRecipient, recipientType, candidates, clients]);

  const loadRecipientsData = async () => {
    try {
      const [candidatesResult, clientsResult] = await Promise.all([
        supabase.from('candidates').select('id, name, email, position, skills'),
        supabase.from('clients').select('id, name, email, company, contact_person')
      ]);

      if (candidatesResult.data) setCandidates(candidatesResult.data);
      if (clientsResult.data) setClients(clientsResult.data);
    } catch (error) {
      console.error('Error loading recipients:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách người nhận",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const autoFillVariables = () => {
    const recipient = recipientType === 'candidate' 
      ? candidates.find(c => c.id === selectedRecipient)
      : clients.find(c => c.id === selectedRecipient);

    if (!recipient) return;

    const autoVars: Record<string, string> = { ...variables };
    
    // Common variables
    autoVars['name'] = recipient.name;
    autoVars['email'] = recipient.email;
    
    if (recipientType === 'candidate') {
      const candidate = recipient as Candidate;
      autoVars['position'] = candidate.position || '';
      autoVars['skills'] = candidate.skills || '';
    } else {
      const client = recipient as Client;
      autoVars['company'] = client.company;
      autoVars['contact_person'] = client.contact_person || client.name;
    }
    
    setVariables(autoVars);
  };

  const getPreviewContent = () => {
    let previewSubject = subject;
    let previewContent = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value || `{{${key}}}`);
      previewContent = previewContent.replace(new RegExp(placeholder, 'g'), value || `{{${key}}}`);
    });
    
    return { previewSubject, previewContent };
  };

  const handleSend = async () => {
    if (!selectedRecipient || !subject || !content) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive"
      });
      return;
    }

    const recipient = recipientType === 'candidate' 
      ? candidates.find(c => c.id === selectedRecipient)
      : clients.find(c => c.id === selectedRecipient);

    if (!recipient) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy người nhận",
        variant: "destructive"
      });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          templateId: selectedTemplate?.id || null,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          recipientType,
          recipientId: recipient.id,
          variables,
          customSubject: subject,
          customContent: content
        }
      });

      if (error) throw error;

      toast({
        title: "Thành công",
        description: `Email đã được gửi đến ${recipient.name}`,
      });

      handleOpenChange(false);
      
      // Reset form
      setSelectedRecipient('');
      setSubject('');
      setContent('');
      setVariables({});
      
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể gửi email",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const recipients = recipientType === 'candidate' ? candidates : clients;
  const { previewSubject, previewContent } = getPreviewContent();

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Soạn Email
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="compose" className="w-full">
          <TabsList>
            <TabsTrigger value="compose">Soạn Email</TabsTrigger>
            <TabsTrigger value="preview">Xem trước</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            {/* Recipient Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại người nhận</Label>
                <Select value={recipientType} onValueChange={(value: 'candidate' | 'client') => setRecipientType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Ứng viên
                      </div>
                    </SelectItem>
                    <SelectItem value="client">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Khách hàng
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chọn người nhận</Label>
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người nhận..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </SelectItem>
                    ) : (
                      recipients.map((recipient) => (
                        <SelectItem key={recipient.id} value={recipient.id}>
                          <div className="flex flex-col">
                            <span>{recipient.name}</span>
                            <span className="text-xs text-muted-foreground">{recipient.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variables */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Biến template</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={variable} className="text-xs">
                        {variable}
                        <Badge variant="outline" className="ml-1 text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      </Label>
                      <Input
                        id={variable}
                        value={variables[variable] || ''}
                        onChange={(e) => setVariables(prev => ({
                          ...prev,
                          [variable]: e.target.value
                        }))}
                        placeholder={`Nhập ${variable}...`}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Email Content */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Tiêu đề</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Nhập tiêu đề email..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Nội dung</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung email..."
                  rows={10}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Xem trước email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tiêu đề:</Label>
                  <p className="font-medium">{previewSubject}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nội dung:</Label>
                  <div className="mt-2 p-4 border rounded-md bg-muted/10">
                    <pre className="whitespace-pre-wrap text-sm">{previewContent}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSend} disabled={sending || !selectedRecipient}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang gửi...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Gửi Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}