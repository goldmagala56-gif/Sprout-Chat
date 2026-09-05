import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ChatWindow from '../components/chat/ChatWindow.jsx';

export default function ChatsPage() {
  const { userId, conversations } = useOutletContext();

  return (
    <div className="flex flex-col h-full w-full">
      <ChatWindow 
        conversation={null} 
        userId={userId}
        onBack={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}

