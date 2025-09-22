import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const interviewId = url.searchParams.get('interview_id');
    
    if (!interviewId) {
      throw new Error('Interview ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get interview details
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (error || !interview) {
      console.error('Interview not found:', error);
      // Return basic TwiML for error case
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${interview?.language === 'vi' ? 'vi-VN' : 'en-US'}">
    Sorry, there was an error with the interview system. Please try again later.
  </Say>
  <Hangup/>
</Response>`;
      
      return new Response(twiml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
      });
    }

    // Update interview status
    await supabase
      .from('interviews')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('id', interviewId);

    // Generate interview script if not exists
    let script = interview.metadata?.script;
    if (!script) {
      console.log('Generating interview script...');
      
      try {
        const scriptResponse = await fetch(`https://${url.host}/functions/v1/generate-interview-script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ interviewId })
        });
        
        const scriptData = await scriptResponse.json();
        if (scriptData.success) {
          script = scriptData.script;
          console.log('Interview script generated successfully');
        }
      } catch (scriptError) {
        console.error('Failed to generate script:', scriptError);
      }
    }

    // Get current question or default to first
    const currentQuestionIndex = interview.metadata?.current_question || 0;
    const questions = script?.questions || [];
    const currentQuestion = questions[currentQuestionIndex] || {
      text: interview.language === 'vi' ? 'Vui lòng giới thiệu về bản thân.' : 'Please introduce yourself.',
      timeout: 30
    };

    // Generate greeting message and TwiML with ElevenLabs voice integration
    const greeting = interview.language === 'vi' 
      ? `Xin chào! Đây là cuộc phỏng vấn AI cho vị trí ${interview.role || 'ứng viên'}. Cuộc gọi này sẽ được ghi âm để đánh giá. Bạn có đồng ý không?`
      : `Hello! This is an AI interview for the ${interview.role || 'candidate'} position. This call will be recorded for evaluation. Do you consent?`;
    
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    let voiceContent = currentQuestion.text;
    
    if (elevenLabsApiKey) {
      // Use ElevenLabs for more natural voice
      try {
        const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey
          },
          body: JSON.stringify({
            text: `${greeting} ${currentQuestion.text}`,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        });

        if (elevenLabsResponse.ok) {
          const audioBuffer = await elevenLabsResponse.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
          
          // Create TwiML with ElevenLabs audio
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>data:audio/mpeg;base64,${base64Audio}</Play>
  <Pause length="1"/>
  <Record timeout="10" finishOnKey="#" action="https://${url.host}/functions/v1/process-question-response?interview_id=${interviewId}&amp;question_index=${currentQuestionIndex}" transcribe="true" transcribeCallback="https://${url.host}/functions/v1/process-transcription?interview_id=${interviewId}&amp;question_index=${currentQuestionIndex}"/>
  <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
    ${interview.language === 'vi' ? 'Cảm ơn câu trả lời của bạn.' : 'Thank you for your response.'}
  </Say>
</Response>`;
          
          return new Response(twiml, {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          });
        }
      } catch (elevenLabsError) {
        console.error('ElevenLabs API error:', elevenLabsError);
        // Fallback to Twilio voice
      }
    }

    // Create dynamic TwiML with interview questions
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
    ${greeting}
  </Say>
  <Pause length="2"/>
  <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
    ${interview.language === 'vi' ? 'Cuộc phỏng vấn đang bắt đầu. Câu hỏi đầu tiên:' : 'The interview is now starting. First question:'}
  </Say>
  <Pause length="1"/>
  <Record timeout="10" finishOnKey="#" action="https://${url.host}/functions/v1/process-question-response?interview_id=${interviewId}&amp;question_index=${currentQuestionIndex}" transcribe="true" transcribeCallback="https://${url.host}/functions/v1/process-transcription?interview_id=${interviewId}&amp;question_index=${currentQuestionIndex}">
    <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
      ${currentQuestion.text}
    </Say>
  </Record>
  <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
    ${interview.language === 'vi' ? 'Cảm ơn câu trả lời của bạn.' : 'Thank you for your response.'}
  </Say>
</Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in twilio-answer function:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    There was an error processing your call. Please try again later.
  </Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  }
});