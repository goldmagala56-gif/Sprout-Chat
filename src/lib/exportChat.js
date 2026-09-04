import { supabase } from './supabase.js';

// Text-only export (no bundled media), matching WhatsApp's basic
// "Export chat without media" option. Paginates past the normal
// 50-message fetch limit to pull the full history.
export async function exportChatAsText(conversationId, conversationName, currentUserId) {
  const PAGE = 200;
  let all = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('messages')
      .select('sender_id, text, type, file_name, deleted_at, created_at, profiles:sender_id(name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) { console.error('Export fetch error:', error); break; }
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  const lines = all.map(m => {
    const date = new Date(m.created_at);
    const stamp = date.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const sender = m.sender_id === currentUserId ? 'You' : (m.profiles?.name || 'Unknown');
    let content;
    if (m.deleted_at) content = 'This message was deleted';
    else if (m.type === 'image') content = '<image omitted>';
    else if (m.type === 'voice') content = '<voice message omitted>';
    else if (m.type === 'file') content = `<file omitted: ${m.file_name || 'file'}>`;
    else content = m.text || '';
    return `[${stamp}] ${sender}: ${content}`;
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(conversationName || 'chat').replace(/[^a-z0-9]/gi, '_')}_export.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}