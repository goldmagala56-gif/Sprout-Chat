import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase.js';

const AuthContext = createContext(null);
const HEARTBEAT_MS = 45000; // refresh last_seen every 45s while the tab is active

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef(null);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error) setProfile(data);
    setLoading(false);
  }, []);

  const setOnlineStatus = useCallback(async (uid, online) => {
    if (!uid) return;
    await supabase.from('profiles').update({ online, last_seen: new Date().toISOString() }).eq('id', uid);
  }, []);

  useEffect(() => {
    getCurrentUser().then(u => {
      setUser(u);
      if (u) fetchProfile(u.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Presence: mark online while this tab is active, refresh last_seen periodically,
  // mark offline when the tab is hidden/backgrounded or closed.
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;

    setOnlineStatus(uid, true);
    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') setOnlineStatus(uid, true);
    }, HEARTBEAT_MS);

    const handleVisibility = () => setOnlineStatus(uid, document.visibilityState === 'visible');
    const handleUnload = () => setOnlineStatus(uid, false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      setOnlineStatus(uid, false);
    };
  }, [user?.id, setOnlineStatus]);

  const signUp = useCallback(async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    if (user?.id) await setOnlineStatus(user.id, false);
    await supabase.auth.signOut();
  }, [user?.id, setOnlineStatus]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (error) throw error;
    setProfile(data);
    return data;
  }, [user]);

  const value = { user, profile, loading, signUp, signIn, signOut, updateProfile };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}