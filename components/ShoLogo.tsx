
import React from 'react';

export const ShoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 240 160" className={className} xmlns="http://www.w3.org/2000/svg" fill="none">
    <defs>
      {/* Wood Texture Gradient */}
      <radialGradient id="woodTexture" cx="0.4" cy="0.4" r="0.8">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="50%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </radialGradient>
      
      {/* Deep Inner Bowl Gradient */}
      <radialGradient id="bowlInnerDepth" cx="0.5" cy="0.4" r="0.7">
         <stop offset="50%" stopColor="#451a03" />
         <stop offset="90%" stopColor="#2a1205" />
         <stop offset="100%" stopColor="#0f0501" />
      </radialGradient>

      {/* Shell Gloss Gradient */}
      <radialGradient id="shellLuster" cx="0.3" cy="0.3" r="0.8">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#f3f4f6" />
        <stop offset="100%" stopColor="#d1d5db" />
      </radialGradient>

      {/* Pad Texture */}
      <radialGradient id="padGradient" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#e5e7eb" />
        <stop offset="100%" stopColor="#9ca3af" />
      </radialGradient>
      
      {/* Soft Drop Shadow */}
      <filter id="dropShadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/>
        <feOffset dx="2" dy="3" result="offsetblur"/>
        <feComponentTransfer>
           <feFuncA type="linear" slope="0.3"/>
        </feComponentTransfer>
        <feMerge> 
          <feMergeNode in="offsetblur"/>
          <feMergeNode in="SourceGraphic"/> 
        </feMerge>
      </filter>

      {/* Inner Shadow for Bowl Lip */}
      <filter id="innerLipShadow">
         <feOffset dx="0" dy="2"/>
         <feGaussianBlur stdDeviation="1.5" result="offset-blur"/>
         <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
         <feFlood floodColor="black" floodOpacity="0.5" result="color"/>
         <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
         <feComposite operator="over" in="shadow" in2="SourceGraphic"/> 
      </filter>
    </defs>

    {/* Pad (Grey with Blue Rim) - Tilted Perspective */}
    <g transform="translate(120, 100) scale(1, 0.6)">
        <circle cx="0" cy="0" r="95" fill="url(#padGradient)" stroke="#1e40af" strokeWidth="6" />
        <circle cx="0" cy="0" r="90" fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.6"/>
    </g>

    {/* 3D Wooden Bowl */}
    <g transform="translate(65, 70)" filter="url(#dropShadow)">
        {/* Main Body */}
        <circle cx="0" cy="0" r="42" fill="url(#woodTexture)" stroke="#78350f" strokeWidth="1" />
        
        {/* Wood Rings for Texture */}
        <circle cx="0" cy="0" r="38" fill="none" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
        <circle cx="0" cy="0" r="34" fill="none" stroke="#92400e" strokeWidth="0.5" opacity="0.4" />
        
        {/* Top Rim Highlight */}
        <circle cx="0" cy="0" r="35" fill="none" stroke="#fbbf24" strokeWidth="3" opacity="0.15" />

        {/* Inner Hollow */}
        <circle cx="0" cy="0" r="32" fill="url(#bowlInnerDepth)" stroke="#451a03" strokeWidth="1" filter="url(#innerLipShadow)" />
        
        {/* Specular Highlight on rim */}
        <path d="M -25 -22 Q 0 -38 25 -22" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" fill="none" />
    </g>

    {/* Realistic Cowrie Shells Pile */}
    <g transform="translate(160, 105) scale(0.85)" filter="url(#dropShadow)">
        
        {/* Shell 1 - Underside View (Toothed Slit) */}
        <g transform="translate(0, 20) rotate(15)">
            <path d="M -12 0 Q -12 -18 0 -18 Q 12 -18 12 0 Q 12 18 0 18 Q -12 18 -12 0" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="0.5" />
            {/* The Slit */}
            <path d="M -1 -12 Q 4 0 -1 12 Q -6 0 -1 -12 Z" fill="#4b5563" />
            <path d="M -1 -12 L -1 12" stroke="#d1d5db" strokeWidth="1" opacity="0.5"/>
            {/* Teeth */}
            <line x1="-3" y1="-8" x2="1" y2="-8" stroke="#d1d5db" strokeWidth="1" />
            <line x1="-4" y1="-4" x2="2" y2="-4" stroke="#d1d5db" strokeWidth="1" />
            <line x1="-4" y1="0" x2="2" y2="0" stroke="#d1d5db" strokeWidth="1" />
            <line x1="-4" y1="4" x2="2" y2="4" stroke="#d1d5db" strokeWidth="1" />
            <line x1="-3" y1="8" x2="1" y2="8" stroke="#d1d5db" strokeWidth="1" />
        </g>
        
        {/* Shell 2 - Top View (Domed) */}
        <g transform="translate(-18, 5) rotate(-35)">
            <path d="M -11 0 Q -11 -16 0 -16 Q 11 -16 11 0 Q 11 16 0 16 Q -11 16 -11 0" fill="url(#shellLuster)" stroke="#9ca3af" strokeWidth="0.5" />
            <ellipse cx="-4" cy="-6" rx="3" ry="2" fill="white" opacity="0.7" />
        </g>
        
        {/* Shell 3 - Side View */}
        <g transform="translate(18, 0) rotate(50)">
            <path d="M -10 0 C -10 -15, 10 -15, 10 0 C 10 15, -10 15, -10 0" fill="url(#shellLuster)" stroke="#9ca3af" strokeWidth="0.5" />
        </g>

        {/* Shell 4 - Top View (Top of pile) */}
        <g transform="translate(0, -15) rotate(-10)">
            <path d="M -11 0 Q -11 -16 0 -16 Q 11 -16 11 0 Q 11 16 0 16 Q -11 16 -11 0" fill="url(#shellLuster)" stroke="#9ca3af" strokeWidth="0.5" />
            <ellipse cx="-5" cy="-5" rx="4" ry="2.5" fill="white" opacity="0.8" />
        </g>
    </g>

    {/* Dice 1 (Red Ace) - Rounded Cube */}
    <g transform="translate(95, 120) rotate(-20)" filter="url(#dropShadow)">
        <rect x="-13" y="-13" width="26" height="26" rx="6" fill="#fefce8" stroke="#d6d3d1" strokeWidth="0.5" />
        <circle cx="0" cy="0" r="5.5" fill="#dc2626" />
        {/* Highlight for 3D bevel */}
        <path d="M -8 -11 L 8 -11" stroke="white" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
        <path d="M -11 -8 L -11 8" stroke="white" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
        <circle cx="-3" cy="-3" r="1.5" fill="white" opacity="0.5" />
    </g>

    {/* Dice 2 (Six) */}
    <g transform="translate(135, 115) rotate(20)" filter="url(#dropShadow)">
        <rect x="-13" y="-13" width="26" height="26" rx="6" fill="#fefce8" stroke="#d6d3d1" strokeWidth="0.5" />
        <g fill="#171717">
             <circle cx="-6.5" cy="-6.5" r="2.2" />
             <circle cx="-6.5" cy="0" r="2.2" />
             <circle cx="-6.5" cy="6.5" r="2.2" />
             <circle cx="6.5" cy="-6.5" r="2.2" />
             <circle cx="6.5" cy="0" r="2.2" />
             <circle cx="6.5" cy="6.5" r="2.2" />
        </g>
        {/* Highlight */}
        <path d="M -8 -11 L 8 -11" stroke="white" strokeWidth="2" opacity="0.4" strokeLinecap="round"/>
    </g>

    {/* Leather Strap Detail on Pad */}
    <path d="M 60 115 Q 70 108 80 118" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
  </svg>
);
