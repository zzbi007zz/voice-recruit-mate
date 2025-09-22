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
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const callStatus = formData.get('CallStatus') as string;
    const duration = formData.get('CallDuration') as string;
    const errorCode = formData.get('ErrorCode') as string;
    const errorMessage = formData.get('ErrorMessage') as string;

    console.log('Call status update:', {
      callSid,
      callStatus,
      duration,
      errorCode,
      errorMessage
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update call session status
    const { error: updateError } = await supabase
      .from('call_sessions')
      .update({
        status: callStatus,
        duration: duration ? parseInt(duration) : null,
        error_code: errorCode,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('call_sid', callSid);

    if (updateError) {
      console.error('Error updating call session:', updateError);
    }

    // Update interview status based on call status
    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
      const { data: callSession } = await supabase
        .from('call_sessions')
        .select('interview_id')
        .eq('call_sid', callSid)
        .single();

      if (callSession) {
        let interviewStatus = 'completed';
        if (callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
          interviewStatus = 'failed';
        }

        await supabase
          .from('interviews')
          .update({ 
            status: interviewStatus,
            ended_at: new Date().toISOString()
          })
          .eq('id', callSession.interview_id);
      }
    } else if (callStatus === 'answered') {
      const { data: callSession } = await supabase
        .from('call_sessions')
        .select('interview_id')
        .eq('call_sid', callSid)
        .single();

      if (callSession) {
        await supabase
          .from('interviews')
          .update({ 
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', callSession.interview_id);
      }
    }

    return new Response('OK', { 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });

  } catch (error) {
    console.error('Error in call-status function:', error);
    return new Response('Error', { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});