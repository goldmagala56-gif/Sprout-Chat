import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase.js';

const AuthContext = createContext(null);
const HEARTBEAT_MS = 45000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => { profileRef.current = profile; }, [profile]);

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error) setProfile(data);
    setLoading(false);
  }, []);

  // Respects the "Last Seen" privacy setting: when hidden, we always report
  // offline/no-last-seen to other users regardless of actual activity.
  const setOnlineStatus = useCallback(async (uid, online) => {
    if (!uid) return;
    const hideLastSeen = !!profileRef.current?.settings?.lastSeenPrivacy;
    if (hideLastSeen) {
      await supabase.from('profiles').update({ online: false, last_seen: null }).eq('id', uid);
    } else {
      await supabase.from('profiles').update({ online, last_seen: new Date().toISOString() }).eq('id', uid);
    }
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', !!profile?.settings?.darkMode);
  }, [profile?.settings?.darkMode]);

  const signUp = useCallback(async (name, phone, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name, phone } },
    });
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

  const uploadAvatar = useCallback(async (file) => {
    if (!user || !file) return null;
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { console.error('Avatar upload error:', uploadError); throw uploadError; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    return updateProfile({ avatar_url: urlData.publicUrl });
  }, [user, updateProfile]);

  const requestPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + '#/reset-password',
    });
    if (error) throw error;
  }, []);

  const confirmPasswordReset = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const value = {
    user, profile, loading,
    signUp, signIn, signOut, updateProfile,
    uploadAvatar, requestPasswordReset, confirmPasswordReset,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}