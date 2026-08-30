import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { ConversationsProvider } from './context/ConversationsContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ConversationsProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </ConversationsProvider>
    </AuthProvider>
  </React.StrictMode>,
);