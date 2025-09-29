import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  recipientType: 'candidate' | 'client';
  recipientId?: string;
  variables: Record<string, string>;
  customSubject?: string;
  customContent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      templateId, 
      recipientEmail, 
      recipientName, 
      recipientType, 
      recipientId,
      variables,
      customSubject,
      customContent
    }: SendEmailRequest = await req.json();

    console.log("Sending email with data:", { templateId, recipientEmail, recipientName, recipientType });

    // Get template data if templateId provided
    let subject = customSubject || '';
    let content = customContent || '';
    
    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) {
        console.error("Error fetching template:", templateError);
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      subject = template.subject;
      content = template.content;
    }

    // Replace variables in subject and content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "Tuyển dụng <onboarding@resend.dev>", // Update this with your verified domain
      to: [recipientEmail],
      subject: subject,
      html: content.replace(/\n/g, '<br>'),
    });

    console.log("Email sent successfully:", emailResponse);

    // Log email in database
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        template_id: templateId || null,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        recipient_type: recipientType,
        recipient_id: recipientId || null,
        subject: subject,
        content: content,
        variables: variables,
        status: 'sent'
      });

    if (logError) {
      console.error("Error logging email:", logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: "Email sent successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);