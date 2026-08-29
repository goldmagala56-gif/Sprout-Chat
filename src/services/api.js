const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('sprout_token');
}

async function fetchWithAuth(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email, password) => fetchWithAuth(`${API_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (name, email, password) => fetchWithAuth(`${API_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  }),
  getMe: () => fetchWithAuth(`${API_URL}/auth/me`),
  updateProfile: (data) => fetchWithAuth(`${API_URL}/auth/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  logout: () => fetchWithAuth(`${API_URL}/auth/logout`, { method: 'POST' }),
  searchUsers: (q) => fetchWithAuth(`${API_URL}/auth/search?q=${encodeURIComponent(q)}`),
  getContacts: () => fetchWithAuth(`${API_URL}/auth/contacts`),
  addContact: (contactId) => fetchWithAuth(`${API_URL}/auth/contacts`, {
    method: 'POST',
    body: JSON.stringify({ contactId }),
  }),
  removeContact: (id) => fetchWithAuth(`${API_URL}/auth/contacts/${id}`, { method: 'DELETE' }),
  getConversations: () => fetchWithAuth(`${API_URL}/conversations`),
  createDirect: (userId) => fetchWithAuth(`${API_URL}/conversations/direct`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  }),
  createGroup: (name, members) => fetchWithAuth(`${API_URL}/conversations/group`, {
    method: 'POST',
    body: JSON.stringify({ name, members }),
  }),
  deleteConversation: (id) => fetchWithAuth(`${API_URL}/conversations/${id}`, { method: 'DELETE' }),
  getMessages: (conversationId) => fetchWithAuth(`${API_URL}/messages/${conversationId}`),
  sendMessage: (data) => fetchWithAuth(`${API_URL}/messages`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
