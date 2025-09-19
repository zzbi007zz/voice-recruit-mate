import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { fileName, jobDescription, jobTitle } = await req.json();

    if (!fileName || !jobDescription) {
      return new Response(JSON.stringify({ error: 'File name and job description are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Downloading PDF file from storage:', fileName);

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(fileName);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      return new Response(JSON.stringify({ error: 'Failed to download CV file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Parsing PDF to text');

    // Convert PDF to text using a simple text extraction
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Simple PDF text extraction (this is a basic approach)
    const pdfText = new TextDecoder().decode(uint8Array);
    
    // Extract readable text from PDF (basic regex approach)
    let cvText = '';
    const textMatches = pdfText.match(/\(([^)]+)\)/g);
    if (textMatches) {
      cvText = textMatches.map(match => match.slice(1, -1)).join(' ');
    }
    
    // If no text found, use a fallback
    if (!cvText || cvText.trim().length < 50) {
      cvText = "Unable to extract text from PDF. Please ensure the PDF contains readable text and is not image-based.";
    }

    console.log('Analyzing CV against job description using Gemini');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert HR professional and recruiter. Your job is to analyze candidate CVs against job descriptions and provide detailed matching assessments.

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
- NO_MATCH: <50% match, poor fit for the role

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE CV TEXT:
${cvText}

Please provide a comprehensive analysis in the specified JSON format. Return ONLY the JSON response, no other text.`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to analyze CV with Gemini' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const analysisContent = data.candidates[0].content.parts[0].text;

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