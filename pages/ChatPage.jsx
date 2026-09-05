import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/hooks/useAuth.js';
import { useConversations } from '../src/hooks/useConversations.js';
import ChatWindow from '../src/components/chat/ChatWindow.jsx';
import { COLORS } from '../src/utils/constants.js';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, loading, deleteConversation } = useConversations();

  const conv = conversations.find(c => c.id === id);

  // Conversations list is still loading (or just refreshed after creating this
  // conversation) — show a spinner instead of a false "not found" empty state.
  if (!conv && loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: COLORS.primary }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <ChatWindow
        conversation={conv}
        userId={user?.id}
        onBack={() => navigate('/')}
        onDelete={(convId) => {
          deleteConversation(convId);
          navigate('/');
        }}
      />
    </div>
  );
}
