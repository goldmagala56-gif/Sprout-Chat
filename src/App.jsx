import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import AppShell from './components/layout/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ChatsPage from './pages/ChatsPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import NewChatPage from './pages/NewChatPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import JoinGroupPage from './pages/JoinGroupPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#146C43' }} />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/join/:code" element={<JoinGroupPage />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<ChatsPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/new-chat" element={<NewChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
      </Route>
    </Routes>
  );
}