import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!, // e.g. 'mailto:you@example.com'
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

Deno.serve(async (req) => {
  const payload = await req.json();
  const message = payload.record; // the newly inserted messages row

  if (!message) return new Response('no record', { status: 400 });

  const { data: participants } = await supabaseAdmin
    .from('conversation_participants')
    .select('user_id, is_muted')
    .eq('conversation_id', message.conversation_id)
    .neq('user_id', message.sender_id);

  const { data: sender } = await supabaseAdmin
    .from('profiles').select('name').eq('id', message.sender_id).single();

  const { data: conversation } = await supabaseAdmin
    .from('conversations').select('name, is_group').eq('id', message.conversation_id).single();

  const preview = message.type === 'voice' ? 'Voice message'
    : message.type === 'image' ? 'Photo'
    : message.type === 'file' ? (message.file_name || 'Document')
    : message.deleted_at ? 'Message deleted'
    : (message.text || 'New message');

  const title = conversation?.is_group ? conversation.name : (sender?.name || 'Sprout');

  for (const p of participants || []) {
    if (p.is_muted) continue;

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('settings').eq('id', p.user_id).single();
    if (profile?.settings?.notifications === false) continue;

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions').select('*').eq('user_id', p.user_id);

    for (const sub of subs || []) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSub, JSON.stringify({
          title,
          body: preview,
          url: `#/chat/${message.conversation_id}`,
        }));
      } catch (err) {
        console.error('Push send failed:', err.statusCode, sub.endpoint);
        // 410/404 means the subscription is dead (uninstalled, expired) — clean it up.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
});


