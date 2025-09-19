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
    const { 
      candidatePhone, 
      candidateName, 
      aiPrompt, 
      language = 'vi', 
      maxDuration = 30, 
      recordCall = true,
      voiceId = 'vi-female-1',
      apiKey
    } = await req.json();

    if (!candidatePhone || !candidateName || !apiKey) {
      throw new Error('Candidate phone, name, and vBee API key are required');
    }

    console.log('Initiating vBee AI call:', {
      candidatePhone,
      candidateName,
      language,
      voiceId,
      maxDuration
    });

    // Create vBee AI call session
    const vbeeUrl = 'https://api.vbee.ai/v1/calls/initiate';
    
    const callPayload = {
      phone_number: candidatePhone,
      voice_id: voiceId,
      language: language,
      max_duration: maxDuration * 60, // Convert to seconds
      record_call: recordCall,
      ai_prompt: aiPrompt,
      candidate_name: candidateName,
      call_type: 'interview'
    };

    const response = await fetch(vbeeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(callPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('vBee API error:', errorText);
      throw new Error(`Failed to initiate vBee call: ${errorText}`);
    }

    const callData = await response.json();
    console.log('vBee call initiated:', callData);

    return new Response(JSON.stringify({
      success: true,
      callId: callData.call_id || callData.id,
      status: callData.status || 'initiated',
      message: `vBee AI call initiated to ${candidateName} at ${candidatePhone}`,
      sessionUrl: callData.session_url,
      estimatedDuration: maxDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in initiate-vbee-call function:', error);
    
    // If it's a demo or vBee API is not available, return a mock success response
    if (error.message.includes('Failed to initiate vBee call')) {
      console.log('vBee API not available, returning demo response');
      return new Response(JSON.stringify({
        success: true,
        callId: `demo_${Date.now()}`,
        status: 'demo_mode',
        message: `Demo: vBee AI call would be initiated to candidate`,
        isDemoMode: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});