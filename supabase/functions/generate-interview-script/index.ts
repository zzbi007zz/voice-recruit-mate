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
    const { interviewId } = await req.json();
    
    if (!interviewId) {
      throw new Error('Interview ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get interview details
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (error || !interview) {
      console.error('Interview not found:', error);
      throw new Error('Interview not found');
    }

    const role = interview.role || 'candidate';
    const language = interview.language || 'vi';

    // Generate interview script using OpenAI
    const scriptPrompt = language === 'vi' 
      ? `Tạo một kịch bản phỏng vấn cho vị trí "${role}". Tạo 5 câu hỏi phỏng vấn tiếng Việt theo thứ tự từ dễ đến khó:
        1. Câu hỏi giới thiệu bản thân
        2. Câu hỏi về kinh nghiệm làm việc
        3. Câu hỏi kỹ thuật cơ bản về vị trí này
        4. Câu hỏi tình huống thực tế
        5. Câu hỏi về mục tiêu nghề nghiệp
        
        Trả về định dạng JSON với cấu trúc:
        {
          "questions": [
            {
              "id": 1,
              "text": "câu hỏi",
              "type": "introduction",
              "timeout": 30,
              "follow_up": "câu nói tiếp theo"
            }
          ]
        }`
      : `Create an interview script for the "${role}" position. Generate 5 English interview questions in order from easy to difficult:
        1. Self-introduction question
        2. Work experience question  
        3. Basic technical question for this position
        4. Situational question
        5. Career goals question
        
        Return JSON format with structure:
        {
          "questions": [
            {
              "id": 1,
              "text": "question text",
              "type": "introduction", 
              "timeout": 30,
              "follow_up": "follow up statement"
            }
          ]
        }`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an HR expert creating structured interview questions. Always respond with valid JSON only.' 
          },
          { role: 'user', content: scriptPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate interview script');
    }

    const data = await response.json();
    let script;
    
    try {
      script = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      // Fallback default script
      script = {
        questions: [
          {
            id: 1,
            text: language === 'vi' ? 'Xin chào! Vui lòng giới thiệu về bản thân và kinh nghiệm của bạn.' : 'Hello! Please introduce yourself and your experience.',
            type: 'introduction',
            timeout: 30,
            follow_up: language === 'vi' ? 'Cảm ơn bạn đã chia sẻ.' : 'Thank you for sharing.'
          }
        ]
      };
    }

    // Update interview with generated script
    const { error: updateError } = await supabase
      .from('interviews')
      .update({ 
        metadata: { 
          script: script,
          current_question: 0,
          responses: []
        }
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error('Failed to update interview:', updateError);
      throw new Error('Failed to save interview script');
    }

    console.log('Interview script generated successfully for:', interviewId);

    return new Response(JSON.stringify({ 
      success: true, 
      script: script,
      interviewId: interviewId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-interview-script function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});