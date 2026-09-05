import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversations } from '../src/hooks/useConversations.js';
import { COLORS } from '../src/utils/constants.js';

export default function JoinGroupPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { joinViaInvite } = useConversations();
  const [status, setStatus] = useState('joining'); // joining | error

  useEffect(() => {
    let active = true;
    joinViaInvite(code).then(convId => {
      if (!active) return;
      if (convId) navigate(`/chat/${convId}`, { replace: true });
      else setStatus('error');
    });
    return () => { active = false; };
  }, [code, joinViaInvite, navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: COLORS.bg }}>
      {status === 'joining' ? (
        <>
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primary }} />
          <span className="text-sm" style={{ color: COLORS.textMuted }}>Joining group...</span>
        </>
      ) : (
        <>
          <span className="text-sm" style={{ color: COLORS.text }}>This invite link is invalid or has expired.</span>
          <button onClick={() => navigate('/')} className="text-sm font-semibold px-4 py-2 rounded-full" style={{ backgroundColor: COLORS.accentSoft, color: COLORS.primary }}>
            Go to chats
          </button>
        </>
      )}
    </div>
  );
}