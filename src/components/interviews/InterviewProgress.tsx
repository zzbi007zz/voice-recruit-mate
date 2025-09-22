import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Clock, CheckCircle, AlertCircle, FileText, BarChart3 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Interview = Database['public']['Tables']['interviews']['Row'];
type Transcript = Database['public']['Tables']['transcripts']['Row'];

interface InterviewProgressProps {
  interviewId: string;
}

const InterviewProgress: React.FC<InterviewProgressProps> = ({ interviewId }) => {
  const [interview, setInterview] = useState<Interview | null>(null);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInterviewData = async () => {
    try {
      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (interviewError) throw interviewError;
      setInterview(interviewData);

      // Fetch transcripts
      const { data: transcriptsData, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: true });

      if (transcriptsError) throw transcriptsError;
      setTranscripts(transcriptsData || []);

    } catch (error) {
      console.error('Error fetching interview data:', error);
      toast({
        title: "Error",
        description: "Failed to load interview data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviewData();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('interview-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'interviews', filter: `id=eq.${interviewId}` },
        (payload) => {
          console.log('Interview updated:', payload);
          fetchInterviewData();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transcripts', filter: `interview_id=eq.${interviewId}` },
        (payload) => {
          console.log('Transcript updated:', payload);
          fetchInterviewData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [interviewId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'calling': return 'bg-yellow-500';
      case 'in_progress': return 'bg-green-500';
      case 'completed': return 'bg-purple-500';
      case 'analyzed': return 'bg-indigo-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'calling': return <Phone className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'analyzed': return <BarChart3 className="h-4 w-4" />;
      case 'failed': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!interview) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Interview not found</p>
        </CardContent>
      </Card>
    );
  }

  // Type guards for metadata structure
  const getMetadata = (metadata: any) => {
    if (!metadata) return null;
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return null;
      }
    }
    return metadata;
  };

  const script = getMetadata(interview.metadata)?.script;
  const responses = getMetadata(interview.metadata)?.responses || [];
  const currentQuestion = getMetadata(interview.metadata)?.current_question || 0;
  const totalQuestions = script?.questions?.length || 0;

  return (
    <div className="space-y-6">
      {/* Interview Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(interview.status)}
              Interview for {interview.role || 'Candidate'}
            </CardTitle>
            <Badge className={`${getStatusColor(interview.status)} text-white`}>
              {interview.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium">{interview.candidate_phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Language</p>
              <p className="font-medium">{interview.language === 'vi' ? 'Vietnamese' : 'English'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Progress</p>
              <p className="font-medium">{currentQuestion}/{totalQuestions} questions</p>
            </div>
          </div>
          
          {/* Progress bar */}
          {totalQuestions > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{Math.round((currentQuestion / totalQuestions) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interview Details */}
      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Interview Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {script?.questions?.map((question: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <Badge variant={index < currentQuestion ? "default" : index === currentQuestion ? "secondary" : "outline"}>
                          {index < currentQuestion ? "Completed" : index === currentQuestion ? "Current" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-2">{question.text}</p>
                      {responses[index] && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">Response received at:</p>
                          <p className="text-sm font-medium">
                            {new Date(responses[index].timestamp).toLocaleString()}
                          </p>
                          {responses[index].transcript && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">Transcript:</p>
                              <p className="text-sm">{responses[index].transcript}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center">No questions generated yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transcripts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Speech Transcripts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {transcripts.map((transcript, index) => (
                    <div key={transcript.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">Segment {index + 1}</h4>
                        <span className="text-sm text-gray-500">
                          {new Date(transcript.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2">{transcript.text}</p>
                      {transcript.filler_rate && (
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Filler rate: {transcript.filler_rate.toFixed(1)}%</span>
                          {transcript.wpm && <span>WPM: {transcript.wpm}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                  {transcripts.length === 0 && (
                    <p className="text-gray-500 text-center">No transcripts available yet</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interview.score_summary ? (
                <div className="space-y-4">
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                      {typeof interview.score_summary === 'string' 
                        ? interview.score_summary 
                        : JSON.stringify(interview.score_summary, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {interview.status === 'completed' 
                      ? 'Analysis in progress...' 
                      : 'Analysis will be available after the interview is completed'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewProgress;