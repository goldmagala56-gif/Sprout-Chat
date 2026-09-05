import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const VAPID_PUBLIC_KEY = 'BHKQGdja7POShea21tCsvZLQTErpkN46ZCgOKpPSKIztAKLmakkaxcO6jL6jqMf0AMDbFljUwSarwwV2A1IW9aU';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications(userId) {
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkExisting = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
  }, []);

  useEffect(() => { checkExisting(); }, [checkExisting]);

  const subscribe = useCallback(async () => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    setLoading(true);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setPermission('denied');
        setLoading(false);
        return false;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return false; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      // Matches the actual push_subscriptions schema: endpoint/p256dh/auth_key,
      // unique on (user_id, endpoint) — each device's subscription already has
      // its own distinct endpoint, so no separate device_id is needed.
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
      }, { onConflict: 'user_id,endpoint' });

      if (error) { console.error('Save push subscription error:', error); setLoading(false); return false; }
      setSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      setLoading(false);
      return false;
    }
  }, [userId]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { permission, subscribed, loading, subscribe, unsubscribe };
}

