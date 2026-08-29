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
      .select('contact_id, profiles:contact_id(id, name, initials, avatar_url, bio, phone, online, last_seen, status)')
      .eq('owner_id', userId);

    if (!error) setContacts((data || []).map(row => ({ ...row.profiles, id: row.profiles.id })));
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, initials, avatar_url, bio, phone, online, status')
      .ilike('name', `%${query}%`)
      .neq('id', userId)
      .limit(20);
    if (error) return [];
    return (data || []).map(u => ({ ...u, id: u.id }));
  }, [userId]);

  const addContact = useCallback(async (contactId) => {
    if (!userId) return;
    await supabase.from('contacts').insert({ owner_id: userId, contact_id: contactId });
    await fetchContacts();
  }, [userId, fetchContacts]);

  const removeContact = useCallback(async (contactId) => {
    if (!userId) return;
    await supabase.from('contacts').delete().eq('owner_id', userId).eq('contact_id', contactId);
    setContacts(prev => prev.filter(c => c.id !== contactId));
  }, [userId]);

  return { contacts, loading, fetchContacts, searchUsers, addContact, removeContact };
}
