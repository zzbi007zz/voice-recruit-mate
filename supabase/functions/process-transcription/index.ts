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
    
    // Parse form data from Twilio
    const formData = await req.formData();
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    
    console.log(`Transcription received for interview ${interviewId}, question ${questionIndex}:`, {
      status: transcriptionStatus,
      text: transcriptionText?.substring(0, 100) + '...'
    });

    if (!interviewId || !transcriptionText) {
      return new Response('OK', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate basic speech metrics
    const words = transcriptionText.trim().split(/\s+/);
    const wordCount = words.length;
    const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 'basically'];
    const fillerCount = words.filter(word => 
      fillerWords.includes(word.toLowerCase().replace(/[.,!?]/g, ''))
    ).length;
    const fillerRate = wordCount > 0 ? (fillerCount / wordCount) * 100 : 0;

    // Store transcript in database
    const { error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        interview_id: interviewId,
        text: transcriptionText,
        audio_segment_id: recordingSid,
        wpm: null, // Will be calculated later when we have timing info
        filler_rate: fillerRate
      });

    if (transcriptError) {
      console.error('Failed to store transcript:', transcriptError);
    }

    // Update interview responses with transcript
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('metadata')
      .eq('id', interviewId)
      .single();

    if (!fetchError && interview) {
      const metadata = interview.metadata || {};
      const responses = metadata.responses || [];
      
      if (responses[questionIndex]) {
        responses[questionIndex] = {
          ...responses[questionIndex],
          transcript: transcriptionText,
          word_count: wordCount,
          filler_rate: fillerRate,
          transcription_status: transcriptionStatus
        };

        await supabase
          .from('interviews')
          .update({ 
            metadata: { 
              ...metadata, 
              responses: responses 
            }
          })
          .eq('id', interviewId);
      }
    }

    console.log(`Transcript processed and stored for interview ${interviewId}, question ${questionIndex}`);

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('Error in process-transcription function:', error);
    return new Response('Error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});