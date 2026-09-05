import React, { useState } from 'react';
import { Plus, Camera } from 'lucide-react';
import { useAuth } from '../src/hooks/useAuth.js';
import { useStatuses } from '../src/hooks/useStatuses.js';
import { COLORS } from '../src/utils/constants.js';
import Avatar from '../src/components/ui/Avatar.jsx';
import BottomNav from '../src/components/layout/BottomNav.jsx';
import StatusViewer from '../src/components/status/StatusViewer.jsx';
import StatusComposer from '../src/components/status/StatusComposer.jsx';

export default function StatusPage() {
  const { user, profile } = useAuth();
  const { myStatuses, feed, loading, postStatus, deleteStatus, markViewed, fetchViewers } = useStatuses(user?.id);
  const [viewing, setViewing] = useState(null); // { user, statuses, isMine }
  const [composing, setComposing] = useState(false);

  const openMine = () => {
    if (myStatuses.length === 0) { setComposing(true); return; }
    setViewing({ user: profile, statuses: myStatuses, isMine: true });
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: COLORS.bg }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ backgroundColor: COLORS.bgSecondary }}>
        <h1 className="text-lg font-bold" style={{ color: COLORS.text }}>Status</h1>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${COLORS.divider}` }}>
          <button onClick={openMine} className="relative flex-shrink-0">
            <Avatar url={profile?.avatar_url} initials={profile?.initials || 'YO'} size={52} />
            {myStatuses.length === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2" style={{ width: 20, height: 20, backgroundColor: COLORS.primary, borderColor: COLORS.bg }}>
                <Plus size={12} color="white" />
              </div>
            )}
          </button>
          <button onClick={openMine} className="flex-1 text-left">
            <div className="text-sm font-semibold" style={{ color: COLORS.text }}>My Status</div>
            <div className="text-xs" style={{ color: COLORS.textMuted }}>
              {myStatuses.length === 0 ? 'Tap to add status update' : `${myStatuses.length} update${myStatuses.length === 1 ? '' : 's'} \u00b7 tap to view`}
            </div>
          </button>
          {myStatuses.length > 0 && (
            <button onClick={() => setComposing(true)} className="p-2 rounded-full hover:bg-black/5 flex-shrink-0">
              <Camera size={18} color={COLORS.primary} />
            </button>
          )}
        </div>

        {feed.length > 0 && (
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: COLORS.textMuted }}>Recent updates</div>
        )}

        {loading && feed.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primary }} />
          </div>
        )}

        {feed.map(entry => (
          <button
            key={entry.user.id}
            onClick={() => setViewing({ user: entry.user, statuses: entry.statuses, isMine: false })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] text-left"
          >
            <div className="rounded-full p-0.5 flex-shrink-0" style={{ border: `2px solid ${entry.allViewed ? COLORS.divider : COLORS.primary}` }}>
              <Avatar url={entry.user.avatar_url} initials={entry.user.initials} size={48} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: COLORS.text }}>{entry.user.name}</div>
              <div className="text-xs" style={{ color: COLORS.textMuted }}>
                {new Date(entry.statuses[entry.statuses.length - 1].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </button>
        ))}

        {!loading && feed.length === 0 && (
          <div className="text-center text-xs py-10" style={{ color: COLORS.textMuted }}>
            No recent updates from your contacts
          </div>
        )}
      </div>

      <BottomNav />

      {viewing && (
        <StatusViewer
          user={viewing.user}
          statuses={viewing.statuses}
          isMine={viewing.isMine}
          onClose={() => setViewing(null)}
          onMarkViewed={markViewed}
          onDelete={deleteStatus}
          onFetchViewers={fetchViewers}
        />
      )}
      {composing && (
        <StatusComposer onPost={postStatus} onClose={() => setComposing(false)} />
      )}
    </div>
  );
}