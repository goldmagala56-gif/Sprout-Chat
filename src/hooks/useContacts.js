import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

export function useContacts(userId) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, phone, contact_id, profiles:contact_id(id, initials, avatar_url, bio, online, last_seen, status)')
      .eq('owner_id', userId)
      .order('name', { ascending: true });

    if (error) { console.error('Fetch contacts error:', error); setLoading(false); return; }

    setContacts((data || []).map(row => ({
      rowId: row.id,
      id: row.contact_id,
      registered: !!row.contact_id,
      name: row.name,
      phone: row.phone,
      initials: row.profiles?.initials || row.name?.slice(0, 2).toUpperCase() || '??',
      avatar_url: row.profiles?.avatar_url,
      online: row.profiles?.online || false,
      last_seen: row.profiles?.last_seen,
      bio: row.profiles?.bio,
      status: row.profiles?.status,
    })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`contacts-presence-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new;
        setContacts(prev => prev.map(c => c.id === p.id ? { ...c, online: p.online, last_seen: p.last_seen } : c));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const searchByPhone = useCallback(async (phone) => {
    if (!phone) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, initials, avatar_url, bio, phone, online, status')
      .eq('phone', phone)
      .neq('id', userId)
      .maybeSingle();
    if (error) { console.error('Search by phone error:', error); return null; }
    return data;
  }, [userId]);

  const addContact = useCallback(async (name, phone) => {
    if (!userId || !name?.trim() || !phone?.trim()) return { error: 'Name and phone are required' };
    const matched = await searchByPhone(phone.trim());
    const { error } = await supabase.from('contacts').insert({
      owner_id: userId, name: name.trim(), phone: phone.trim(), contact_id: matched?.id || null,
    });
    if (error) {
      console.error('Add contact error:', error);
      return { error: error.code === '23505' ? 'You already saved this number' : error.message };
    }
    await fetchContacts();
    return { registered: !!matched };
  }, [userId, searchByPhone, fetchContacts]);

  const removeContact = useCallback(async (rowId) => {
    if (!userId) return;
    const { error } = await supabase.from('contacts').delete().eq('id', rowId).eq('owner_id', userId);
    if (error) { console.error('Remove contact error:', error); return; }
    setContacts(prev => prev.filter(c => c.rowId !== rowId));
  }, [userId]);

  return { contacts, loading, fetchContacts, searchByPhone, addContact, removeContact };
}