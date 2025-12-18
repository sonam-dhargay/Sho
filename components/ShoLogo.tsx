
import React from 'react';

export const ShoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 80" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
    <defs>
      <linearGradient id="cupGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
    </defs>
    
    {/* Stylized Dice Cup */}
    <path 
      d="M20 10 L80 10 L75 65 C74 72 65 75 50 75 C35 75 26 72 25 65 Z" 
      fill="url(#cupGradient)" 
      stroke="#78350f" 
      strokeWidth="2"
    />
    
    {/* Cup Decoration/Rim */}
    <path d="M20 15 L80 15" stroke="#fef3c7" strokeWidth="1" opacity="0.5" />
    <path d="M25 60 Q50 65 75 60" stroke="#fef3c7" strokeWidth="1" opacity="0.3" />

    {/* Dice Peeking Out */}
    <g transform="translate(32, 22) rotate(-15)">
      <rect width="18" height="18" rx="3" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
      <circle cx="9" cy="9" r="2.5" fill="#ef4444" />
    </g>
    
    <g transform="translate(52, 28) rotate(10)">
      <rect width="18" height="18" rx="3" fill="white" stroke="#d1d5db" strokeWidth="0.5" />
      <circle cx="5" cy="5" r="1.5" fill="#1f2937" />
      <circle cx="13" cy="13" r="1.5" fill="#1f2937" />
      <circle cx="5" cy="13" r="1.5" fill="#1f2937" />
      <circle cx="13" cy="5" r="1.5" fill="#1f2937" />
      <circle cx="9" cy="9" r="1.5" fill="#1f2937" />
    </g>
  </svg>
);
