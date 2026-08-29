import React from 'react';
import { COLORS } from '../../utils/constants.js';

export default function Avatar({ url, initials, online, size = 48, showRing = false, ringColor = COLORS.primary }) {
  const fontSize = size * 0.36;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {showRing && (
        <div 
          className="absolute -inset-0.5 rounded-full"
          style={{ 
            background: `conic-gradient(${ringColor} 0deg, ${COLORS.accent} 180deg, ${ringColor} 360deg)`,
            padding: 2,
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </div>
      )}
      {url ? (
        <img 
          src={url} 
          alt={initials}
          className="w-full h-full rounded-full object-cover"
          style={{ border: showRing ? '2px solid white' : 'none' }}
        />
      ) : (
        <div 
          className="w-full h-full rounded-full flex items-center justify-center font-semibold"
          style={{ 
            backgroundColor: COLORS.primary, 
            color: COLORS.textInverse,
            fontSize,
            border: showRing ? '2px solid white' : 'none',
          }}
        >
          {initials}
        </div>
      )}
      {online && (
        <div 
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{ 
            width: size * 0.28, 
            height: size * 0.28, 
            backgroundColor: COLORS.online,
            borderColor: COLORS.bg,
          }}
        />
      )}
    </div>
  );
}
