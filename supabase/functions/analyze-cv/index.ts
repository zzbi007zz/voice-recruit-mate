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

    // Convert PDF to text using improved extraction
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Try to extract text using proper PDF parsing
    let cvText = '';
    
    try {
      // Convert to base64 for OCR processing if needed
      const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
      
      // Use Gemini's vision capabilities to extract text from PDF
      const visionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Extract all text content from this PDF document. Return ONLY the extracted text, preserving the original structure and formatting. Support both Vietnamese and English text. Do not add any commentary or analysis."
            }, {
              inline_data: {
                mime_type: "application/pdf",
                data: base64
              }
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4000,
          }
        }),
      });

      if (visionResponse.ok) {
        const visionData = await visionResponse.json();
        const extractedText = visionData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (extractedText && extractedText.length > 50) {
          cvText = extractedText.trim();
          console.log('Successfully extracted text using Gemini Vision');
        }
      }
    } catch (visionError) {
      console.error('Vision extraction failed:', visionError);
    }
    
    // Fallback: Basic text extraction if vision fails
    if (!cvText || cvText.length < 50) {
      console.log('Falling back to basic text extraction');
      
      try {
        // Try UTF-8 decoding first
        const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
        const rawText = textDecoder.decode(arrayBuffer);
        
        // Extract text using improved patterns
        const patterns = [
          /\(([^)]+)\)/g,                    // Text in parentheses
          /\/F\d+\s+\d+\s+Tf\s*\(([^)]+)\)/g, // Font definitions with text
          /BT\s+([^E]+)\s+ET/g,             // Text objects
          /Tj\s*\[([^\]]+)\]/g,             // Text arrays
        ];
        
        let extractedParts = [];
        patterns.forEach(pattern => {
          const matches = rawText.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const cleaned = match
                .replace(/\(|\)/g, '')
                .replace(/[\\][rnt]/g, ' ')
                .replace(/[\\][0-9]{3}/g, ' ')
                .replace(/\0/g, '')
                .trim();
              if (cleaned.length > 2) {
                extractedParts.push(cleaned);
              }
            });
          }
        });
        
        cvText = extractedParts.join(' ').trim();
        
        // Clean up the text
        cvText = cvText
          .replace(/\0/g, '') // Remove null characters
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
          .replace(/\s+/g, ' ') // Replace multiple spaces
          .trim();
          
      } catch (decodeError) {
        console.error('Text decoding failed:', decodeError);
      }
    }
    
    // Final fallback if no text extracted
    if (!cvText || cvText.trim().length < 20) {
      cvText = `Unable to extract readable text from PDF: ${fileName}. 
This may be because:
1. The PDF is image-based (scanned document) - consider using OCR
2. The PDF uses unsupported encoding
3. The PDF is password protected

For best results, please provide a text-based PDF with selectable content.`;
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
            text: `You are an expert HR professional and recruiter. Analyze the provided CV against the job requirements using a comprehensive scoring matrix. The CV may contain Vietnamese and English text - analyze both languages appropriately.

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

IMPORTANT: Return ONLY a valid JSON object (no markdown formatting, no backticks, no additional text). Ensure the cvText field contains clean, readable text without control characters.

{
  "cvText": "First 500 characters of extracted CV text for verification - clean text only",
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
      
      // Remove any control characters that might break JSON parsing
      cleanContent = cleanContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Parse the cleaned JSON
      analysis = JSON.parse(cleanContent);
      
      // Validate required fields and add defaults if missing
      if (!analysis.cvText) {
        // Clean the CV text for display - remove control characters
        const cleanCvText = cvText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').substring(0, 500);
        analysis.cvText = cleanCvText;
      }
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
      
      // Enhanced fallback response with cleaned CV text
      const cleanCvText = cvText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').substring(0, 500);
      analysis = {
        cvText: cleanCvText,
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
        summary: "CV analysis completed with limitations. The text was extracted but AI parsing encountered issues. Manual review recommended.",
        strengths: ["CV successfully uploaded and processed", "Basic content extraction completed"],
        gaps: ["Detailed analysis limited due to parsing complexity", "May require manual review for accuracy"],
        recommendations: ["Consider re-uploading CV in a different format", "Ensure CV contains clear, selectable text", "Manual review by HR team recommended"],
        keySkillsMatch: { technical: [], soft: [], experience: [] },
        riskFactors: ["Automated analysis incomplete - manual verification needed"]
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