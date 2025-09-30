import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff,
  Volume2, 
  VolumeX, 
  Info,
  Settings,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceSettings } from './VoiceSettings';
import { useToast } from '@/components/ui/use-toast';
import InterviewProgress from '../interviews/InterviewProgress';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';

interface CallSession {
  id: string;
  candidateName: string;
  candidatePhone: string;
  duration: number;
  status: 'idle' | 'connecting' | 'ringing' | 'active' | 'completed' | 'failed' | 'error';
  transcript?: string;
  aiInsights?: string;
  maxDuration?: number;
  startTime?: Date;
  callSid?: string;
  interviewId?: string;
}

interface VoiceCallPanelProps {
  selectedCandidate?: any;
}

export const VoiceCallPanel = ({ selectedCandidate: preSelectedCandidate }: VoiceCallPanelProps) => {
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Thực hiện cuộc phỏng vấn chuyên nghiệp, tập trung vào kỹ năng kỹ thuật và sự phù hợp văn hóa. Hãy hỏi về kinh nghiệm làm việc, dự án đã thực hiện và mục tiêu nghề nghiệp.');
  const [settings, setSettings] = useState<any | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'ringing' | 'active' | 'completed' | 'failed'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('voiceSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        console.log('Settings loaded:', parsed);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    } else {
      // Set default settings if none exist
      const defaultSettings = {
        callMode: 'phone',
        language: 'vi',
        maxCallDuration: 30,
        autoEndCall: true,
        enableCallTimeWarning: true,
        warningTime: 5
      };
      setSettings(defaultSettings);
      console.log('Using default settings:', defaultSettings);
    }
    setSettingsLoaded(true);
  }, []);

  // Initialize realtime chat
  const realtimeChat = useRealtimeChat({
    interviewId: currentCall?.id,
    aiPrompt,
    onStatusChange: (status) => {
      if (status === 'connected') {
        setCallStatus('active');
      } else if (status === 'connecting') {
        setCallStatus('connecting');
      } else if (status === 'error') {
        setCallStatus('failed');
      } else {
        setCallStatus('idle');
      }
    },
    onSpeakingChange: setIsSpeaking
  });

  // Fetch candidates from database
  useEffect(() => {
    const fetchCandidates = async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setCandidates(data);
      }
    };
    
    fetchCandidates();
  }, []);

  // Auto-select candidate if passed from props
  useEffect(() => {
    if (preSelectedCandidate && candidates.length > 0) {
      setSelectedCandidate(preSelectedCandidate.id);
    }
  }, [preSelectedCandidate, candidates]);

  // Vietnamese call history
  const [callHistory] = useState<CallSession[]>([
    {
      id: '1',
      candidateName: 'Nguyễn Văn An',
      candidatePhone: 'Web Call',
      duration: 1847, // seconds
      status: 'completed',
      transcript: 'Cuộc phỏng vấn AI thảo luận về kinh nghiệm React và portfolio dự án...',
      aiInsights: 'Nền tảng kỹ thuật vững chắc, kỹ năng giao tiếp tốt, có vẻ nhiệt tình với vị trí này.',
    },
    {
      id: '2',
      candidateName: 'Trần Thị Minh',
      candidatePhone: 'Web Call',
      duration: 2156,
      status: 'completed',
      transcript: 'Phỏng vấn AI về Node.js, cơ sở dữ liệu và kiến trúc hệ thống...',
      aiInsights: 'Kiến thức kỹ thuật xuất sắc, có kinh nghiệm với hệ thống có thể mở rộng, phương pháp giải quyết vấn đề tốt.',
    },
  ]);

  // Timer effect for call duration
  useEffect(() => {
    if (callStatus === 'active' && settings) {
      const maxDuration = settings.maxCallDuration * 60; // Convert to seconds
      setTimeRemaining(maxDuration);
      
      const interval = setInterval(() => {
        setCurrentCall(prev => {
          if (!prev) return null;
          const newDuration = prev.duration + 1;
          setTimeRemaining(maxDuration - newDuration);
          
          // Warning notification
          if (settings.enableCallTimeWarning && 
              maxDuration - newDuration === settings.warningTime * 60) {
            toast({
              title: "Cảnh báo",
              description: `Cuộc gọi sẽ kết thúc sau ${settings.warningTime} phút`,
              variant: "destructive",
            });
          }
          
          // Auto end call if enabled
          if (settings.autoEndCall && newDuration >= maxDuration) {
            handleEndCall();
            return prev;
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);
      
      setCallTimer(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [callStatus, settings]);

  // Standardize phone number to international format
  const standardizePhoneNumber = (phone: string): string | null => {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Vietnamese phone numbers
    if (cleaned.startsWith('84')) {
      return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Remove leading 0 and add +84
      return '+84' + cleaned.substring(1);
    } else if (cleaned.length === 9 || cleaned.length === 10) {
      // Assume it's a Vietnamese number without country code
      return '+84' + cleaned;
    }
    
    // If it doesn't start with +, add it
    if (!phone.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return phone;
  };

  // Validate phone number
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return false;
    const standardized = standardizePhoneNumber(phone);
    if (!standardized) return false;
    
    // Basic validation: must start with + and have at least 10 digits
    return /^\+\d{10,15}$/.test(standardized);
  };

  const handleStartCall = async () => {
    console.log('=== START CALL DEBUG ===');
    console.log('Settings loaded:', settingsLoaded);
    console.log('Current settings:', settings);
    console.log('Selected candidate:', selectedCandidate);
    
    if (!settingsLoaded) {
      toast({
        title: "Đang tải cài đặt",
        description: 'Vui lòng đợi hệ thống tải cài đặt...',
        variant: "destructive",
      });
      return;
    }

    if (!selectedCandidate) {
      toast({
        title: "Lỗi",
        description: 'Vui lòng chọn ứng viên để gọi',
        variant: "destructive",
      });
      return;
    }

    const candidate = candidates.find(c => c.id === selectedCandidate);
    console.log('Found candidate:', candidate);
    
    if (!candidate) {
      toast({
        title: "Lỗi",
        description: 'Không tìm thấy thông tin ứng viên',
        variant: "destructive",
      });
      return;
    }

    // Validate phone number for phone mode
    if (settings?.callMode === 'phone') {
      console.log('Phone mode enabled, validating phone number...');
      console.log('Raw phone number:', candidate.phone);
      
      if (!candidate.phone) {
        toast({
          title: "Thiếu số điện thoại",
          description: 'Ứng viên này không có số điện thoại. Vui lòng cập nhật số điện thoại hoặc chuyển sang chế độ "Web Call".',
          variant: "destructive",
        });
        return;
      }

      const standardizedPhone = standardizePhoneNumber(candidate.phone);
      console.log('Standardized phone:', standardizedPhone);
      
      if (!validatePhoneNumber(candidate.phone)) {
        toast({
          title: "Số điện thoại không hợp lệ",
          description: `Số điện thoại "${candidate.phone}" không đúng định dạng. Vui lòng sử dụng định dạng: +84XXXXXXXXX hoặc 0XXXXXXXXX`,
          variant: "destructive",
        });
        return;
      }

      // Update candidate phone with standardized version
      candidate.phone = standardizedPhone;
      console.log('Using standardized phone:', candidate.phone);
    }

    // Check API configuration before starting
    try {
      const { data: configCheck, error: configError } = await supabase.functions.invoke('check-api-config');
      console.log('Config check result:', configCheck, configError);
      
      if (configError) {
        console.error('Config check error:', configError);
        toast({
          title: "Lỗi kiểm tra cấu hình",
          description: configError.message || "Không thể kiểm tra cấu hình API",
          variant: "destructive",
        });
        return;
      }
      
      if (!configCheck?.ready) {
        toast({
          title: "Cấu hình API chưa sẵn sàng",
          description: "Vui lòng cấu hình OpenAI và ElevenLabs API keys trước khi bắt đầu cuộc phỏng vấn. Kiểm tra tab 'Cài đặt' > 'Setup Guide'.",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('Error checking API config:', error);
      toast({
        title: "Không thể kiểm tra cấu hình",
        description: error.message || "Có lỗi xảy ra khi kiểm tra cấu hình API. Vui lòng thử lại.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCallStatus('connecting');
      toast({
        title: "Đang khởi tạo",
        description: `Đang tạo phiên phỏng vấn với ${candidate.name}...`,
      });
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const recruiterId = user?.id || '00000000-0000-0000-0000-000000000000';
      
      console.log('Creating interview with data:', {
        candidatePhone: candidate.phone || candidate.email || 'web-call',
        recruiterId: recruiterId,
        role: candidate.position || 'Interview Position',
        language: settings?.language || 'vi',
        metadata: {
          aiPrompt: aiPrompt,
          candidateName: candidate.name,
          candidateId: selectedCandidate,
          callMode: settings?.callMode
        }
      });
      
      // Create interview record
      const { data: interview, error: createError } = await supabase.functions.invoke('create-interview', {
        body: {
          candidatePhone: candidate.phone || candidate.email || 'web-call',
          recruiterId: recruiterId,
          role: candidate.position || 'Interview Position',
          language: settings?.language || 'vi',
          metadata: {
            aiPrompt: aiPrompt,
            candidateName: candidate.name,
            candidateId: selectedCandidate,
            callMode: settings?.callMode
          }
        }
      });

      console.log('Interview creation response:', { interview, createError });

      if (createError) {
        console.error('Create interview error:', createError);
        throw new Error(`Không thể tạo phiên phỏng vấn: ${createError.message}`);
      }

      if (!interview?.id) {
        throw new Error('Không nhận được ID phiên phỏng vấn');
      }

      // Create call session state
      const newCall: CallSession = {
        id: interview.id,
        candidateName: candidate.name,
        candidatePhone: candidate.phone || 'Web Call',
        duration: 0,
        status: 'connecting',
        callSid: interview.id,
        interviewId: interview.id
      };

      setCurrentCall(newCall);

      // Check if we should make a phone call or web call
      console.log('Checking call mode:', settings?.callMode);
      console.log('Has phone:', !!candidate.phone);
      
      if (settings?.callMode === 'phone' && candidate.phone) {
        console.log('=== INITIATING PHONE CALL ===');
        console.log('Interview ID:', interview.id);
        console.log('Phone number:', candidate.phone);
        
        // Make actual phone call via Twilio
        setCallStatus('ringing');
        toast({
          title: "Đang gọi điện",
          description: `Đang gọi điện thoại đến ${candidate.phone}...`,
        });

        try {
          console.log('Invoking trigger-call function...');
          const { data: callData, error: callError } = await supabase.functions.invoke('trigger-call', {
            body: { interviewId: interview.id }
          });

          console.log('trigger-call response:', { callData, callError });

          if (callError) {
            console.error('Trigger call error:', callError);
            throw new Error(`Không thể bắt đầu cuộc gọi: ${callError.message}`);
          }

          if (!callData) {
            throw new Error('Không nhận được phản hồi từ hệ thống gọi điện');
          }

          console.log('Phone call initiated successfully:', callData);
          
          // Update call with Twilio SID
          if (callData?.callSid) {
            console.log('Call SID received:', callData.callSid);
            setCurrentCall(prev => prev ? { ...prev, callSid: callData.callSid } : null);
          }

          // Monitor call status from database
          const callSessionSubscription = supabase
            .channel(`call-session-${interview.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'call_sessions',
                filter: `interview_id=eq.${interview.id}`
              },
              (payload: any) => {
                console.log('Call session update:', payload);
                if (payload.new && typeof payload.new === 'object' && 'status' in payload.new) {
                  const status = payload.new.status as string;
                  console.log('Call status changed to:', status);
                  
                  if (status === 'completed' || status === 'failed' || status === 'no-answer') {
                    setCallStatus('completed');
                    toast({
                      title: "Cuộc gọi kết thúc",
                      description: `Trạng thái: ${status}`,
                    });
                  } else if (status === 'in-progress') {
                    setCallStatus('active');
                  } else if (status === 'ringing') {
                    setCallStatus('ringing');
                  }
                }
              }
            )
            .subscribe();

          setCallStatus('active');
          toast({
            title: "Cuộc gọi đang diễn ra",
            description: `Đã bắt đầu cuộc gọi với ${candidate.name}`,
          });

          // Store subscription for cleanup
          (window as any).callSubscription = callSessionSubscription;

        } catch (callError) {
          console.error('Phone call error:', callError);
          throw callError;
        }
      } else {
        console.log('=== INITIATING WEB CALL ===');
        // Web-based interview
        await realtimeChat.connect();

        toast({
          title: "Đang bắt đầu",
          description: `Đang khởi tạo cuộc phỏng vấn AI với ${candidate.name}...`,
        });
      }

    } catch (error) {
      console.error('=== ERROR STARTING CALL ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      setCallStatus('idle');
      setCurrentCall(null);
      toast({
        title: "Lỗi khởi tạo cuộc gọi",
        description: error.message || "Không thể bắt đầu cuộc gọi. Vui lòng kiểm tra cấu hình và thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async () => {
    if (!currentCall) return;

    try {
      console.log('=== ENDING CALL ===');
      console.log('Current call:', currentCall);
      
      // Disconnect from realtime chat
      realtimeChat.disconnect();

      // Unsubscribe from call status updates
      if ((window as any).callSubscription) {
        await (window as any).callSubscription.unsubscribe();
        (window as any).callSubscription = null;
      }

      // End the interview
      const { error } = await supabase.functions.invoke("end-interview", {
        body: { interviewId: currentCall.id }
      });

      if (error) {
        console.error('Error ending interview:', error);
      }

      if (callTimer) {
        clearInterval(callTimer);
        setCallTimer(null);
      }
      
      setCurrentCall(prev => prev ? { ...prev, status: 'completed' } : null);
      setCallStatus('idle');
      
      toast({
        title: "Cuộc gọi đã kết thúc",
        description: `Phỏng vấn với ${currentCall.candidateName} đã hoàn thành`,
      });

      // Reset after a delay
      setTimeout(() => {
        setCurrentCall(null);
        setSelectedCandidate('');
        setTimeRemaining(0);
      }, 3000);

    } catch (error) {
      console.error('Error ending call:', error);
      toast({
        title: "Lỗi",
        description: "Không thể kết thúc cuộc gọi",
        variant: "destructive",
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="call" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="call">Cuộc gọi AI</TabsTrigger>
            <TabsTrigger value="interview">Phỏng vấn</TabsTrigger>
            <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          </TabsList>
        
        <TabsContent value="settings" className="mt-6">
          <VoiceSettings onSettingsChange={setSettings} />
        </TabsContent>
        
        <TabsContent value="call" className="mt-6">
          <div className="space-y-6">
            {/* Setup Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Thiết lập cuộc gọi
                  </CardTitle>
                  <CardDescription>
                    Cấu hình cuộc phỏng vấn AI bằng giọng nói
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Chọn ứng viên</label>
                    <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn ứng viên để gọi" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            <div className="flex items-center gap-2">
                              <span>{candidate.name}</span>
                              <span className="text-muted-foreground">- {candidate.position}</span>
                              {candidate.phone && settings?.callMode === 'phone' && (
                                <Badge variant="outline" className="text-xs">📞 {candidate.phone}</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCandidate && settings?.callMode === 'phone' && !candidates.find(c => c.id === selectedCandidate)?.phone && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Ứng viên này không có số điện thoại. Vui lòng chọn chế độ "Web Call" trong cài đặt hoặc cập nhật số điện thoại.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Hướng dẫn AI phỏng vấn</label>
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Mô tả những gì AI nên tập trung trong cuộc phỏng vấn..."
                      rows={3}
                    />
                  </div>

                  <Alert className="border-success bg-success-light">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Sẵn sàng!</strong> {settings?.callMode === 'phone' 
                        ? 'Hệ thống sẽ gọi điện thoại cho ứng viên qua Twilio.'
                        : 'Cuộc phỏng vấn AI diễn ra trực tiếp trên trình duyệt.'}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Active Call Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="h-5 w-5" />
                    {currentCall ? 'Cuộc phỏng vấn đang diễn ra' : 'Sẵn sàng bắt đầu'}
                  </CardTitle>
                  {callStatus === 'active' && settings && (
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Thời gian còn lại: {Math.max(0, Math.floor(timeRemaining / 60))}:{(Math.max(0, timeRemaining % 60)).toString().padStart(2, '0')}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {currentCall ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            callStatus === 'active' ? 'bg-green-500 animate-pulse' :
                            callStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                            callStatus === 'failed' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`} />
                          <div>
                            <p className="font-medium">{currentCall.candidateName}</p>
                            <p className="text-sm text-muted-foreground">
                              {callStatus === 'active' ? (isSpeaking ? 'AI đang nói...' : 'Đang lắng nghe...') :
                               callStatus === 'connecting' ? 'Đang kết nối...' :
                               callStatus === 'failed' ? 'Kết nối thất bại' :
                               'Đã kết thúc'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg">{formatDuration(currentCall.duration)}</p>
                          <p className="text-sm text-muted-foreground">Thời gian</p>
                        </div>
                      </div>

                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleEndCall}
                          disabled={callStatus === 'idle'}
                          variant="destructive"
                        >
                          <PhoneOff className="h-4 w-4 mr-2" />
                          Kết thúc cuộc gọi
                        </Button>
                      </div>

                      {realtimeChat.isRecording && (
                        <div className="text-center">
                          <div className="inline-flex items-center gap-2 text-sm text-success">
                            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                            Đang ghi âm cuộc phỏng vấn
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Sẵn sàng bắt đầu phỏng vấn AI bằng giọng nói
                      </p>
                      <Button
                        size="lg"
                        onClick={handleStartCall}
                        disabled={!selectedCandidate || callStatus !== 'idle'}
                        className="w-full"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        {callStatus === 'connecting' ? 'Đang kết nối...' :
                         callStatus === 'active' ? 'Phỏng vấn đang diễn ra' :
                         'Bắt đầu phỏng vấn AI'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Call History */}
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử phỏng vấn giọng nói</CardTitle>
                <CardDescription>
                  Xem lại các cuộc phỏng vấn AI đã thực hiện và phân tích
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {callHistory.map((call) => (
                    <div key={call.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-accent text-accent-foreground">
                              {call.candidateName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{call.candidateName}</h4>
                            <p className="text-sm text-muted-foreground">{call.candidatePhone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-success-light text-success">Hoàn thành</Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatDuration(call.duration)}
                          </p>
                        </div>
                      </div>

                      {call.transcript && (
                        <div className="bg-muted/50 rounded p-3">
                          <h5 className="text-sm font-medium mb-2">Tóm tắt phỏng vấn:</h5>
                          <p className="text-sm text-muted-foreground">
                            {call.transcript}
                          </p>
                        </div>
                      )}

                      {call.aiInsights && (
                        <div className="bg-primary/5 rounded p-3">
                          <h5 className="text-sm font-medium mb-2 text-primary">
                            AI Insights:
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {call.aiInsights}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interview" className="mt-6">
          {currentCall ? (
            <InterviewProgress interviewId={currentCall.id} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Không có cuộc phỏng vấn nào đang diễn ra</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};