// DEPLOYMENT:
// supabase functions deploy ai-chat --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN') ?? '';
const GITHUB_MODELS_URL = 'https://models.inference.ai.azure.com/chat/completions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse body
    const body = await req.json();
    const { messages, model = 'gpt-4o-mini' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token exists
    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN secret not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Forward to GitHub Models
    const githubResponse = await fetch(GITHUB_MODELS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 600,
        top_p: 0.8,
      }),
    });

    // Handle rate limit from GitHub
    if (githubResponse.status === 429) {
      const retryAfter = githubResponse.headers.get('retry-after') || '60';
      return new Response(
        JSON.stringify({
          error: 'rate_limited',
          message: `Limita de cereri atinsă. Încearcă din nou în ${retryAfter} secunde.`,
          retryAfter: parseInt(retryAfter),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': retryAfter,
          },
        }
      );
    }

    if (!githubResponse.ok) {
      const errorBody = await githubResponse.json().catch(() => ({}));
      console.error('GitHub Models error:', githubResponse.status, errorBody);
      return new Response(
        JSON.stringify({
          error: 'upstream_error',
          message: errorBody?.error?.message || 'Eroare la serviciul AI.',
        }),
        {
          status: githubResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Forward successful response to client
    const data = await githubResponse.json();
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'internal_error', message: 'Eroare internă de server.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});