import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';

const CallContext = createContext(null);

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const RING_TIMEOUT_MS = 45000;
const DROP_GRACE_MS = 6000;

export function CallProvider({ children }) {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const [callState, setCallState] = useState('idle'); // idle | outgoing | incoming | connected
  const [remoteUser, setRemoteUser] = useState(null);
  const [callType, setCallType] = useState('voice');
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef(null);
  const myChannelRef = useRef(null);
  const outboundChannelRef = useRef(null); // persistent channel to the other party, open for the call's duration
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callStartRef = useRef(null);
  const isCallerRef = useRef(false);
  const ringTimeoutRef = useRef(null);
  const dropTimeoutRef = useRef(null);

  // Opens (or reuses) a single outbound channel to the other party for
  // this call's whole lifetime, instead of creating one per signal —
  // repeated channel churn per ICE candidate was unreliable.
  const openOutboundChannel = useCallback(async (toUserId) => {
    if (outboundChannelRef.current) return outboundChannelRef.current;
    const ch = supabase.channel(`calls-${toUserId}`, { config: { broadcast: { self: false } } });
    await new Promise(resolve => ch.subscribe(status => { if (status === 'SUBSCRIBED') resolve(); }));
    outboundChannelRef.current = ch;
    return ch;
  }, []);

  const sendSignal = useCallback((payload) => {
    outboundChannelRef.current?.send({ type: 'broadcast', event: 'call-signal', payload });
  }, []);

  const clearTimers = () => {
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    if (dropTimeoutRef.current) { clearTimeout(dropTimeoutRef.current); dropTimeoutRef.current = null; }
  };

  const cleanup = useCallback(() => {
    clearTimers();
    pcRef.current?.getSenders().forEach(s => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    if (outboundChannelRef.current) { supabase.removeChannel(outboundChannelRef.current); outboundChannelRef.current = null; }
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    callStartRef.current = null;
    setCallState('idle');
    setRemoteUser(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream]);

  const logCall = useCallback(async (calleeId, type, status, durationSeconds = 0) => {
    if (!userId) return;
    const { error } = await supabase.from('calls').insert({
      caller_id: userId, callee_id: calleeId, type, status, duration_seconds: durationSeconds,
    });
    if (error) console.error('Log call error:', error);
  }, [userId]);

  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ kind: 'ice', from: userId, candidate: e.candidate });
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed'].includes(pc.connectionState)) {
        // Give the connection a short grace period to recover (brief network
        // blips) before treating it as a real drop and ending the call.
        if (dropTimeoutRef.current) clearTimeout(dropTimeoutRef.current);
        dropTimeoutRef.current = setTimeout(() => {
          if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
            handleDrop();
          }
        }, DROP_GRACE_MS);
      } else if (pc.connectionState === 'connected' && dropTimeoutRef.current) {
        clearTimeout(dropTimeoutRef.current);
        dropTimeoutRef.current = null;
      }
    };
    pcRef.current = pc;
    return pc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendSignal, userId]);

  // Called when the connection is confirmed lost (not via an explicit hangup signal).
  const handleDrop = useCallback(() => {
    setRemoteUser(current => {
      if (isCallerRef.current && current) {
        const status = callStartRef.current ? 'completed' : 'missed';
        const duration = callStartRef.current ? Math.round((Date.now() - callStartRef.current) / 1000) : 0;
        logCall(current.id, callType, status, duration);
      }
      return current;
    });
    cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callType, logCall, cleanup]);

  const startCall = useCallback(async (target, type) => {
    if (!userId || !target?.id || callState !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      setCallType(type);
      setRemoteUser(target);
      isCallerRef.current = true;
      setCallState('outgoing');

      await openOutboundChannel(target.id);
      const pc = createPeerConnection(target.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({
        kind: 'offer', from: userId, fromName: profile?.name || 'Someone', fromAvatar: profile?.avatar_url,
        callType: type, sdp: offer,
      });

      ringTimeoutRef.current = setTimeout(() => {
        // No answer/decline within the timeout — treat as unanswered.
        sendSignal({ kind: 'hangup', from: userId });
        logCall(target.id, type, 'missed', 0);
        cleanup();
      }, RING_TIMEOUT_MS);
    } catch (err) {
      console.error('Start call error:', err);
      alert('Could not access camera/microphone. Check your browser permissions.');
      cleanup();
    }
  }, [userId, callState, openOutboundChannel, createPeerConnection, sendSignal, profile, logCall, cleanup]);

  const answerCall = useCallback(async () => {
    const offerPayload = pendingOfferRef.current;
    if (!offerPayload) return;
    clearTimers();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: offerPayload.callType === 'video' });
      setLocalStream(stream);
      isCallerRef.current = false;

      await openOutboundChannel(offerPayload.from);
      const pc = createPeerConnection(offerPayload.from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp));

      for (const candidate of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error(e); }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ kind: 'answer', from: userId, sdp: answer });

      callStartRef.current = Date.now();
      setCallState('connected');
    } catch (err) {
      console.error('Answer call error:', err);
      alert('Could not access camera/microphone. Check your browser permissions.');
      sendSignal({ kind: 'decline', from: userId });
      cleanup();
    }
  }, [openOutboundChannel, createPeerConnection, sendSignal, userId, cleanup]);

  const declineCall = useCallback(() => {
    const offerPayload = pendingOfferRef.current;
    if (offerPayload) sendSignal({ kind: 'decline', from: userId });
    cleanup();
  }, [sendSignal, userId, cleanup]);

  const endCall = useCallback(() => {
    if (remoteUser) sendSignal({ kind: 'hangup', from: userId });
    if (isCallerRef.current && remoteUser) {
      const status = callStartRef.current ? 'completed' : 'missed';
      const duration = callStartRef.current ? Math.round((Date.now() - callStartRef.current) / 1000) : 0;
      logCall(remoteUser.id, callType, status, duration);
    }
    cleanup();
  }, [remoteUser, sendSignal, userId, callType, logCall, cleanup]);

  const toggleMute = useCallback(() => {
    if (!localStream) return;
    const enabled = muted;
    localStream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    setMuted(!enabled);
  }, [localStream, muted]);

  const handleSignal = useCallback(async (payload) => {
    if (payload.kind === 'offer') {
      if (callState !== 'idle') {
        sendSignal({ kind: 'decline', from: userId }); // busy — but wrong channel since outbound not open to them yet
        return;
      }
      pendingOfferRef.current = payload;
      setRemoteUser({ id: payload.from, name: payload.fromName, avatar_url: payload.fromAvatar });
      setCallType(payload.callType);
      setCallState('incoming');
    } else if (payload.kind === 'answer') {
      clearTimers();
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const candidate of pendingCandidatesRef.current) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error(e); }
        }
        pendingCandidatesRef.current = [];
        callStartRef.current = Date.now();
        setCallState('connected');
      }
    } else if (payload.kind === 'ice') {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.error(e); }
      } else {
        pendingCandidatesRef.current.push(payload.candidate);
      }
    } else if (payload.kind === 'decline') {
      clearTimers();
      if (isCallerRef.current && remoteUser) logCall(remoteUser.id, callType, 'declined', 0);
      cleanup();
    } else if (payload.kind === 'hangup') {
      clearTimers();
      if (isCallerRef.current && remoteUser) {
        const status = callStartRef.current ? 'completed' : 'missed';
        const duration = callStartRef.current ? Math.round((Date.now() - callStartRef.current) / 1000) : 0;
        logCall(remoteUser.id, callType, status, duration);
      }
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callState, userId, sendSignal, cleanup, remoteUser, callType, logCall]);

  const handleSignalRef = useRef(handleSignal);
  useEffect(() => { handleSignalRef.current = handleSignal; }, [handleSignal]);

  // Fix for the busy-decline case above: when we're busy, the offer sender's
  // outbound channel targets US, not them — we can't reply on our own
  // inbound channel. Open a short-lived reply channel just for the decline.
  const declineBusy = useCallback(async (toUserId) => {
    const ch = supabase.channel(`calls-${toUserId}`, { config: { broadcast: { self: false } } });
    await new Promise(resolve => ch.subscribe(status => { if (status === 'SUBSCRIBED') resolve(); }));
    await ch.send({ type: 'broadcast', event: 'call-signal', payload: { kind: 'decline', from: userId } });
    setTimeout(() => supabase.removeChannel(ch), 1500);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`calls-${userId}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'call-signal' }, ({ payload }) => {
      if (payload.kind === 'offer' && callState !== 'idle') {
        declineBusy(payload.from);
        return;
      }
      handleSignalRef.current(payload);
    });
    channel.subscribe();
    myChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value = {
    callState, remoteUser, callType, localStream, remoteStream, muted,
    startCall, answerCall, declineCall, endCall, toggleMute,
  };
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}