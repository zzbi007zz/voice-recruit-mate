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
    const candidateName = url.searchParams.get('name') || 'Ứng viên';
    const aiPrompt = url.searchParams.get('prompt') || 'Thực hiện cuộc phỏng vấn chuyên nghiệp';
    const language = url.searchParams.get('language') || 'vi';
    const maxDuration = parseInt(url.searchParams.get('maxDuration') || '30');

    // Generate AI voice message using ElevenLabs
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    const welcomeMessage = language === 'vi' 
      ? `Xin chào ${candidateName}, cảm ơn bạn đã dành thời gian để nói chuyện với chúng tôi hôm nay. Tôi là một AI phỏng vấn và tôi sẽ thực hiện cuộc phỏng vấn với bạn. Hãy bắt đầu bằng cách kể về bản thân và kinh nghiệm của bạn.`
      : `Hello ${candidateName}, thank you for taking the time to speak with us today. I'm an AI interviewer and I'll be conducting your interview. Let's begin with telling me about yourself and your experience.`;

    let audioUrl = '';
    
    if (ELEVENLABS_API_KEY) {
      // Generate speech using ElevenLabs with appropriate voice for Vietnamese
      const voiceId = language === 'vi' ? 'pFZP5JQG7iQjIQuC4Bku' : '9BWtsMINqrJLrRacOk9x'; // Lily for Vietnamese, Aria for English
      const speechResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
            stability: 0.6,
            similarity_boost: 0.8,
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

    // Create TwiML response with language support and time limits
    const voice = language === 'vi' ? 'alice' : 'alice';
    const langCode = language === 'vi' ? 'vi-VN' : 'en-US';
    const maxLength = Math.min(maxDuration * 60, 1800); // Max 30 minutes or configured duration
    
    const endMessage = language === 'vi' 
      ? 'Cảm ơn bạn đã phản hồi. Chúng tôi sẽ liên lạc với bạn sớm. Tạm biệt!'
      : 'Thank you for your response. We\'ll be in touch soon. Goodbye!';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="${voice}" language="${langCode}">${welcomeMessage}</Say>
    <Record 
        maxLength="${maxLength}" 
        timeout="10" 
        finishOnKey="#" 
        recordingStatusCallback="https://ubjemrvwfyglppfmxoep.supabase.co/functions/v1/process-recording"
        recordingStatusCallbackMethod="POST"
    />
    <Say voice="${voice}" language="${langCode}">${endMessage}</Say>
</Response>`;

    return new Response(twiml, {
      headers: { 
        'Content-Type': 'text/xml',
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error('Error in handle-call function:', error);
    
    const errorMessage = language === 'vi' 
      ? 'Xin lỗi, đã xảy ra sự cố kỹ thuật. Vui lòng thử lại sau. Tạm biệt.'
      : 'We\'re sorry, there was a technical issue. Please try again later. Goodbye.';
      
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="${language === 'vi' ? 'vi-VN' : 'en-US'}">${errorMessage}</Say>
</Response>`;

    return new Response(errorTwiml, {
      headers: { 
        'Content-Type': 'text/xml',
        ...corsHeaders 
      },
    });
  }
});