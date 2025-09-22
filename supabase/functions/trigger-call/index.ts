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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const url = new URL(req.url);
    const interviewId = url.pathname.split('/').pop()?.replace('/call', '');
    
    if (!interviewId) {
      return new Response(JSON.stringify({ error: 'Interview ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    // Get interview details
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('recruiter_id', user.id)
      .single();

    if (fetchError || !interview) {
      return new Response(JSON.stringify({ error: 'Interview not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER') || '+15551234567';

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Update interview status to calling
    await supabase
      .from('interviews')
      .update({ status: 'calling' })
      .eq('id', interviewId);

    // Create Twilio call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', interview.candidate_phone);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Url', `${supabaseUrl}/functions/v1/twilio-answer?interview_id=${interviewId}`);
    formData.append('Method', 'POST');
    formData.append('Record', 'true');
    formData.append('RecordingStatusCallback', `${supabaseUrl}/functions/v1/process-recording`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Twilio API error:', error);
      throw new Error(`Failed to initiate call: ${error}`);
    }

    const callData = await response.json();

    // Store call session
    await supabase
      .from('call_sessions')
      .insert({
        interview_id: interviewId,
        call_sid: callData.sid,
        twilio_from: TWILIO_PHONE_NUMBER,
        twilio_to: interview.candidate_phone,
        direction: 'outbound',
        status: callData.status
      });

    return new Response(JSON.stringify({
      callSid: callData.sid,
      status: callData.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trigger-call function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});