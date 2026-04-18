// AI-powered MCQ question generator using Lovable AI Gateway
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  topic: string;
  count: number;
  className?: string;
  subject?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const topic = (body.topic || '').trim();
    const count = Math.max(1, Math.min(20, Number(body.count) || 10));
    const className = (body.className || '').trim();
    const subject = (body.subject || '').trim();

    if (!topic || topic.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Topic must be at least 3 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert exam question writer for Indian school students. Generate clear, exam-quality multiple-choice questions. Each question must have exactly 4 options labeled A, B, C, D, and a single correct answer. Keep language simple and age-appropriate.${className ? ` Target class: ${className}.` : ''}${subject ? ` Subject: ${subject}.` : ''}`;

    const userPrompt = `Generate ${count} multiple-choice questions on the topic: "${topic}". Return them via the save_questions tool. Make sure correct_option_index is 0-3 (A=0, B=1, C=2, D=3).`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'save_questions',
              description: 'Save the generated MCQ questions',
              parameters: {
                type: 'object',
                properties: {
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question_text: { type: 'string', description: 'The question text' },
                        options: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Exactly 4 options',
                          minItems: 4,
                          maxItems: 4,
                        },
                        correct_option_index: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 3,
                          description: 'Index of correct option (0-3)',
                        },
                      },
                      required: ['question_text', 'options', 'correct_option_index'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['questions'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'save_questions' } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit reached. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Failed to generate questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in AI response:', JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: 'AI did not return structured questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const questions = (parsed?.questions || []).filter((q: any) =>
      q?.question_text && Array.isArray(q.options) && q.options.length === 4 &&
      typeof q.correct_option_index === 'number' && q.correct_option_index >= 0 && q.correct_option_index <= 3
    );

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('generate-mcq-questions error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
