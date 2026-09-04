import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon } from 'lucide-react';
import Avatar from '../ui/Avatar.jsx';
import { COLORS } from '../../utils/constants.js';
import { useCall } from '../../context/CallContext.jsx';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CallOverlay() {
  const { callState, remoteUser, callType, localStream, remoteStream, muted, answerCall, declineCall, endCall, toggleMute } = useCall();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream || null;
  }, [localStream]);

  useEffect(() => {
    if (callType === 'video' && remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream || null;
    if (callType === 'voice' && remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream || null;
  }, [remoteStream, callType]);

  useEffect(() => {
    if (callState !== 'connected') { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  if (callState === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: '#111827' }}>
      {callType === 'video' && callState === 'connected' && (
        <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      )}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 relative">
        {(callType === 'voice' || callState !== 'connected') && (
          <>
            <Avatar url={remoteUser?.avatar_url} initials={remoteUser?.name?.slice(0, 2).toUpperCase() || '??'} size={100} />
            <div className="text-center">
              <div className="text-xl font-semibold text-white">{remoteUser?.name || 'Unknown'}</div>
              <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {callState === 'outgoing' && 'Calling...'}
                {callState === 'incoming' && `Incoming ${callType} call...`}
                {callState === 'connected' && formatDuration(elapsed)}
              </div>
            </div>
          </>
        )}

        {callType === 'video' && callState === 'connected' && localStream && (
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-4 w-24 h-32 rounded-lg object-cover shadow-lg" style={{ border: '2px solid white' }} />
        )}
      </div>

      <div className="flex items-center justify-center gap-6 pb-10 pt-4 flex-shrink-0">
        {callState === 'incoming' ? (
          <>
            <button onClick={declineCall} className="flex items-center justify-center rounded-full" style={{ width: 60, height: 60, backgroundColor: '#DC2626' }}>
              <PhoneOff size={24} color="white" />
            </button>
            <button onClick={answerCall} className="flex items-center justify-center rounded-full" style={{ width: 60, height: 60, backgroundColor: '#16A34A' }}>
              {callType === 'video' ? <VideoIcon size={24} color="white" /> : <Phone size={24} color="white" />}
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} className="flex items-center justify-center rounded-full" style={{ width: 52, height: 52, backgroundColor: muted ? 'white' : 'rgba(255,255,255,0.15)' }}>
              {muted ? <MicOff size={20} color={COLORS.text} /> : <Mic size={20} color="white" />}
            </button>
            <button onClick={endCall} className="flex items-center justify-center rounded-full" style={{ width: 60, height: 60, backgroundColor: '#DC2626' }}>
              <PhoneOff size={24} color="white" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}