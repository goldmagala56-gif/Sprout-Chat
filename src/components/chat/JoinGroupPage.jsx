import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Leaf, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useConversations } from '../hooks/useConversations.js';
import { COLORS } from '../utils/constants.js';

const PENDING_INVITE_KEY = 'sprout_pending_invite';

export default function JoinGroupPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { joinViaInvite } = useConversations();
  const [status, setStatus] = useState('checking'); // checking | joining | error | needs-auth
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not signed in — remember this invite. AppShell.jsx picks this up
      // and redirects back here automatically once the user is authenticated.
      if (code) localStorage.setItem(PENDING_INVITE_KEY, code);
      setStatus('needs-auth');
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMsg('This invite link looks incomplete.');
      return;
    }

    let cancelled = false;
    setStatus('joining');
    joinViaInvite(code).then((convId) => {
      if (cancelled) return;
      localStorage.removeItem(PENDING_INVITE_KEY);
      if (convId) {
        navigate(`/chat/${convId}`, { replace: true });
      } else {
        setStatus('error');
        setErrorMsg("This invite link isn't valid, or may have expired.");
      }
    });

    return () => { cancelled = true; };
  }, [user, authLoading, code, joinViaInvite, navigate]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, backgroundColor: COLORS.primary }}>
        <Leaf size={28} color="white" strokeWidth={2.5} />
      </div>

      {(status === 'checking' || status === 'joining') && (
        <>
          <Loader2 size={24} className="animate-spin" color={COLORS.primary} />
          <p className="text-sm" style={{ color: COLORS.textMuted }}>Joining group...</p>
        </>
      )}

      {status === 'needs-auth' && (
        <>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>Sign in to join this group</h2>
          <p className="text-sm max-w-xs" style={{ color: COLORS.textMuted }}>
            You'll be brought back here automatically after you sign in.
          </p>
          <div className="flex gap-3 mt-2">
            <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: COLORS.primary }}>Log in</Link>
            <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ color: COLORS.primary, border: `1px solid ${COLORS.primary}` }}>Sign up</Link>
          </div>
        </>
      )}

      {status === 'error' && (
        <>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>Couldn't join group</h2>
          <p className="text-sm max-w-xs" style={{ color: COLORS.textMuted }}>{errorMsg}</p>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-xl text-sm font-semibold text-white mt-2" style={{ backgroundColor: COLORS.primary }}>
            Go to chats
          </button>
        </>
      )}
    </div>
  );
}