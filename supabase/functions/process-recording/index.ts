import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    
    const recordingUrl = params.get('RecordingUrl');
    const callSid = params.get('CallSid');
    const recordingStatus = params.get('RecordingStatus');

    console.log('Recording webhook received:', {
      recordingUrl,
      callSid,
      recordingStatus
    });

    if (recordingStatus === 'completed' && recordingUrl) {
      // Process the recording with OpenAI Whisper for transcription
      const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
      
      if (OPENAI_API_KEY) {
        try {
          // Download the recording
          const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
          const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
          
          const audioResponse = await fetch(recordingUrl, {
            headers: {
              'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            },
          });

          if (audioResponse.ok) {
            const audioBuffer = await audioResponse.arrayBuffer();
            
            // Transcribe with OpenAI Whisper
            const formData = new FormData();
            const blob = new Blob([audioBuffer], { type: 'audio/wav' });
            formData.append('file', blob, 'recording.wav');
            formData.append('model', 'whisper-1');

            const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
              },
              body: formData,
            });

            if (transcriptionResponse.ok) {
              const transcription = await transcriptionResponse.json();
              console.log('Transcription:', transcription.text);

              // Generate AI insights using GPT
              const insightsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'gpt-4o-mini',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are an HR expert. Analyze the following interview response and provide insights about the candidate\'s qualifications, communication skills, and overall fit. Be constructive and professional.'
                    },
                    {
                      role: 'user',
                      content: `Please analyze this interview response: "${transcription.text}"`
                    }
                  ],
                  max_tokens: 500,
                }),
              });

              if (insightsResponse.ok) {
                const insights = await insightsResponse.json();
                const aiInsights = insights.choices[0].message.content;
                
                console.log('AI Insights:', aiInsights);
                
                // Store final interview analysis in database
                const supabaseUrl = Deno.env.get('SUPABASE_URL');
                const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
                
                if (supabaseUrl && supabaseServiceKey) {
                  const supabase = createClient(supabaseUrl, supabaseServiceKey);
                  
                  // Try to find interview by call_sid
                  const { data: callSession } = await supabase
                    .from('call_sessions')
                    .select('interview_id')
                    .eq('call_sid', callSid)
                    .single();

                  if (callSession) {
                    // Update interview with final analysis
                    await supabase
                      .from('interviews')
                      .update({
                        score_summary: aiInsights,
                        status: 'analyzed',
                        ended_at: new Date().toISOString()
                      })
                      .eq('id', callSession.interview_id);

                    console.log("Interview analysis stored for interview:", callSession.interview_id);
                  }
                }
                
                // Log the transcription and AI insights
                console.log("Transcription:", transcription.text);
                console.log("AI Insights:", aiInsights);
              }
            }
          }
        } catch (error) {
          console.error('Error processing recording:', error);
        }
      }
    }

    // Return empty TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`;

    return new Response(twiml, {
      headers: { 
        'Content-Type': 'text/xml',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error in process-recording function:', error);
    return new Response('OK', {
      headers: corsHeaders,
    });
  }
});