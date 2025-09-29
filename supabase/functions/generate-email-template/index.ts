import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, language } = await req.json();

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Define prompts for different categories and languages
    const prompts = {
      vi: {
        candidate: `Tạo email template chuyên nghiệp cho ứng viên với tên "${name}". 
                   Template cần bao gồm:
                   - Subject line hấp dẫn
                   - Lời chào thân thiện
                   - Nội dung chính về cơ hội nghề nghiệp
                   - Call-to-action rõ ràng
                   - Chữ ký công ty
                   Sử dụng các biến {{tên_ứng_viên}}, {{vị_trí}}, {{tên_công_ty}} để personalize.`,
        client: `Tạo email template kinh doanh cho khách hàng với tên "${name}".
                Template cần bao gồm:
                - Subject line thu hút
                - Giới thiệu dịch vụ tuyển dụng
                - Lợi ích cho khách hàng
                - Đề xuất hợp tác
                Sử dụng các biến {{tên_khách_hàng}}, {{tên_công_ty}}, {{dịch_vụ}}.`,
        follow_up: `Tạo email follow-up chuyên nghiệp với tên "${name}".
                   Nội dung nhắc nhở nhẹ nhàng và thúc đẩy hành động.`,
        interview: `Tạo email mời phỏng vấn với tên "${name}".
                   Bao gồm thông tin về thời gian, địa điểm, và chuẩn bị.`,
        rejection: `Tạo email từ chối lịch sự với tên "${name}".
                   Giữ lại thiện cảm và mở cửa cho tương lai.`,
        offer: `Tạo email đề nghị công việc với tên "${name}".
               Bao gồm chi tiết về lương, quyền lợi và bước tiếp theo.`
      },
      en: {
        candidate: `Create a professional email template for candidates named "${name}".
                   Include:
                   - Compelling subject line
                   - Friendly greeting
                   - Main content about career opportunity
                   - Clear call-to-action
                   - Company signature
                   Use variables {{candidate_name}}, {{position}}, {{company_name}} for personalization.`,
        client: `Create a business email template for clients named "${name}".
                Include:
                - Attractive subject line
                - Introduction to recruitment services
                - Benefits for the client
                - Collaboration proposal
                Use variables {{client_name}}, {{company_name}}, {{service}}.`,
        follow_up: `Create a professional follow-up email named "${name}".
                   Content should be gentle reminder and encourage action.`,
        interview: `Create an interview invitation email named "${name}".
                   Include information about time, location, and preparation.`,
        rejection: `Create a polite rejection email named "${name}".
                   Maintain goodwill and keep doors open for the future.`,
        offer: `Create a job offer email named "${name}".
               Include details about salary, benefits and next steps.`
      }
    };

    const prompt = prompts[language]?.[category] || prompts.vi.candidate;

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
            content: `You are a professional email template generator for recruitment. 
                     Generate both subject and content. 
                     Format response as JSON: {"subject": "...", "content": "..."}`
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      const fallbackSubject = `${name} - ${language === 'vi' ? 'Thông báo quan trọng' : 'Important Notice'}`;
      const fallbackContent = content;

      return new Response(JSON.stringify({
        subject: fallbackSubject,
        content: fallbackContent
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error generating email template:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      subject: 'Template không khả dụng',
      content: 'Xin lỗi, không thể tạo template tự động. Vui lòng thử lại sau.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});