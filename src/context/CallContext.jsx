import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../hooks/useAuth.js';

const CallContext = createContext(null);

// Free public STUN only — no TURN relay configured. Calls should connect
// fine on most Wi-Fi/open networks, but may fail to connect on strict
// NATs (some mobile carriers, some corporate networks) without a TURN
// server. See project notes for adding one later.
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function CallProvider({ children }) {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const [callState, setCallState] = useState('idle'); // idle | outgoing | incoming | connected
  const [remoteUser, setRemoteUser] = useState(null);
  const [callType, setCallType] = useState('voice'); // voice | video
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);

  const pcRef = useRef(null);
  const myChannelRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callStartRef = useRef(null);
  const isCallerRef = useRef(false);

  // Send a signaling message to another user's dedicated call channel.
  const sendSignal = useCallback(async (toUserId, payload) => {
    const ch = supabase.channel(`calls-${toUserId}`, { config: { broadcast: { self: false } } });
    await new Promise(resolve => ch.subscribe(status => { if (status === 'SUBSCRIBED') resolve(); }));
    await ch.send({ type: 'broadcast', event: 'call-signal', payload });
    setTimeout(() => supabase.removeChannel(ch), 2000);
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.getSenders().forEach(s => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
    callStartRef.current = null;
    setCallState('idle');
    setRemoteUser(null);
  }, [localStream]);

  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(targetUserId, { kind: 'ice', from: userId, candidate: e.candidate });
    };
    pc.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState) && callStartRef.current) {
        // remote end likely dropped
      }
    };
    pcRef.current = pc;
    return pc;
  }, [sendSignal, userId]);

  const logCall = useCallback(async (calleeId, type, status, durationSeconds = 0) => {
    if (!userId) return;
    const { error } = await supabase.from('calls').insert({
      caller_id: userId, callee_id: calleeId, type, status, duration_seconds: durationSeconds,
    });
    if (error) console.error('Log call error:', error);
  }, [userId]);

  const startCall = useCallback(async (target, type) => {
    if (!userId || !target?.id || callState !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      setCallType(type);
      setRemoteUser(target);
      isCallerRef.current = true;
      setCallState('outgoing');

      const pc = createPeerConnection(target.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(target.id, {
        kind: 'offer', from: userId, fromName: profile?.name || 'Someone', fromAvatar: profile?.avatar_url,
        callType: type, sdp: offer,
      });
    } catch (err) {
      console.error('Start call error:', err);
      alert('Could not access camera/microphone. Check your browser permissions.');
      cleanup();
    }
  }, [userId, callState, createPeerConnection, sendSignal, profile, cleanup]);

  const answerCall = useCallback(async () => {
    const offerPayload = pendingOfferRef.current;
    if (!offerPayload) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: offerPayload.callType === 'video' });
      setLocalStream(stream);
      isCallerRef.current = false;

      const pc = createPeerConnection(offerPayload.from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offerPayload.sdp));

      for (const candidate of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { console.error(e); }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal(offerPayload.from, { kind: 'answer', from: userId, sdp: answer });

      callStartRef.current = Date.now();
      setCallState('connected');
    } catch (err) {
      console.error('Answer call error:', err);
      alert('Could not access camera/microphone. Check your browser permissions.');
      sendSignal(offerPayload.from, { kind: 'decline', from: userId });
      cleanup();
    }
  }, [createPeerConnection, sendSignal, userId, cleanup]);

  const declineCall = useCallback(() => {
    const offerPayload = pendingOfferRef.current;
    if (offerPayload) sendSignal(offerPayload.from, { kind: 'decline', from: userId });
    cleanup();
  }, [sendSignal, userId, cleanup]);

  const endCall = useCallback(() => {
    if (remoteUser) sendSignal(remoteUser.id, { kind: 'hangup', from: userId });
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

  // Handle incoming signaling on my own channel
  const handleSignal = useCallback(async (payload) => {
    if (payload.kind === 'offer') {
      if (callState !== 'idle') {
        // busy — auto-decline
        sendSignal(payload.from, { kind: 'decline', from: userId });
        return;
      }
      pendingOfferRef.current = payload;
      setRemoteUser({ id: payload.from, name: payload.fromName, avatar_url: payload.fromAvatar });
      setCallType(payload.callType);
      setCallState('incoming');
    } else if (payload.kind === 'answer') {
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
      if (isCallerRef.current && remoteUser) logCall(remoteUser.id, callType, 'declined', 0);
      cleanup();
    } else if (payload.kind === 'hangup') {
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

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`calls-${userId}`, { config: { broadcast: { self: false } } });
    channel.on('broadcast', { event: 'call-signal' }, ({ payload }) => handleSignalRef.current(payload));
    channel.subscribe();
    myChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
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