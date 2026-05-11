import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  userIds:  string[];
  title:    string;
  body:     string;
  data?:    Record<string, unknown>;
  sound?:   'default' | null;
  badge?:   number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const payload: PushPayload = await req.json();
    const { userIds, title, body, data = {}, sound = 'default' } = payload;

    if (!userIds?.length || !title || !body) {
      return new Response(JSON.stringify({ error: 'userIds, title, body required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch push tokens for the given user IDs
    const { data: rows, error } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (error) throw error;

    const tokens = (rows ?? []).map((r: any) => r.token).filter(Boolean);
    if (!tokens.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No tokens found' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Expo Push API allows max 100 messages per request
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const messages = chunk.map((token) => ({
        to: token,
        sound,
        title,
        body,
        data,
        channelId: 'default',
        priority:  'high',
      }));

      const res = await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(messages),
      });

      if (res.ok) totalSent += chunk.length;
    }

    // Also insert in-app notifications for each user
    const notifRows = userIds.map((userId) => ({
      user_id: userId,
      title,
      body,
      type:    (data.type as string) ?? 'system',
      data,
    }));

    await supabase.from('notifications').insert(notifRows);

    return new Response(JSON.stringify({ sent: totalSent }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push]', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
