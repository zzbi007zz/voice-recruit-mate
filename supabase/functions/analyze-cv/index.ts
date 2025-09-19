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
    const { cvText, jobDescription, jobTitle } = await req.json();

    if (!cvText || !jobDescription) {
      return new Response(JSON.stringify({ error: 'CV text and job description are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Analyzing CV against job description');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert HR professional and recruiter. Your job is to analyze candidate CVs against job descriptions and provide detailed matching assessments.

Analyze the provided CV against the job description and return a JSON response with the following structure:
{
  "match": "MATCH" | "PARTIAL_MATCH" | "NO_MATCH",
  "matchPercentage": number (0-100),
  "summary": "Brief overall assessment (2-3 sentences)",
  "strengths": ["Array of matching qualifications and skills"],
  "gaps": ["Array of missing requirements or skills"],
  "recommendations": ["Array of suggestions for improvement"],
  "keySkillsMatch": {
    "technical": ["Matched technical skills"],
    "soft": ["Matched soft skills"],
    "experience": ["Relevant experience matches"]
  },
  "riskFactors": ["Potential concerns or red flags"]
}

Use these criteria for match levels:
- MATCH: 80%+ match, strong fit for the role
- PARTIAL_MATCH: 50-79% match, some fit but has gaps
- NO_MATCH: <50% match, poor fit for the role`
          },
          {
            role: 'user',
            content: `Please analyze this CV against the job description:

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE CV:
${cvText}

Please provide a comprehensive analysis in the specified JSON format.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to analyze CV' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const analysisContent = data.choices[0].message.content;

    console.log('Analysis completed successfully');

    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback to a basic response
      analysis = {
        match: "PARTIAL_MATCH",
        matchPercentage: 50,
        summary: "Analysis completed but response format was invalid. Please try again.",
        strengths: [],
        gaps: [],
        recommendations: [],
        keySkillsMatch: { technical: [], soft: [], experience: [] },
        riskFactors: []
      };
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-cv function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});