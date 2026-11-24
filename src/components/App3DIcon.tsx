import React from 'react';
import avengersPortraitAsset from '../assets/images/avengers_farming_portrait_1794491418229.jpg';

interface App3DIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

export const App3DIcon: React.FC<App3DIconProps> = ({
  size = 'md',
  className = '',
  showBadge = false,
  badgeText = '⚡ HEROES',
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-14 h-14 rounded-2xl',
    lg: 'w-20 h-20 rounded-[22px]',
    xl: 'w-28 h-28 sm:w-32 sm:h-32 rounded-[28px]',
    '2xl': 'w-36 h-36 sm:w-44 sm:h-44 rounded-[32px]',
  }[size];

  return (
    <div
      className={`relative inline-block select-none shrink-0 group ${className}`}
      style={{
        perspective: '700px',
      }}
    >
      {/* 3D Extruded Base Shadow */}
      <div
        className={`absolute inset-0 ${sizeClasses} bg-slate-950 translate-y-1.5 scale-[0.97] blur-[1px] opacity-95`}
      />

      {/* Superhero Golden + Emerald + Cyan Aura Glow */}
      <div
        className={`absolute -inset-1.5 ${sizeClasses} bg-gradient-to-tr from-amber-500/70 via-emerald-400/60 to-sky-400/70 blur-md opacity-85 group-hover:opacity-100 transition-opacity duration-300`}
      />

      {/* Main 3D Beveled Superhero App Icon Frame */}
      <div
        className={`relative ${sizeClasses} overflow-hidden transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.03]`}
        style={{
          transform: 'rotateX(6deg) rotateY(-5deg)',
          boxShadow:
            '0 12px 28px -4px rgba(0, 0, 0, 0.85), 0 4px 0 0 #78350f, inset 0 2px 4px rgba(255, 255, 255, 0.75), inset 0 -3px 6px rgba(0, 0, 0, 0.7)',
          border: '2px solid rgba(251, 191, 36, 0.85)',
        }}
      >
        <img
          src={avengersPortraitAsset}
          alt="Kisan Avengers Farming App Icon"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-[1.08]"
        />

        {/* 3D Specular Top-Left Glass Sheen */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.08) 32%, rgba(255,255,255,0) 58%, rgba(0,0,0,0.42) 100%)',
          }}
        />

        {/* Subtle Inner Golden Rim */}
        <div className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-amber-300/40 pointer-events-none" />
      </div>

      {showBadge && (
        <span
          className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase tracking-wider shadow-lg border-2 border-slate-950 whitespace-nowrap"
          style={{
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.6)',
          }}
        >
          {badgeText}
        </span>
      )}
    </div>
  );
};
