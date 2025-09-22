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
    const { job_id, interview_id, audio_url, transcript, status } = await req.json();
    
    console.log('vBee callback received:', { job_id, interview_id, status });

    if (!interview_id) {
      return new Response(JSON.stringify({ error: 'interview_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (status === 'completed' && transcript) {
      // Store transcript in database
      const { error: insertError } = await supabase
        .from('transcripts')
        .insert({
          interview_id,
          audio_segment_id: job_id,
          text: transcript,
        });

      if (insertError) {
        console.error('Error inserting transcript:', insertError);
        throw new Error('Failed to store transcript');
      }

      console.log('Transcript stored successfully for interview:', interview_id);

      // If this is the final callback, you might want to trigger interview analysis
      // This could be done by checking if all expected audio segments are processed
      
    } else if (status === 'failed') {
      console.error('vBee processing failed for job:', job_id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Callback processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vbee-callback function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});