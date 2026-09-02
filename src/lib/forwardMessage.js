import { supabase } from './supabase.js';

// Inserted one-by-one (not a bulk insert) so that if the sender is blocked
// in one target conversation, that insert fails on its own via RLS without
// rolling back forwards to the other, unblocked conversations.
export async function forwardMessage(message, conversationIds, userId) {
  const success = [];
  const failed = [];
  if (!message || !conversationIds?.length || !userId) return { success, failed };

  for (const conversation_id of conversationIds) {
    const { error } = await supabase.from('messages').insert({
      conversation_id,
      sender_id: userId,
      text: message.text || '',
      type: message.type || 'text',
      file_url: message.file_url || null,
      duration: message.duration || null,
      reply_to: null,
      forwarded: true,
    });
    if (error) {
      console.error('Forward error for conversation', conversation_id, error);
      failed.push(conversation_id);
    } else {
      success.push(conversation_id);
    }
  }

  return { success, failed };
}