import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  const url = new URL(req.url);
  const interviewId = url.searchParams.get('interview_id');
  
  if (!interviewId) {
    return new Response("Interview ID is required", { 
      status: 400,
      headers: corsHeaders
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let audioBuffer: string[] = [];
  let isProcessing = false;

  socket.onopen = () => {
    console.log('WebSocket connection opened for interview:', interviewId);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('Received message:', message.event);

      switch (message.event) {
        case 'connected':
          console.log('Twilio Media Stream connected');
          break;

        case 'start':
          console.log('Media stream started');
          break;

        case 'media':
          // Buffer audio data for processing
          if (message.media && message.media.payload) {
            audioBuffer.push(message.media.payload);
            
            // Process audio in chunks (every 3 seconds of data approximately)
            if (audioBuffer.length >= 100 && !isProcessing) {
              isProcessing = true;
              await processAudioChunk(audioBuffer.join(''), interviewId, supabase);
              audioBuffer = [];
              isProcessing = false;
            }
          }
          break;

        case 'stop':
          console.log('Media stream stopped');
          // Process any remaining audio
          if (audioBuffer.length > 0) {
            await processAudioChunk(audioBuffer.join(''), interviewId, supabase);
          }
          break;

        default:
          console.log('Unknown event:', message.event);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed for interview:', interviewId);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});

async function processAudioChunk(audioData: string, interviewId: string, supabase: any) {
  try {
    console.log('Processing audio chunk for interview:', interviewId);
    
    // Get interview details
    const { data: interview } = await supabase
      .from('interviews')
      .select('language')
      .eq('id', interviewId)
      .single();

    const language = interview?.language || 'vi';

    // Process with vBee STT API
    const vbeeApiKey = Deno.env.get('VBEE_API_KEY');
    if (!vbeeApiKey) {
      console.log('vBee API key not configured, skipping STT processing');
      return;
    }

    // Convert base64 audio to blob and send to vBee
    const audioBlob = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    
    const formData = new FormData();
    formData.append('audio', new Blob([audioBlob], { type: 'audio/wav' }));
    formData.append('language', language === 'vi' ? 'vi-VN' : 'en-US');

    const vbeeResponse = await fetch('https://vbee.vn/api/v1/stt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vbeeApiKey}`,
      },
      body: formData,
    });

    if (vbeeResponse.ok) {
      const result = await vbeeResponse.json();
      
      if (result.transcript) {
        // Store transcript in database
        await supabase
          .from('transcripts')
          .insert({
            interview_id: interviewId,
            text: result.transcript,
            wpm: result.wpm || null,
            filler_rate: result.filler_rate || null
          });

        console.log('Transcript saved:', result.transcript);
      }
    } else {
      console.error('vBee STT API error:', await vbeeResponse.text());
    }

  } catch (error) {
    console.error('Error processing audio chunk:', error);
  }
}