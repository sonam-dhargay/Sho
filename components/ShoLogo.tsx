import React from 'react';

export const ShoLogo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          50% { transform: translateY(-15px) scale(1.02) rotate(1deg); }
        }
        .animate-float-logo {
          animation: floatLogo 5s ease-in-out infinite;
        }
        .logo-glow {
          filter: drop-shadow(0 0 40px rgba(217, 119, 6, 0.2));
        }
      `}} />
      
      {/* Subtle Glow Backdrop */}
      <div className="absolute w-4/5 h-4/5 bg-amber-600/5 blur-[60px] rounded-full" />
      
      {/* Main Asset */}
      <div className="relative z-10 animate-float-logo logo-glow">
        <img 
          src="https://raw.githubusercontent.com/tibetdev/sho-assets/main/sho_cup_dice.png" 
          alt="Sho Cup and Dice"
          className="w-full h-auto object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
          onError={(e) => {
            // Fallback to text if asset is unreachable
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    </div>
  );
};