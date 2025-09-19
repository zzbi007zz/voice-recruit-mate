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
    const aiPrompt = url.searchParams.get('prompt') || 'Xin chào, tôi là AI phỏng vấn viên';
    const language = url.searchParams.get('language') || 'vi';
    const maxDuration = parseInt(url.searchParams.get('maxDuration') || '30');
    const voiceId = url.searchParams.get('voiceId') || 'vi-female-1';

    console.log('Handling vBee call with params:', {
      candidateName,
      language,
      maxDuration,
      voiceId
    });

    // Create Vietnamese conversation flow
    const vietnameseGreeting = language === 'vi' 
      ? `Xin chào ${candidateName}! Tôi là trợ lý AI của công ty. Hôm nay tôi sẽ tiến hành cuộc phỏng vấn sơ bộ với bạn. Bạn đã sẵn sàng chưa?`
      : `Hello ${candidateName}! I'm the company's AI assistant. Today I'll conduct a preliminary interview with you. Are you ready?`;

    // Generate vBee TTS audio response
    const ttsResponse = await generateVBeeTTS(vietnameseGreeting, voiceId);
    
    // Create conversation flow response
    const conversationFlow = {
      type: 'conversation_start',
      greeting: vietnameseGreeting,
      voice_id: voiceId,
      language: language,
      max_duration: maxDuration * 60,
      ai_instructions: aiPrompt,
      conversation_context: {
        candidate_name: candidateName,
        interview_type: 'preliminary',
        language: language
      }
    };

    return new Response(JSON.stringify({
      success: true,
      message: 'vBee call handler ready',
      conversation: conversationFlow,
      audio_url: ttsResponse?.audio_url,
      session_id: `vbee_${Date.now()}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in handle-vbee-call function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateVBeeTTS(text: string, voiceId: string) {
  try {
    const VBEE_API_KEY = Deno.env.get('VBEE_API_KEY');
    
    if (!VBEE_API_KEY) {
      console.log('VBEE_API_KEY not found, using mock response');
      return { audio_url: 'mock_audio_url', duration: 5 };
    }

    const response = await fetch('https://api.vbee.ai/v1/tts/synthesize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VBEE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_id: voiceId,
        audio_format: 'mp3',
        sample_rate: 22050
      }),
    });

    if (!response.ok) {
      console.error('vBee TTS API error:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating vBee TTS:', error);
    return null;
  }
}