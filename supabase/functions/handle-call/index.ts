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
    const url = new URL(req.url);
    const candidateName = url.searchParams.get('name') || 'Candidate';
    const aiPrompt = url.searchParams.get('prompt') || 'Conduct a professional interview';

    // Generate AI voice message using ElevenLabs
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    const welcomeMessage = `Hello ${candidateName}, thank you for taking the time to speak with us today. I'm an AI interviewer and I'll be conducting your interview. Let's begin with telling me about yourself and your experience.`;

    let audioUrl = '';
    
    if (ELEVENLABS_API_KEY) {
      // Generate speech using ElevenLabs
      const speechResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/9BWtsMINqrJLrRacOk9x', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: welcomeMessage,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (speechResponse.ok) {
        const audioBuffer = await speechResponse.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
        
        // In a real implementation, you'd upload this to a public URL
        // For now, we'll use TwiML Say verb as fallback
        console.log('Generated audio with ElevenLabs');
      }
    }

    // Create TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">${welcomeMessage}</Say>
    <Record 
        maxLength="300" 
        timeout="10" 
        finishOnKey="#" 
        recordingStatusCallback="https://ubjemrvwfyglppfmxoep.supabase.co/functions/v1/process-recording"
        recordingStatusCallbackMethod="POST"
    />
    <Say voice="alice" language="en-US">Thank you for your response. We'll be in touch soon. Goodbye!</Say>
</Response>`;

    return new Response(twiml, {
      headers: { 
        'Content-Type': 'text/xml',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error in handle-call function:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">We're sorry, there was a technical issue. Please try again later. Goodbye.</Say>
</Response>`;

    return new Response(errorTwiml, {
      headers: { 
        'Content-Type': 'text/xml',
        ...corsHeaders 
      },
    });
  }
});