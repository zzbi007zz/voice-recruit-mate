import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  vbeeApiKey: string;
  vbeeVoiceId: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  maxCallDuration: number; // minutes
  enableCallTimeWarning: boolean;
  warningTime: number; // minutes before end
  language: 'vi' | 'en';
  autoEndCall: boolean;
  recordCalls: boolean;
}

export const VoiceSettings = ({ onSettingsChange }: VoiceSettingsProps) => {
  const [settings, setSettings] = useState<VoiceSettings>({
    vbeeApiKey: '',
    vbeeVoiceId: 'vi-female-1', // Default Vietnamese female voice
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    maxCallDuration: 30,
    enableCallTimeWarning: true,
    warningTime: 5,
    language: 'vi',
    autoEndCall: true,
    recordCalls: true,
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
    if (!settings.vbeeApiKey) {
      toast.error('Vui lòng nhập vBee API Key để sử dụng tính năng gọi điện AI');
      return;
    }
    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber) {
      toast.error('Vui lòng nhập đầy đủ thông tin Twilio (Account SID, Auth Token, Phone Number)');
      return;
    }

    toast.success('Cài đặt đã được lưu thành công!');
  };

  const isConfigured = settings.vbeeApiKey && settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioPhoneNumber;

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <Alert className={isConfigured ? 'border-success bg-success-light' : 'border-warning bg-warning-light'}>
        <Info className="h-4 w-4" />
        <AlertDescription>
        {isConfigured 
          ? '✓ Hệ thống đã được cấu hình và sẵn sàng sử dụng'
          : '⚠️ Cần nhập vBee API Key và thông tin Twilio để sử dụng tính năng gọi điện AI'
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
            Nhập API keys và cấu hình cho vBee và Twilio
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
              <Label htmlFor="vbeeApiKey">vBee API Key</Label>
              <Input
                id="vbeeApiKey"
                type={showApiKeys ? "text" : "password"}
                value={settings.vbeeApiKey}
                onChange={(e) => handleSettingChange('vbeeApiKey', e.target.value)}
                placeholder="vbee_api_key_••••••••••••••••"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lấy API key từ{' '}
                <a href="https://vbee.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  vBee.ai
                </a>
              </p>
            </div>

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

            <div>
              <Label htmlFor="vbeeVoice">Giọng nói vBee</Label>
              <Select 
                value={settings.vbeeVoiceId} 
                onValueChange={(value) => handleSettingChange('vbeeVoiceId', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi-female-1">Nữ miền Bắc - Tự nhiên</SelectItem>
                  <SelectItem value="vi-female-2">Nữ miền Nam - Dễ thương</SelectItem>
                  <SelectItem value="vi-male-1">Nam miền Bắc - Chuyên nghiệp</SelectItem>
                  <SelectItem value="vi-male-2">Nam miền Nam - Thân thiện</SelectItem>
                  <SelectItem value="vi-female-young">Nữ trẻ - Năng động</SelectItem>
                  <SelectItem value="vi-male-young">Nam trẻ - Năng động</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full gap-2">
        <Save className="h-4 w-4" />
        Lưu cài đặt
      </Button>
    </div>
  );
};