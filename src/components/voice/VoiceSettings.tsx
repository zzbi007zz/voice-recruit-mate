import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Save, Key, Clock, Globe, Info } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceSettingsProps {
  onSettingsChange: (settings: VoiceSettings) => void;
}

export interface VoiceSettings {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  maxCallDuration: number; // minutes
  enableCallTimeWarning: boolean;
  warningTime: number; // minutes before end
  language: 'vi' | 'en';
  autoEndCall: boolean;
  recordCalls: boolean;
  aiPrompt: string;
}

export const VoiceSettings = ({ onSettingsChange }: VoiceSettingsProps) => {
  const [settings, setSettings] = useState<VoiceSettings>({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    maxCallDuration: 30,
    enableCallTimeWarning: true,
    warningTime: 5,
    language: 'vi',
    autoEndCall: true,
    recordCalls: true,
    aiPrompt: 'Bạn là một AI phỏng vấn chuyên nghiệp. Hãy thực hiện cuộc phỏng vấn một cách thân thiện nhưng chuyên nghiệp, đặt câu hỏi phù hợp và đánh giá ứng viên khách quan.',
  });

  const [showApiKeys, setShowApiKeys] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('voiceSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      onSettingsChange(parsed);
    }
  }, [onSettingsChange]);

  const handleSettingChange = <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('voiceSettings', JSON.stringify(newSettings));
    onSettingsChange(newSettings);
  };

  const handleSave = () => {
    // Validate required fields
    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber) {
      toast.error('Vui lòng nhập đầy đủ thông tin Twilio (Account SID, Auth Token, Phone Number)');
      return;
    }

    toast.success('Cài đặt đã được lưu thành công!');
  };

  const isConfigured = settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioPhoneNumber;

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Alert className={isConfigured ? 'border-success bg-success-light' : 'border-warning bg-warning-light'}>
        <Info className="h-4 w-4" />
        <AlertDescription>
        {isConfigured 
          ? '✓ Hệ thống đã được cấu hình và sẵn sàng sử dụng'
          : '⚠️ Cần nhập thông tin Twilio để sử dụng tính năng gọi điện AI'
        }
        </AlertDescription>
      </Alert>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cấu hình API
          </CardTitle>
          <CardDescription>
            Nhập thông tin cấu hình Twilio để thực hiện cuộc gọi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <Label>Hiển thị API Key</Label>
            <Switch 
              checked={showApiKeys} 
              onCheckedChange={setShowApiKeys}
            />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="twilioAccountSid">Twilio Account SID</Label>
              <Input
                id="twilioAccountSid"
                type={showApiKeys ? "text" : "password"}
                value={settings.twilioAccountSid}
                onChange={(e) => handleSettingChange('twilioAccountSid', e.target.value)}
                placeholder="AC••••••••••••••••••••••••••••••••"
              />
            </div>

            <div>
              <Label htmlFor="twilioAuthToken">Twilio Auth Token</Label>
              <Input
                id="twilioAuthToken"
                type={showApiKeys ? "text" : "password"}
                value={settings.twilioAuthToken}
                onChange={(e) => handleSettingChange('twilioAuthToken', e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
              />
            </div>

            <div>
              <Label htmlFor="twilioPhoneNumber">Twilio Phone Number</Label>
              <Input
                id="twilioPhoneNumber"
                type="text"
                value={settings.twilioPhoneNumber}
                onChange={(e) => handleSettingChange('twilioPhoneNumber', e.target.value)}
                placeholder="+1234567890"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Số điện thoại Twilio để thực hiện cuộc gọi (bao gồm mã quốc gia)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Duration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cài đặt thời gian cuộc gọi
          </CardTitle>
          <CardDescription>
            Thiết lập giới hạn thời gian để kiểm soát chi phí
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Thời gian tối đa: {settings.maxCallDuration} phút</Label>
            <Slider
              value={[settings.maxCallDuration]}
              onValueChange={([value]) => handleSettingChange('maxCallDuration', value)}
              max={120}
              min={5}
              step={5}
              className="mt-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>5 phút</span>
              <span>120 phút</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Cảnh báo trước khi hết thời gian</Label>
              <p className="text-sm text-muted-foreground">Thông báo trước khi cuộc gọi sắp hết thời gian</p>
            </div>
            <Switch 
              checked={settings.enableCallTimeWarning}
              onCheckedChange={(checked) => handleSettingChange('enableCallTimeWarning', checked)}
            />
          </div>

          {settings.enableCallTimeWarning && (
            <div>
              <Label>Cảnh báo trước {settings.warningTime} phút</Label>
              <Slider
                value={[settings.warningTime]}
                onValueChange={([value]) => handleSettingChange('warningTime', value)}
                max={15}
                min={1}
                step={1}
                className="mt-2"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>Tự động kết thúc cuộc gọi</Label>
              <p className="text-sm text-muted-foreground">Tự động cắt cuộc gọi khi hết thời gian</p>
            </div>
            <Switch 
              checked={settings.autoEndCall}
              onCheckedChange={(checked) => handleSettingChange('autoEndCall', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Language and Recording Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Cài đặt ngôn ngữ và ghi âm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Ngôn ngữ phỏng vấn</Label>
            <Select 
              value={settings.language} 
              onValueChange={(value: 'vi' | 'en') => handleSettingChange('language', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vi">Tiếng Việt</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Ghi âm cuộc gọi</Label>
              <p className="text-sm text-muted-foreground">Lưu lại cuộc gọi để phân tích sau</p>
            </div>
            <Switch 
              checked={settings.recordCalls}
              onCheckedChange={(checked) => handleSettingChange('recordCalls', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Prompt Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Hướng dẫn AI phỏng vấn
          </CardTitle>
          <CardDescription>
            Tùy chỉnh cách AI thực hiện phỏng vấn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="aiPrompt">Hướng dẫn cho AI</Label>
            <Textarea
              id="aiPrompt"
              value={settings.aiPrompt}
              onChange={(e) => handleSettingChange('aiPrompt', e.target.value)}
              placeholder="Nhập hướng dẫn cho AI về cách thực hiện phỏng vấn..."
              rows={4}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Mô tả cách AI nên thực hiện phỏng vấn, phong cách giao tiếp và tiêu chí đánh giá
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="h-4 w-4" />
        Lưu cài đặt
      </Button>
    </div>
  );
};