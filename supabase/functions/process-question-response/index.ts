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
    const url = new URL(req.url);
    const interviewId = url.searchParams.get('interview_id');
    const questionIndex = parseInt(url.searchParams.get('question_index') || '0');
    
    if (!interviewId) {
      throw new Error('Interview ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing response for interview ${interviewId}, question ${questionIndex}`);

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

    const script = interview.metadata?.script || { questions: [] };
    const responses = interview.metadata?.responses || [];
    const currentQuestion = script.questions[questionIndex];
    
    // Record that this question was asked
    responses[questionIndex] = {
      question: currentQuestion?.text || 'Unknown question',
      timestamp: new Date().toISOString(),
      status: 'answered'
    };

    // Determine next question
    const nextQuestionIndex = questionIndex + 1;
    const hasMoreQuestions = nextQuestionIndex < script.questions.length;

    // Update interview metadata
    const updatedMetadata = {
      ...interview.metadata,
      current_question: nextQuestionIndex,
      responses: responses,
      last_activity: new Date().toISOString()
    };

    await supabase
      .from('interviews')
      .update({ metadata: updatedMetadata })
      .eq('id', interviewId);

    let twiml;

    if (hasMoreQuestions) {
      const nextQuestion = script.questions[nextQuestionIndex];
      const language = interview.language === 'vi' ? 'vi-VN' : 'en-US';
      
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="alice" language="${language}">
    ${interview.language === 'vi' ? 'Câu hỏi tiếp theo:' : 'Next question:'}
  </Say>
  <Pause length="1"/>
  <Record timeout="10" finishOnKey="#" action="https://${url.host}/functions/v1/process-question-response?interview_id=${interviewId}&amp;question_index=${nextQuestionIndex}" transcribe="true" transcribeCallback="https://${url.host}/functions/v1/process-transcription?interview_id=${interviewId}&amp;question_index=${nextQuestionIndex}">
    <Say voice="alice" language="${language}">
      ${nextQuestion.text}
    </Say>
  </Record>
</Response>`;
    } else {
      // Interview completed
      const language = interview.language === 'vi' ? 'vi-VN' : 'en-US';
      const completionMessage = interview.language === 'vi' 
        ? 'Cảm ơn bạn đã tham gia cuộc phỏng vấn. Chúng tôi sẽ liên hệ với bạn sớm nhất có thể.'
        : 'Thank you for participating in the interview. We will contact you as soon as possible.';

      // Update interview status to completed
      await supabase
        .from('interviews')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString(),
          metadata: updatedMetadata
        })
        .eq('id', interviewId);

      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="alice" language="${language}">
    ${completionMessage}
  </Say>
  <Pause length="2"/>
  <Hangup/>
</Response>`;
    }

    console.log(`Generated TwiML for question ${questionIndex}, next: ${nextQuestionIndex}`);

    return new Response(twiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Error in process-question-response function:', error);
    
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    There was an error processing the interview. Please try again later.
  </Say>
  <Hangup/>
</Response>`;

    return new Response(errorTwiml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  }
});