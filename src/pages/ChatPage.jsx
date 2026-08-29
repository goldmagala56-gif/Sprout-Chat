import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useConversations } from '../hooks/useConversations.js';
import ChatWindow from '../components/chat/ChatWindow.jsx';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, deleteConversation } = useConversations(user?.id);

  const conv = conversations.find(c => c.id === id);

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
