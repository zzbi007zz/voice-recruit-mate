import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioRecorder, encodeAudioForAPI, playAudioData } from '@/utils/RealtimeAudio';
import { useToast } from '@/components/ui/use-toast';

interface RealtimeChatMessage {
  type: string;
  content?: string;
  timestamp: number;
  role?: 'user' | 'assistant';
}

interface UseRealtimeChatProps {
  interviewId?: string;
  aiPrompt?: string;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

export const useRealtimeChat = ({
  interviewId,
  aiPrompt,
  onStatusChange,
  onSpeakingChange
}: UseRealtimeChatProps) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<RealtimeChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const currentTranscriptRef = useRef<string>('');

  const connect = useCallback(async () => {
    if (!interviewId) {
      toast({
        title: "Error",
        description: "Interview ID is required to start call",
        variant: "destructive",
      });
      return;
    }

    try {
      onStatusChange?.('connecting');
      
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      // Connect to our Supabase WebSocket relay
      const wsUrl = `wss://ubjemrvwfyglppfmxoep.functions.supabase.co/functions/v1/realtime-chat?interview_id=${interviewId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Connected to realtime chat');
        setIsConnected(true);
        onStatusChange?.('connected');
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data.type);

          if (data.type === 'session.created') {
            console.log('Session created, starting audio recording');
            await startAudioRecording();
            
            // Send initial greeting if we have a custom prompt
            if (aiPrompt) {
              const greetingEvent = {
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [
                    {
                      type: 'input_text',
                      text: `Please start the interview with a greeting. Follow this guidance: ${aiPrompt}`
                    }
                  ]
                }
              };
              wsRef.current?.send(JSON.stringify(greetingEvent));
              wsRef.current?.send(JSON.stringify({ type: 'response.create' }));
            }
          }

          if (data.type === 'response.audio.delta') {
            // Play audio response
            const binaryString = atob(data.delta);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            if (audioContextRef.current) {
              await playAudioData(audioContextRef.current, bytes);
            }
            onSpeakingChange?.(true);
          }

          if (data.type === 'response.audio_transcript.delta') {
            currentTranscriptRef.current += data.delta;
          }

          if (data.type === 'response.audio_transcript.done') {
            if (currentTranscriptRef.current.trim()) {
              setMessages(prev => [...prev, {
                type: 'transcript',
                content: currentTranscriptRef.current,
                timestamp: Date.now(),
                role: 'assistant'
              }]);
              currentTranscriptRef.current = '';
            }
            onSpeakingChange?.(false);
          }

          if (data.type === 'input_audio_buffer.speech_started') {
            onSpeakingChange?.(false); // User started speaking, AI should stop
          }

          if (data.type === 'error') {
            console.error('Realtime API error:', data.message);
            toast({
              title: "Connection Error",
              description: data.message,
              variant: "destructive",
            });
          }

        } catch (error) {
          console.error('Error processing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onStatusChange?.('error');
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice service",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        onStatusChange?.('disconnected');
        cleanup();
      };

    } catch (error) {
      console.error('Error connecting:', error);
      onStatusChange?.('error');
    }
  }, [interviewId, aiPrompt, onStatusChange, onSpeakingChange, toast]);

  const startAudioRecording = async () => {
    try {
      if (recorderRef.current) {
        recorderRef.current.stop();
      }

      recorderRef.current = new AudioRecorder((audioData) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      });

      await recorderRef.current.start();
      setIsRecording(true);
      console.log('Audio recording started');
    } catch (error) {
      console.error('Error starting audio recording:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text
          }
        ]
      }
    };

    wsRef.current.send(JSON.stringify(event));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));

    setMessages(prev => [...prev, {
      type: 'text',
      content: text,
      timestamp: Date.now(),
      role: 'user'
    }]);
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    cleanup();
  }, []);

  const cleanup = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
    onSpeakingChange?.(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [disconnect]);

  return {
    messages,
    isConnected,
    isRecording,
    connect,
    disconnect,
    sendTextMessage
  };
};