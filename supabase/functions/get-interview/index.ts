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
    const interviewId = url.pathname.split('/').pop();
    
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

    // Get transcripts for this interview
    const { data: transcripts, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true });

    if (transcriptError) {
      console.error('Error fetching transcripts:', transcriptError);
    }

    // Get call sessions for this interview
    const { data: callSessions, error: callError } = await supabase
      .from('call_sessions')
      .select('*')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true });

    if (callError) {
      console.error('Error fetching call sessions:', callError);
    }

    const response = {
      id: interview.id,
      candidatePhone: interview.candidate_phone,
      recruiterId: interview.recruiter_id,
      role: interview.role,
      status: interview.status,
      language: interview.language,
      startedAt: interview.started_at,
      endedAt: interview.ended_at,
      scoreSummary: interview.score_summary,
      consent: interview.consent,
      metadata: interview.metadata,
      transcripts: transcripts || [],
      callSessions: callSessions || [],
      createdAt: interview.created_at,
      updatedAt: interview.updated_at
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-interview function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});