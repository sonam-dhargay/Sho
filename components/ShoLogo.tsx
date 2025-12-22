import React from 'react';

export const ShoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes floatLogo {
        0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
        50% { transform: translateY(-12px) rotate(1deg) scale(1.02); }
      }
      .animate-float-logo {
        animation: floatLogo 5s ease-in-out infinite;
      }
      .logo-filter {
        filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.6));
      }
    `}} />
    
    {/* Background Glow */}
    <div className="absolute w-4/5 h-4/5 bg-amber-600/15 blur-[70px] rounded-full animate-pulse" />
    
    <svg viewBox="0 0 400 400" className="w-full h-full animate-float-logo logo-filter relative z-10" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Leather texture effect */}
        <filter id="leather" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" result="noise" />
          <feDiffuseLighting in="noise" lightingColor="#b71c1c" surfaceScale="1">
            <feDistantLight azimuth="45" elevation="35" />
          </feDiffuseLighting>
        </filter>
        <radialGradient id="leatherGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d32f2f" />
          <stop offset="80%" stopColor="#b71c1c" />
          <stop offset="100%" stopColor="#7f0000" />
        </radialGradient>
        <linearGradient id="wood" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8d6e63" />
          <stop offset="50%" stopColor="#5d4037" />
          <stop offset="100%" stopColor="#3e2723" />
        </linearGradient>
      </defs>

      {/* Red Leather Circular Pad (Sho-den) */}
      <ellipse cx="200" cy="280" rx="150" ry="60" fill="url(#leatherGrad)" stroke="#5c0000" strokeWidth="2" />
      <ellipse cx="200" cy="276" rx="145" ry="55" fill="#000" opacity="0.1" filter="url(#leather)" />
      {/* Decorative stitching */}
      <ellipse cx="200" cy="280" rx="138" ry="50" fill="none" stroke="#ffca28" strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />

      {/* Wooden Cup (Sho-khok) */}
      <g transform="translate(220, 160) rotate(-15)">
        {/* Cup Body */}
        <path d="M-65,0 Q-65,-100 0,-100 Q65,-100 65,0 L55,110 Q0,130 -55,110 Z" fill="url(#wood)" stroke="#2d1d19" strokeWidth="3" />
        {/* Cup Interior / Rim */}
        <ellipse cx="0" cy="0" rx="65" ry="30" fill="#2d1d19" />
        <ellipse cx="0" cy="0" rx="60" ry="25" fill="#4e342e" opacity="0.8" />
        {/* Highlights for wood grain */}
        <path d="M-40,20 Q0,40 40,20" fill="none" stroke="#a1887f" strokeWidth="1" opacity="0.3" />
      </g>

      {/* Dice 1 (Showing Red 1 / Para) */}
      <g transform="translate(130, 245) rotate(8)">
        <rect x="-30" y="-30" width="60" height="60" rx="10" fill="#fffdfa" stroke="#d7ccc8" strokeWidth="1" />
        <circle cx="0" cy="0" r="10" fill="#d32f2f" /> {/* Signature Red Ace */}
        <path d="M-30,-30 L30,-30 L30,30 L-30,30 Z" fill="none" stroke="black" opacity="0.05" />
      </g>

      {/* Dice 2 (Showing 4) */}
      <g transform="translate(205, 235) rotate(-12)">
        <rect x="-28" y="-28" width="56" height="56" rx="9" fill="#fffdfa" stroke="#d7ccc8" strokeWidth="1" />
        {/* Four Dots */}
        <circle cx="-14" cy="-14" r="5" fill="#263238" />
        <circle cx="14" cy="-14" r="5" fill="#263238" />
        <circle cx="-14" cy="14" r="5" fill="#263238" />
        <circle cx="14" cy="14" r="5" fill="#263238" />
        <path d="M-28,-28 L28,-28 L28,28 L-28,28 Z" fill="none" stroke="black" opacity="0.05" />
      </g>
    </svg>
  </div>
);
