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
    const interviewId = url.pathname.split('/').slice(-2)[0]; // Get ID from /interview/{id}/end
    
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

    // Get all transcripts for scoring
    const { data: transcripts } = await supabase
      .from('transcripts')
      .select('text, wpm, filler_rate')
      .eq('interview_id', interviewId);

    // Generate AI-powered scoring using OpenAI
    let scoreSummary = {};
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiApiKey && transcripts && transcripts.length > 0) {
      try {
        const fullTranscript = transcripts.map(t => t.text).join(' ');
        const avgWpm = transcripts.filter(t => t.wpm).reduce((acc, t) => acc + t.wpm, 0) / transcripts.filter(t => t.wpm).length || 0;
        const avgFillerRate = transcripts.filter(t => t.filler_rate).reduce((acc, t) => acc + t.filler_rate, 0) / transcripts.filter(t => t.filler_rate).length || 0;

        const analysisPrompt = `Analyze this job interview transcript and provide a comprehensive evaluation. 
        
Role: ${interview.role || 'Not specified'}
Language: ${interview.language}
Transcript: ${fullTranscript}
Speaking Rate: ${avgWpm} words per minute
Filler Rate: ${avgFillerRate}%

Please provide a JSON response with scores (0-100) for:
- technical_knowledge: Technical skills and knowledge
- communication: Clarity and effectiveness of communication
- experience: Relevant experience and examples
- problem_solving: Problem-solving approach and methodology
- cultural_fit: Cultural fit and soft skills
- overall_score: Overall interview performance

Also include:
- strengths: Array of key strengths
- areas_for_improvement: Array of areas needing improvement
- recommendation: 'hire', 'maybe', or 'no_hire'
- summary: Brief overall assessment

Respond in ${interview.language === 'vi' ? 'Vietnamese' : 'English'}.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an experienced HR professional and interview analyst. Provide objective, constructive feedback based on interview transcripts.' },
              { role: 'user', content: analysisPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          const analysisText = aiResult.choices[0].message.content;
          
          try {
            scoreSummary = JSON.parse(analysisText);
          } catch (parseError) {
            console.error('Error parsing AI analysis:', parseError);
            scoreSummary = {
              summary: analysisText,
              overall_score: 75,
              recommendation: 'maybe'
            };
          }
        }
      } catch (aiError) {
        console.error('Error generating AI analysis:', aiError);
      }
    }

    // Update interview with final status and scoring
    const { data: updatedInterview, error: updateError } = await supabase
      .from('interviews')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        score_summary: scoreSummary
      })
      .eq('id', interviewId)
      .select()
      .single();

    if (updateError) {
      throw new Error('Failed to update interview');
    }

    return new Response(JSON.stringify({
      id: updatedInterview.id,
      status: updatedInterview.status,
      scoreSummary: updatedInterview.score_summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in end-interview function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});