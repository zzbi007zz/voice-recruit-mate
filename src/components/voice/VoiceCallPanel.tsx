import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CallSession {
  id: string;
  candidateName: string;
  candidatePhone: string;
  duration: number;
  status: 'idle' | 'connecting' | 'active' | 'completed' | 'error';
  transcript?: string;
  aiInsights?: string;
}

export const VoiceCallPanel = () => {
  const [currentCall, setCurrentCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [aiPrompt, setAiPrompt] = useState('Conduct a professional interview focusing on technical skills and cultural fit.');

  // Mock candidates for voice calling
  const candidates = [
    { id: '1', name: 'Sarah Johnson', phone: '+1 (555) 123-4567', position: 'Frontend Developer' },
    { id: '2', name: 'Michael Chen', phone: '+1 (555) 234-5678', position: 'Backend Developer' },
    { id: '3', name: 'Emily Rodriguez', phone: '+1 (555) 345-6789', position: 'UX Designer' },
  ];

  // Mock call history
  const [callHistory] = useState<CallSession[]>([
    {
      id: '1',
      candidateName: 'Sarah Johnson',
      candidatePhone: '+1 (555) 123-4567',
      duration: 1847, // seconds
      status: 'completed',
      transcript: 'Initial screening call discussing React experience and project portfolio...',
      aiInsights: 'Strong technical background, good communication skills, seems enthusiastic about the role.',
    },
    {
      id: '2',
      candidateName: 'Michael Chen',
      candidatePhone: '+1 (555) 234-5678',
      duration: 2156,
      status: 'completed',
      transcript: 'Technical interview covering Node.js, databases, and system architecture...',
      aiInsights: 'Excellent technical knowledge, experienced with scalable systems, good problem-solving approach.',
    },
  ]);

  const handleStartCall = async () => {
    if (!selectedCandidate) {
      toast.error('Please select a candidate to call');
      return;
    }

    const candidate = candidates.find(c => c.id === selectedCandidate);
    if (!candidate) return;

    // Start the call process
    setCurrentCall({
      id: Date.now().toString(),
      candidateName: candidate.name,
      candidatePhone: candidate.phone,
      duration: 0,
      status: 'connecting',
    });

    try {
      // Call the Supabase edge function to initiate Twilio call
      const { data, error } = await supabase.functions.invoke('initiate-call', {
        body: {
          candidatePhone: candidate.phone,
          candidateName: candidate.name,
          aiPrompt: aiPrompt,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        // Update call status to active
        setTimeout(() => {
          setCurrentCall(prev => prev ? { ...prev, status: 'active' } : null);
          setIsRecording(true);
          toast.success(`Call connected to ${candidate.name}!`);
        }, 2000);
      } else {
        throw new Error(data?.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call. Please check your Twilio configuration.');
      setCurrentCall(null);
    }
  };

  const handleEndCall = () => {
    if (currentCall) {
      setCurrentCall(prev => prev ? { ...prev, status: 'completed' } : null);
      setIsRecording(false);
      toast.success('Call ended. Processing AI insights...');
      
      // Reset after a delay
      setTimeout(() => {
        setCurrentCall(null);
        setSelectedCandidate('');
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
      {/* Setup Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Call Setup
            </CardTitle>
            <CardDescription>
              Configure your AI voice interview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Candidate</label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a candidate to call" />
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
              <label className="text-sm font-medium mb-2 block">AI Interview Prompt</label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what the AI should focus on during the interview..."
                rows={3}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Ready!</strong> AI voice calling is now integrated with Twilio and ElevenLabs. 
                Make sure your Twilio phone number is configured and you have sufficient credits.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Active Call Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              {currentCall ? 'Active Call' : 'Ready to Call'}
            </CardTitle>
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
                    {currentCall.status}
                  </Badge>
                  <span className="text-sm font-mono">
                    {formatDuration(currentCall.duration)}
                  </span>
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
                    End Call
                  </Button>
                </div>

                {isRecording && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-success">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      Recording & analyzing conversation...
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Ready to start AI-powered interview</p>
                <Button 
                  onClick={handleStartCall} 
                  className="gap-2"
                  disabled={!selectedCandidate}
                >
                  <PhoneCall className="h-4 w-4" />
                  Start Call
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Voice Interviews</CardTitle>
          <CardDescription>
            Review past AI-conducted interviews and insights
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
                    <Badge className="bg-success-light text-success">Completed</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDuration(call.duration)}
                    </p>
                  </div>
                </div>

                {call.aiInsights && (
                  <div className="bg-accent/20 rounded-md p-3">
                    <h5 className="font-medium text-sm mb-1">AI Insights</h5>
                    <p className="text-sm text-muted-foreground">{call.aiInsights}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Play className="h-3 w-3 mr-1" />
                    Replay
                  </Button>
                  <Button variant="outline" size="sm">
                    View Transcript
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};