import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Leaf, ArrowLeft, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import { COLORS } from '../../utils/constants.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useConversations } from '../../hooks/useConversations.js';
import { CallProvider } from '../../context/CallContext.jsx';
import Avatar from '../ui/Avatar.jsx';
import ChatList from './ChatList.jsx';
import BottomNav from './BottomNav.jsx';
import CallOverlay from '../call/CallOverlay.jsx';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { conversations, loading, toggleMute, toggleArchive, togglePin } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const searched = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const archivedList = searched.filter(c => c.isArchived);
  const activeList = searched.filter(c => !c.isArchived);
  // Pinned chats float to the top, most-recently-pinned first; everything
  // else keeps the existing most-recent-activity ordering.
  const sortedActive = [
    ...activeList.filter(c => c.isPinned).sort((a, b) => new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0)),
    ...activeList.filter(c => !c.isPinned),
  ];
  const filtered = showArchived ? archivedList : sortedActive;

  const isChatRoute = location.pathname.startsWith('/chat/');
  const isListRoute = location.pathname === '/';
  const showChatList = !isMobile || isListRoute;
  const showChatWindow = !isMobile || !isListRoute;

  return (
    <CallProvider>
      <div className="h-[100dvh] w-full flex overflow-hidden bg-white font-sans relative">
        {/* ===== SIDEBAR (Chat List) ===== */}
        <div 
          className={`flex-col flex-shrink-0 border-r transition-transform duration-200
            ${showChatList ? 'flex' : 'hidden'}
            ${isMobile ? 'w-full absolute inset-0 z-20 bg-white' : 'w-[400px]'}
          `}
          style={{ borderColor: COLORS.divider }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: COLORS.bgSecondary }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="flex items-center justify-center rounded-xl" 
                style={{ width: 32, height: 32, backgroundColor: COLORS.primary }}
              >
                <Leaf size={18} color="white" strokeWidth={2.5} />
              </div>
              <span className="font-medium text-lg" style={{ color: COLORS.text }}>Sprout</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigate('/new-chat')}
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <Plus size={20} color={COLORS.textMuted} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 flex-shrink-0">
            <div 
              className="flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ backgroundColor: COLORS.bgSecondary }}
            >
              <Search size={16} color={COLORS.textMuted} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: COLORS.text }}
              />
            </div>
          </div>

          {/* Archived toggle row */}
          {archivedList.length > 0 && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 hover:bg-black/[0.02]"
              style={{ borderBottom: `1px solid ${COLORS.divider}` }}
            >
              <div className="flex items-center gap-2">
                <Archive size={16} color={COLORS.textMuted} />
                <span className="text-sm" style={{ color: COLORS.text }}>Archived ({archivedList.length})</span>
              </div>
              {showArchived ? <ChevronUp size={16} color={COLORS.textMuted} /> : <ChevronDown size={16} color={COLORS.textMuted} />}
            </button>
          )}

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <ChatList 
              chats={filtered} 
              activeId={null}
              onSelect={(id) => navigate(`/chat/${id}`)}
              onMute={toggleMute}
              onArchive={toggleArchive}
              onPin={togglePin}
            />
          </div>

          {/* User footer - desktop only */}
          {!isMobile && (
            <div 
              className="flex items-center gap-3 px-4 py-3 border-t flex-shrink-0"
              style={{ borderColor: COLORS.divider }}
            >
              <Avatar 
                url={profile?.avatar_url} 
                initials={profile?.initials || 'YO'} 
                online={true} 
                size={36} 
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: COLORS.text }}>
                  {profile?.name || 'You'}
                </div>
                <div className="text-xs" style={{ color: COLORS.textMuted }}>
                  {profile?.status || 'Online'}
                </div>
              </div>
              <button 
                onClick={signOut}
                className="text-xs font-medium px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
                style={{ color: COLORS.danger }}
              >
                Log out
              </button>
            </div>
          )}

          {/* Bottom Nav - mobile only, on list view */}
          {isMobile && <BottomNav />}
        </div>

        {/* ===== CHAT WINDOW AREA ===== */}
        <div 
          className={`flex-1 flex flex-col h-full relative
            ${showChatWindow ? 'flex' : 'hidden md:flex'}
          `}
        >
          {/* Mobile: show back button when in chat */}
          {isMobile && isChatRoute && (
            <div 
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0 md:hidden"
              style={{ backgroundColor: COLORS.bgSecondary, borderBottom: `1px solid ${COLORS.divider}` }}
            >
              <button 
                onClick={() => navigate('/')}
                className="p-1 -ml-1 rounded-full hover:bg-black/5"
              >
                <ArrowLeft size={22} color={COLORS.text} />
              </button>
              <span className="text-sm font-medium" style={{ color: COLORS.text }}>Back to chats</span>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <Outlet context={{ userId: user?.id, conversations }} />
          </div>
        </div>

        <CallOverlay />
      </div>
    </CallProvider>
  );
}