import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('A variavel GEMINI_API_KEY nao foi configurada no Supabase.');
    }

    // Endpoint oficial na v1 estável
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // CORRIGIDO AQUI: system_instruction com underline para a API v1 aceitar
        system_instruction: {
          parts: [{ 
            text: "You are an expert AI image prompt engineer. Output ONLY the final raw prompt text. Never include introduction, conversational text, markdown blocks, or quotes. Start directly with the prompt." 
          }]
        },
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 1000
        }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erro na API do Gemini');

    let result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Erro ao gerar.';
    result = result.replace(/```text|```/g, '').trim();

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch(e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});