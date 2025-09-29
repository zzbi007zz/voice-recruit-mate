import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const url = new URL(req.url);
  const interviewId = url.searchParams.get('interview_id');
  
  if (!interviewId) {
    return new Response("Interview ID is required", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
  
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not found');
    socket.send(JSON.stringify({ 
      type: 'error', 
      message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to Supabase Edge Function secrets.' 
    }));
    return new Response("OpenAI API key not configured", { status: 500 });
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('ElevenLabs API key not found');
    socket.send(JSON.stringify({ 
      type: 'error', 
      message: 'ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to Supabase Edge Function secrets.' 
    }));
    return new Response("ElevenLabs API key not configured", { status: 500 });
  }

  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  socket.onopen = () => {
    console.log('Client WebSocket connected for interview:', interviewId);
    
    // Connect to OpenAI Realtime API
    const websocketUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    openAISocket = new WebSocket(websocketUrl);
    
    // Send authorization in first message instead of headers
    openAISocket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
      
      // Send authorization
      const authEvent = {
        type: 'session.update',
        session: {
          modalities: ["text", "audio"],
          instructions: `You are conducting a professional interview in Vietnamese. Follow the provided interview script and adapt naturally to the candidate's responses. Be conversational, professional, and engaging. Ask follow-up questions when appropriate. Speak clearly and at a moderate pace.`,
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000
          },
          temperature: 0.8,
          max_response_output_tokens: "inf"
        }
      };
      
      socket.send(JSON.stringify({ type: 'connection_established' }));
    };

    openAISocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('OpenAI message type:', data.type);

      // Configure session after receiving session.created
      if (data.type === 'session.created' && !sessionConfigured) {
        console.log('Configuring session with interview settings');
        
        const sessionUpdate = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: `You are conducting a professional interview in Vietnamese. Follow the provided interview script and adapt naturally to the candidate's responses. Be conversational, professional, and engaging. Ask follow-up questions when appropriate. Speak clearly and at a moderate pace.`,
            voice: "alloy",
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1"
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            temperature: 0.8,
            max_response_output_tokens: "inf"
          }
        };
        
        openAISocket?.send(JSON.stringify(sessionUpdate));
        sessionConfigured = true;
      }

      // Forward all messages to client
      socket.send(JSON.stringify(data));
    };

    openAISocket.onerror = (error) => {
      console.error('OpenAI WebSocket error:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection error' }));
    };

    openAISocket.onclose = (event) => {
      console.log('OpenAI WebSocket closed:', event.code, event.reason);
      socket.send(JSON.stringify({ type: 'openai_disconnected' }));
    };
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Client message type:', message.type);
      
      // Forward client messages to OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        openAISocket.send(JSON.stringify(message));
      } else {
        console.error('OpenAI WebSocket not ready');
        socket.send(JSON.stringify({ type: 'error', message: 'OpenAI connection not ready' }));
      }
    } catch (error) {
      console.error('Error processing client message:', error);
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  };

  socket.onclose = () => {
    console.log('Client WebSocket disconnected');
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});