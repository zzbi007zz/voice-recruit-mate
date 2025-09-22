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
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Info,
  Settings,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { VoiceSettings, type VoiceSettings as VoiceSettingsType } from './VoiceSettings';

interface CallSession {
  id: string;
  candidateName: string;
  candidatePhone: string;
  duration: number;
  status: 'idle' | 'connecting' | 'active' | 'completed' | 'error';
  transcript?: string;
  aiInsights?: string;
  maxDuration?: number;
  startTime?: Date;
}

interface VoiceCallPanelProps {
  selectedCandidate?: any;
}

export const VoiceCallPanel = ({ selectedCandidate: preSelectedCandidate }: VoiceCallPanelProps) => {
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Thực hiện cuộc phỏng vấn chuyên nghiệp, tập trung vào kỹ năng kỹ thuật và sự phù hợp văn hóa. Hãy hỏi về kinh nghiệm làm việc, dự án đã thực hiện và mục tiêu nghề nghiệp.');
  const [settings, setSettings] = useState<VoiceSettingsType | null>(null);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [candidates, setCandidates] = useState<any[]>([]);

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
      candidatePhone: '+84 901 234 567',
      duration: 1847, // seconds
      status: 'completed',
      transcript: 'Cuộc gọi sàng lọc ban đầu thảo luận về kinh nghiệm React và portfolio dự án...',
      aiInsights: 'Nền tảng kỹ thuật vững chắc, kỹ năng giao tiếp tốt, có vẻ nhiệt tình với vị trí này.',
    },
    {
      id: '2',
      candidateName: 'Trần Thị Minh',
      candidatePhone: '+84 902 345 678',
      duration: 2156,
      status: 'completed',
      transcript: 'Phỏng vấn kỹ thuật về Node.js, cơ sở dữ liệu và kiến trúc hệ thống...',
      aiInsights: 'Kiến thức kỹ thuật xuất sắc, có kinh nghiệm với hệ thống có thể mở rộng, phương pháp giải quyết vấn đề tốt.',
    },
  ]);

  // Timer effect for call duration
  useEffect(() => {
    if (currentCall?.status === 'active' && settings) {
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
            toast.warning(`Cuộc gọi sẽ kết thúc sau ${settings.warningTime} phút`, {
              duration: 5000,
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
  }, [currentCall?.status, settings]);

  const handleStartCall = async () => {
    if (!selectedCandidate) {
      toast.error('Vui lòng chọn ứng viên để gọi');
      return;
    }

    if (!settings || !settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber) {
      toast.error('Vui lòng cấu hình đầy đủ thông tin Twilio trước khi gọi');
      return;
    }

    const candidate = candidates.find(c => c.id === selectedCandidate);
    if (!candidate) return;

    // Create Vietnamese or English prompt based on settings
    const vietnamesePrompt = settings.language === 'vi' 
      ? `Bạn là một AI phỏng vấn viên chuyên nghiệp. Hãy tiến hành cuộc phỏng vấn bằng tiếng Việt với ứng viên ${candidate.name} cho vị trí ${candidate.position}. ${aiPrompt}`
      : `You are a professional AI interviewer. Conduct an interview with candidate ${candidate.name} for the ${candidate.position} position. ${aiPrompt}`;

    // Start the call process
    setCurrentCall({
      id: Date.now().toString(),
      candidateName: candidate.name,
      candidatePhone: candidate.phone,
      duration: 0,
      status: 'connecting',
      maxDuration: settings.maxCallDuration * 60,
      startTime: new Date(),
    });

    try {
      toast.info('Đang tạo cuộc phỏng vấn...');
      
      // Step 1: Create interview record
      const { data: interviewData, error: interviewError } = await supabase.functions.invoke('create-interview', {
        body: {
          candidatePhone: candidate.phone,
          recruiterId: 'demo-recruiter-id', // In real app, get from auth
          role: candidate.position,
          language: settings.language,
          metadata: {
            candidateName: candidate.name,
            aiPrompt: vietnamesePrompt,
            maxDuration: settings.maxCallDuration,
            recordCall: settings.recordCalls,
          },
        },
      });

      if (interviewError) {
        throw interviewError;
      }

      const interviewId = interviewData?.id;
      if (!interviewId) {
        throw new Error('Failed to create interview');
      }

      toast.info('Đang khởi tạo cuộc gọi...');
      
      // Step 2: Trigger Twilio call
      const { data: callData, error: callError } = await supabase.functions.invoke('trigger-call', {
        body: {
          interviewId: interviewId,
        },
      });

      if (callError) {
        throw callError;
      }

      if (callData?.callSid) {
        // Update call status to active
        setTimeout(() => {
          setCurrentCall(prev => prev ? { ...prev, status: 'active' } : null);
          setIsRecording(true);
          toast.success(`Đã khởi tạo cuộc gọi với ${candidate.name}!`);
        }, 2000);
      } else {
        throw new Error(callData?.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Không thể bắt đầu cuộc gọi. Vui lòng kiểm tra cấu hình API.');
      setCurrentCall(null);
    }
  };

  const handleEndCall = () => {
    if (currentCall) {
      if (callTimer) {
        clearInterval(callTimer);
        setCallTimer(null);
      }
      
      setCurrentCall(prev => prev ? { ...prev, status: 'completed' } : null);
      setIsRecording(false);
      toast.success('Cuộc gọi đã kết thúc. Đang xử lý phân tích AI...');
      
      // Reset after a delay
      setTimeout(() => {
        setCurrentCall(null);
        setSelectedCandidate('');
        setTimeRemaining(0);
      }, 3000);
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="call">Cuộc gọi AI</TabsTrigger>
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
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                  {settings && settings.twilioAccountSid && settings.twilioAuthToken && settings.twilioPhoneNumber ? (
                    <Alert className="border-success bg-success-light">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Sẵn sàng!</strong> Hệ thống gọi điện AI đã được tích hợp với Twilio + OpenAI.
                        Ngôn ngữ: {settings.language === 'vi' ? 'Tiếng Việt' : 'English'}. 
                        Thời gian tối đa: {settings.maxCallDuration} phút.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-warning bg-warning-light">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Cần cấu hình!</strong> Vui lòng chuyển sang tab "Cài đặt" để nhập thông tin Twilio.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Active Call Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PhoneCall className="h-5 w-5" />
                    {currentCall ? 'Cuộc gọi đang diễn ra' : 'Sẵn sàng gọi'}
                  </CardTitle>
                  {currentCall?.status === 'active' && settings && (
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Thời gian còn lại: {Math.max(0, Math.floor(timeRemaining / 60))}:{(Math.max(0, timeRemaining % 60)).toString().padStart(2, '0')}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {currentCall ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary-light text-primary">
                            {currentCall.candidateName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">{currentCall.candidateName}</h3>
                          <p className="text-sm text-muted-foreground">{currentCall.candidatePhone}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge className={
                          currentCall.status === 'active' ? 'bg-success-light text-success' :
                          currentCall.status === 'connecting' ? 'bg-warning-light text-warning' :
                          'bg-muted text-muted-foreground'
                        }>
                          {currentCall.status === 'active' ? 'Đang gọi' :
                           currentCall.status === 'connecting' ? 'Đang kết nối' :
                           currentCall.status === 'completed' ? 'Đã hoàn thành' : currentCall.status}
                        </Badge>
                        <div className="text-right">
                          <span className="text-sm font-mono">
                            {formatDuration(currentCall.duration)}
                          </span>
                          {settings && timeRemaining > 0 && timeRemaining < 300 && (
                            <div className="text-xs text-warning">
                              Còn {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsMuted(!isMuted)}
                          className={isMuted ? 'bg-destructive-light text-destructive' : ''}
                        >
                          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleEndCall}
                          disabled={currentCall.status !== 'active'}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Kết thúc
                        </Button>
                      </div>

                      {isRecording && (
                        <div className="text-center">
                          <div className="inline-flex items-center gap-2 text-sm text-success">
                            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                            Đang ghi âm & phân tích cuộc trò chuyện...
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {!settings || !settings.twilioAccountSid || !settings.twilioAuthToken || !settings.twilioPhoneNumber
                          ? 'Vui lòng cấu hình thông tin Twilio trong tab Cài đặt'
                          : 'Sẵn sàng bắt đầu phỏng vấn AI'
                        }
                      </p>
                      <Button 
                        onClick={handleStartCall} 
                        className="gap-2"
                        disabled={!selectedCandidate || !settings?.twilioAccountSid || !settings?.twilioAuthToken || !settings?.twilioPhoneNumber}
                      >
                        <PhoneCall className="h-4 w-4" />
                        Bắt đầu gọi
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

                      {call.aiInsights && (
                        <div className="bg-accent/20 rounded-md p-3">
                          <h5 className="font-medium text-sm mb-1">Phân tích AI</h5>
                          <p className="text-sm text-muted-foreground">{call.aiInsights}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Phát lại
                        </Button>
                        <Button variant="outline" size="sm">
                          Xem bản ghi
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};