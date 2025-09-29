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
    const { job_id, candidate_id } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch job and candidate data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .single();

    if (jobError || candidateError) {
      throw new Error('Failed to fetch job or candidate data');
    }

    // Prepare data for AI analysis
    const analysisPrompt = `
      Analyze the compatibility between this candidate and job position. Provide detailed scoring and analysis.

      JOB DETAILS:
      - Title: ${job.title}
      - Description: ${job.description || 'Not provided'}
      - Requirements: ${Array.isArray(job.requirements) ? job.requirements.join(', ') : job.requirements || 'Not specified'}
      - Location: ${job.location || 'Not specified'}
      - Salary Range: ${job.salary_range || 'Not specified'}
      - Job Type: ${job.job_type || 'Not specified'}

      CANDIDATE DETAILS:
      - Name: ${candidate.name}
      - Position: ${candidate.position || 'Not specified'}
      - Experience: ${candidate.experience || 'Not provided'}
      - Skills: ${candidate.skills || 'Not provided'}
      - Status: ${candidate.status}

      Please analyze and provide a JSON response with the following structure:
      {
        "overall_score": number (0-100),
        "skill_match_score": number (0-100),
        "experience_match_score": number (0-100),
        "culture_fit_score": number (0-100),
        "salary_match_score": number (0-100),
        "detailed_analysis": {
          "matching_skills": ["skill1", "skill2"],
          "missing_skills": ["skill1", "skill2"],
          "experience_gaps": ["gap1", "gap2"],
          "strengths": ["strength1", "strength2"],
          "recommendations": ["recommendation1", "recommendation2"]
        }
      }

      Base your analysis on:
      1. Skills matching between job requirements and candidate skills
      2. Experience level relevance
      3. Cultural fit based on job description and candidate background
      4. Salary expectations alignment
      5. Overall suitability
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR analyst specializing in candidate-job matching. Provide accurate, objective analysis in the requested JSON format.'
          },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const analysis = JSON.parse(content);
      
      // Validate the response structure
      const result = {
        overall_score: Math.min(100, Math.max(0, analysis.overall_score || 0)),
        skill_match_score: Math.min(100, Math.max(0, analysis.skill_match_score || 0)),
        experience_match_score: Math.min(100, Math.max(0, analysis.experience_match_score || 0)),
        culture_fit_score: Math.min(100, Math.max(0, analysis.culture_fit_score || 0)),
        salary_match_score: Math.min(100, Math.max(0, analysis.salary_match_score || 0)),
        detailed_analysis: analysis.detailed_analysis || {
          matching_skills: [],
          missing_skills: [],
          experience_gaps: [],
          strengths: [],
          recommendations: []
        }
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      
      // Fallback scoring based on simple text matching
      const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
      const candidateText = `${candidate.position} ${candidate.experience} ${candidate.skills}`.toLowerCase();
      
      // Simple keyword matching for fallback
      const jobKeywords = jobText.split(/\s+/).filter(word => word.length > 3);
      const candidateKeywords = candidateText.split(/\s+/).filter(word => word.length > 3);
      
      const commonKeywords = jobKeywords.filter(keyword => 
        candidateKeywords.some(cKeyword => cKeyword.includes(keyword) || keyword.includes(cKeyword))
      );
      
      const matchPercentage = jobKeywords.length > 0 
        ? Math.round((commonKeywords.length / jobKeywords.length) * 100)
        : 50;

      const fallbackResult = {
        overall_score: matchPercentage,
        skill_match_score: matchPercentage,
        experience_match_score: Math.max(30, matchPercentage - 10),
        culture_fit_score: 70,
        salary_match_score: 75,
        detailed_analysis: {
          matching_skills: commonKeywords.slice(0, 5),
          missing_skills: jobKeywords.filter(k => !commonKeywords.includes(k)).slice(0, 3),
          experience_gaps: ['Cần đánh giá thêm qua phỏng vấn'],
          strengths: candidateKeywords.slice(0, 3),
          recommendations: ['Nên phỏng vấn để đánh giá chi tiết hơn']
        }
      };

      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error analyzing CV-job match:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      overall_score: 0,
      skill_match_score: 0,
      experience_match_score: 0,
      culture_fit_score: 0,
      salary_match_score: 0,
      detailed_analysis: {
        matching_skills: [],
        missing_skills: [],
        experience_gaps: [],
        strengths: [],
        recommendations: ['Không thể phân tích tự động, cần đánh giá thủ công']
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});