import React from 'react';

export const ShoLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          50% { transform: translateY(-12px) scale(1.03) rotate(1deg); }
        }
        .animate-float-logo {
          animation: floatLogo 5s ease-in-out infinite;
        }
      `}} />
      
      {/* Decorative Glow Backdrop */}
      <div className="absolute w-4/5 h-4/5 bg-amber-600/10 blur-[60px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 animate-float-logo">
        <img 
          src="sho_logo.png" 
          alt="Sho Cup and Dice"
          className="w-full h-auto object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
        />
        {/* Decorative Tibetan Character Overlay */}
        <div className="absolute inset-0 flex items-center justify-center text-amber-500 font-cinzel text-6xl font-bold opacity-10 pointer-events-none select-none">
           ཤོ
        </div>
      </div>
    </div>
  );
};
