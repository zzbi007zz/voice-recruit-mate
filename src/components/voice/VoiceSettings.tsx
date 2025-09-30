import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Clock, 
  Volume2, 
  Mic, 
  CheckCircle,
  Info,
  Zap,
  Brain
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiKeyStatus from './ApiKeyStatus';
import SetupGuide from './SetupGuide';

interface VoiceSettingsProps {
  onSettingsChange?: (settings: any) => void;
}

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    // Call Settings
    callMode: 'phone', // 'phone' or 'web'
    language: 'vi',
    maxCallDuration: 30, // minutes
    autoEndCall: true,
    enableCallTimeWarning: true,
    warningTime: 5, // minutes before end
    
    // AI Settings
    aiPrompt: 'Thực hiện cuộc phỏng vấn chuyên nghiệp, tập trung vào kỹ năng kỹ thuật và sự phù hợp văn hóa. Hãy hỏi về kinh nghiệm làm việc, dự án đã thực hiện và mục tiêu nghề nghiệp.',
    voiceModel: 'alloy',
    temperature: 0.8,
    
    // Recording Settings
    enableRecording: true,
    enableTranscription: true,
    enableAIAnalysis: true,
  });

  const [isSystemReady, setIsSystemReady] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('voiceSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  // Save settings to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
    if (onSettingsChange) {
      onSettingsChange({
        ...settings,
        systemReady: isSystemReady
      });
    }
  }, [settings, onSettingsChange, isSystemReady]);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">System Status</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="setup">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                API Configuration Status
              </CardTitle>
              <CardDescription>
                Check your API keys configuration for the interview system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyStatus onStatusChange={setIsSystemReady} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <SetupGuide />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Cấu hình AI
            </CardTitle>
            <CardDescription>
              Tùy chỉnh hành vi của AI trong cuộc phỏng vấn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voiceModel">Giọng nói AI</Label>
              <Select value={settings.voiceModel} onValueChange={(value) => updateSetting('voiceModel', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alloy">Alloy (Trung tính)</SelectItem>
                  <SelectItem value="echo">Echo (Nam)</SelectItem>
                  <SelectItem value="fable">Fable (Anh - Nam)</SelectItem>
                  <SelectItem value="onyx">Onyx (Nam - Trầm)</SelectItem>
                  <SelectItem value="nova">Nova (Nữ - Trẻ)</SelectItem>
                  <SelectItem value="shimmer">Shimmer (Nữ - Ấm)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Ngôn ngữ</Label>
              <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiPrompt">Hướng dẫn AI</Label>
              <Textarea
                id="aiPrompt"
                value={settings.aiPrompt}
                onChange={(e) => updateSetting('aiPrompt', e.target.value)}
                placeholder="Mô tả cách AI nên thực hiện cuộc phỏng vấn..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cài đặt cuộc gọi
          </CardTitle>
          <CardDescription>
            Cấu hình thời gian và tính năng cuộc gọi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="callMode">Chế độ cuộc gọi</Label>
            <Select value={settings.callMode} onValueChange={(value) => updateSetting('callMode', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Cuộc gọi điện thoại (Twilio)</SelectItem>
                <SelectItem value="web">Cuộc gọi trên web (Trình duyệt)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.callMode === 'phone' 
                ? 'Hệ thống sẽ gọi điện thoại cho ứng viên qua Twilio'
                : 'Cuộc phỏng vấn diễn ra trực tiếp trên trình duyệt'}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxCallDuration">Thời gian tối đa (phút)</Label>
              <Select 
                value={settings.maxCallDuration.toString()} 
                onValueChange={(value) => updateSetting('maxCallDuration', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 phút</SelectItem>
                  <SelectItem value="30">30 phút</SelectItem>
                  <SelectItem value="45">45 phút</SelectItem>
                  <SelectItem value="60">60 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warningTime">Cảnh báo trước (phút)</Label>
              <Select 
                value={settings.warningTime.toString()} 
                onValueChange={(value) => updateSetting('warningTime', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 phút</SelectItem>
                  <SelectItem value="5">5 phút</SelectItem>
                  <SelectItem value="10">10 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tự động kết thúc</Label>
                <p className="text-sm text-muted-foreground">
                  Tự động kết thúc khi hết thời gian
                </p>
              </div>
              <Switch
                checked={settings.autoEndCall}
                onCheckedChange={(checked) => updateSetting('autoEndCall', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cảnh báo thời gian</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi sắp hết thời gian
                </p>
              </div>
              <Switch
                checked={settings.enableCallTimeWarning}
                onCheckedChange={(checked) => updateSetting('enableCallTimeWarning', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ghi âm cuộc gọi</Label>
                <p className="text-sm text-muted-foreground">
                  Tự động ghi âm để phân tích
                </p>
              </div>
              <Switch
                checked={settings.enableRecording}
                onCheckedChange={(checked) => updateSetting('enableRecording', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Phân tích AI</Label>
                <p className="text-sm text-muted-foreground">
                  Tạo báo cáo phân tích sau phỏng vấn
                </p>
              </div>
              <Switch
                checked={settings.enableAIAnalysis}
                onCheckedChange={(checked) => updateSetting('enableAIAnalysis', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { VoiceSettings };