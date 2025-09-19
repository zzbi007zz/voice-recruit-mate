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

    if (!fileName) {
      return new Response(JSON.stringify({ error: 'File name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use job title as fallback if description is empty
    const effectiveJobDescription = jobDescription || `Job Title: ${jobTitle}\n\nNo detailed job description provided. Please analyze the CV against this job title and provide general professional assessment.`;

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
    
    // Enhanced PDF text extraction
    const pdfText = new TextDecoder().decode(uint8Array);
    
    // Extract readable text from PDF using multiple approaches
    let cvText = '';
    
    // Method 1: Extract text between parentheses (common in PDFs)
    const textMatches = pdfText.match(/\(([^)]+)\)/g);
    if (textMatches) {
      cvText += textMatches.map(match => match.slice(1, -1)).join(' ');
    }
    
    // Method 2: Extract text using BT/ET markers (PDF text objects)
    const btEtMatches = pdfText.match(/BT\s+(.*?)\s+ET/gs);
    if (btEtMatches) {
      btEtMatches.forEach(match => {
        const textContent = match.match(/\(([^)]*)\)/g);
        if (textContent) {
          cvText += ' ' + textContent.map(t => t.slice(1, -1)).join(' ');
        }
      });
    }
    
    // Method 3: Extract text using Tj operators
    const tjMatches = pdfText.match(/\(([^)]+)\)\s*Tj/g);
    if (tjMatches) {
      cvText += ' ' + tjMatches.map(match => match.match(/\(([^)]+)\)/)[1]).join(' ');
    }
    
    // Clean up the extracted text
    cvText = cvText
      .replace(/\\[rnt]/g, ' ') // Remove escape characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // If still no meaningful text found, provide a detailed fallback
    if (!cvText || cvText.trim().length < 100) {
      cvText = `Unable to extract sufficient text from PDF: ${fileName}. 
      This could be due to:
      1. The PDF being image-based (scanned document)
      2. The PDF using unsupported text encoding
      3. The PDF being encrypted or protected
      
      Please ensure the PDF contains readable, selectable text for proper analysis.`;
    }
    
    console.log('Extracted CV text length:', cvText.length);
    console.log('CV text preview:', cvText.substring(0, 200));

    console.log('Analyzing CV against job description using Gemini');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert HR professional and recruiter. Analyze the provided CV against the job requirements using a comprehensive scoring matrix.

SCORING MATRIX (Total: 100 points):
1. Technical Skills Match (30 points)
   - Required technical skills: 20 points
   - Preferred technical skills: 10 points

2. Experience Level (25 points)
   - Years of experience: 15 points
   - Relevant industry experience: 10 points

3. Education & Certifications (15 points)
   - Required education: 10 points
   - Relevant certifications: 5 points

4. Soft Skills & Cultural Fit (20 points)
   - Communication skills: 5 points
   - Leadership/teamwork: 5 points
   - Problem-solving: 5 points
   - Adaptability: 5 points

5. Additional Qualifications (10 points)
   - Portfolio/projects: 5 points
   - Languages: 2 points
   - Awards/achievements: 3 points

JOB TITLE: ${jobTitle}
JOB DESCRIPTION: ${effectiveJobDescription}
CV TEXT: ${cvText}

Return ONLY a valid JSON object (no markdown formatting, no backticks) with this exact structure:
{
  "cvText": "First 500 characters of extracted CV text for verification",
  "match": "MATCH or PARTIAL_MATCH or NO_MATCH",
  "matchPercentage": 85,
  "scoreBreakdown": {
    "technicalSkills": 25,
    "experience": 20,
    "education": 12,
    "softSkills": 18,
    "additional": 8,
    "total": 83
  },
  "summary": "Brief 2-3 sentence overall assessment",
  "strengths": ["Specific matching qualifications", "Relevant skills found"],
  "gaps": ["Missing requirements", "Areas for improvement"],
  "recommendations": ["Specific suggestions for candidate"],
  "keySkillsMatch": {
    "technical": ["React", "TypeScript", "JavaScript"],
    "soft": ["Communication", "Problem-solving"],
    "experience": ["3+ years frontend", "Team collaboration"]
  },
  "riskFactors": ["Any concerns or potential issues"]
}

Match criteria: MATCH (80-100%), PARTIAL_MATCH (50-79%), NO_MATCH (0-49%)`
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

    console.log('Raw Gemini response:', analysisContent);
    console.log('Analysis completed successfully');

    let analysis;
    try {
      // Clean the response to ensure it's valid JSON
      let cleanContent = analysisContent.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Parse the cleaned JSON
      analysis = JSON.parse(cleanContent);
      
      // Validate required fields and add defaults if missing
      if (!analysis.cvText) analysis.cvText = cvText.substring(0, 500);
      if (!analysis.scoreBreakdown) {
        analysis.scoreBreakdown = {
          technicalSkills: Math.floor(analysis.matchPercentage * 0.3),
          experience: Math.floor(analysis.matchPercentage * 0.25),
          education: Math.floor(analysis.matchPercentage * 0.15),
          softSkills: Math.floor(analysis.matchPercentage * 0.2),
          additional: Math.floor(analysis.matchPercentage * 0.1),
          total: analysis.matchPercentage
        };
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content that failed to parse:', analysisContent);
      
      // Enhanced fallback response with actual CV text
      analysis = {
        cvText: cvText.substring(0, 500),
        match: "PARTIAL_MATCH",
        matchPercentage: 50,
        scoreBreakdown: {
          technicalSkills: 15,
          experience: 12,
          education: 8,
          softSkills: 10,
          additional: 5,
          total: 50
        },
        summary: "Analysis completed but AI response format was invalid. The CV was processed but detailed scoring could not be completed. Please try again.",
        strengths: ["CV successfully uploaded and processed"],
        gaps: ["Unable to complete detailed analysis due to parsing error"],
        recommendations: ["Please re-upload the CV and try analysis again"],
        keySkillsMatch: { technical: [], soft: [], experience: [] },
        riskFactors: ["Analysis incomplete due to technical issue"]
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