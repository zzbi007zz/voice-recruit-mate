import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { candidatePhone, candidateName, aiPrompt } = await req.json();

    if (!candidatePhone || !candidateName) {
      throw new Error('Candidate phone and name are required');
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured');
    }

    // Create Twilio call
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', candidatePhone);
    formData.append('From', '+15551234567'); // Replace with your Twilio phone number
    formData.append('Url', `https://ubjemrvwfyglppfmxoep.supabase.co/functions/v1/handle-call?name=${encodeURIComponent(candidateName)}&prompt=${encodeURIComponent(aiPrompt || 'Conduct a professional interview')}`);
    formData.append('Method', 'POST');

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
    console.log('Call initiated:', callData);

    return new Response(JSON.stringify({
      success: true,
      callSid: callData.sid,
      status: callData.status,
      message: `Call initiated to ${candidateName} at ${candidatePhone}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in initiate-call function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});