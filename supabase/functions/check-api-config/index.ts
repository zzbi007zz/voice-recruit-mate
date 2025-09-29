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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    console.log('Checking API configuration...');
    
    const status = {
      openai: {
        configured: !!OPENAI_API_KEY,
        valid: false,
        error: null as string | null
      },
      elevenlabs: {
        configured: !!ELEVENLABS_API_KEY,
        valid: false,
        error: null as string | null
      }
    };

    // Test OpenAI API if key is configured
    if (OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        });
        
        if (response.ok) {
          status.openai.valid = true;
        } else {
          status.openai.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        status.openai.error = errorMessage;
      }
    } else {
      status.openai.error = 'API key not configured in Supabase Edge Function secrets';
    }

    // Test ElevenLabs API if key is configured
    if (ELEVENLABS_API_KEY) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        });
        
        if (response.ok) {
          status.elevenlabs.valid = true;
        } else {
          status.elevenlabs.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        status.elevenlabs.error = errorMessage;
      }
    } else {
      status.elevenlabs.error = 'API key not configured in Supabase Edge Function secrets';
    }

    console.log('API status check completed:', status);

    return new Response(JSON.stringify({
      success: true,
      status,
      ready: status.openai.valid && status.elevenlabs.valid
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking API configuration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});