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

    // Generate greeting message based on language
    const greeting = interview.language === 'vi' 
      ? `Xin chào! Đây là cuộc phỏng vấn AI cho vị trí ${interview.role || 'ứng viên'}. Cuộc gọi này sẽ được ghi âm để đánh giá. Bạn có đồng ý không?`
      : `Hello! This is an AI interview for the ${interview.role || 'candidate'} position. This call will be recorded for evaluation. Do you consent?`;

    // Create TwiML response with Media Stream for real-time processing
    const wsUrl = `wss://${url.host}/functions/v1/twilio-stream?interview_id=${interviewId}`;
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
    ${greeting}
  </Say>
  <Start>
    <Stream url="${wsUrl}" />
  </Start>
  <Pause length="1"/>
  <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
    ${interview.language === 'vi' ? 'Cuộc phỏng vấn đang bắt đầu.' : 'The interview is now starting.'}
  </Say>
  <Gather input="speech" timeout="30" speechTimeout="auto">
    <Say voice="alice" language="${interview.language === 'vi' ? 'vi-VN' : 'en-US'}">
      ${interview.language === 'vi' ? 'Vui lòng giới thiệu về bản thân.' : 'Please introduce yourself.'}
    </Say>
  </Gather>
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