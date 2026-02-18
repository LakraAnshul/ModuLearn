import React from 'react';

const colors = {
  peach: '#f58a67',
  zinc900: '#18181b',
  zinc800: '#27272a',
  zinc500: '#71717a',
  zinc100: '#f4f4f5',
};

// Hero Illustration: A student with floating learning modules
export const MainIllustration = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden rounded-[40px] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 ${className}`}>
    <svg viewBox="0 0 500 500" className="w-full h-full p-8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="250" cy="250" r="180" fill={colors.peach} fillOpacity="0.05" />
      <rect x="350" y="100" width="80" height="80" rx="20" fill={colors.peach} fillOpacity="0.1" className="animate-float" />
      <circle cx="100" cy="400" r="40" fill={colors.zinc900} fillOpacity="0.05" className="animate-float-delayed" />
      <g transform="translate(150, 180)">
        <path d="M50 150 Q50 100 100 100 T150 150 V250 H50 V150Z" fill={colors.zinc900} className="dark:fill-zinc-700" />
        <circle cx="100" cy="60" r="35" fill="#FFD2B1" />
        <path d="M65 60 Q65 25 100 25 T135 60 Q135 75 125 80 L75 80 Q65 75 65 60Z" fill={colors.zinc900} />
        <path d="M120 180 H220 L230 230 H110 L120 180Z" fill={colors.zinc800} />
        <rect x="130" y="190" width="80" height="30" fill={colors.peach} fillOpacity="0.2" />
      </g>
      <g className="animate-float">
        <rect x="320" y="220" width="100" height="60" rx="12" fill="white" className="dark:fill-zinc-800 shadow-lg" />
        <rect x="335" y="235" width="40" height="6" rx="3" fill={colors.peach} />
        <rect x="335" y="250" width="70" height="4" rx="2" fill={colors.zinc100} className="dark:fill-zinc-700" />
      </g>
    </svg>
  </div>
);

export const OnboardingWelcomeIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="200" cy="200" r="140" fill={colors.peach} fillOpacity="0.1" />
    <g transform="translate(120, 120)">
      <rect x="0" y="20" width="160" height="120" rx="12" fill={colors.zinc900} className="dark:fill-zinc-800" />
      <rect x="20" y="40" width="120" height="10" rx="5" fill={colors.peach} />
      <rect x="20" y="60" width="80" height="10" rx="5" fill={colors.zinc100} fillOpacity="0.2" />
      <circle cx="140" cy="120" r="30" fill={colors.peach} fillOpacity="0.2" className="animate-pulse" />
      <path d="M130 120 L150 120 M140 110 V130" stroke={colors.peach} strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

export const EducationLevelIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(80, 100)">
      {/* School Hat */}
      <path d="M40 80 L100 50 L160 80 L100 110 Z" fill={colors.zinc900} className="dark:fill-zinc-800" />
      <path d="M160 80 V120" stroke={colors.zinc900} strokeWidth="4" className="dark:stroke-zinc-800" />
      <circle cx="160" cy="125" r="8" fill={colors.peach} />
      {/* Books */}
      <rect x="180" y="100" width="60" height="80" rx="8" fill={colors.peach} fillOpacity="0.2" transform="rotate(10)" className="animate-float" />
      <rect x="200" y="90" width="60" height="80" rx="8" fill={colors.peach} transform="rotate(-5)" className="animate-float-delayed" />
    </g>
  </svg>
);

export const ReadingIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="200" cy="200" r="150" fill={colors.peach} fillOpacity="0.05" />
    <g transform="translate(100, 100)">
      <path d="M40 180 Q20 180 20 160 V100 H180 V160 Q180 180 160 180 H40Z" fill={colors.zinc800} />
      <circle cx="100" cy="60" r="25" fill="#FFD2B1" />
      <path d="M75 90 H125 L140 160 H60 L75 90Z" fill={colors.peach} />
      <rect x="80" y="110" width="40" height="30" rx="4" fill="white" className="animate-pulse-soft" />
    </g>
  </svg>
);

export const RobotIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <rect x="60" y="50" width="80" height="70" rx="15" fill={colors.zinc900} className="dark:fill-zinc-800" />
      <circle cx="85" cy="80" r="6" fill={colors.peach} className="animate-pulse" />
      <circle cx="115" cy="80" r="6" fill={colors.peach} className="animate-pulse" />
      <rect x="80" y="100" width="40" height="4" rx="2" fill={colors.zinc500} />
      <path d="M100 50 V30 M100 30 L90 20 M100 30 L110 20" stroke={colors.zinc500} strokeWidth="3" strokeLinecap="round" />
    </g>
  </svg>
);

export const SuccessIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 350 L150 250 L250 300 L350 150" stroke={colors.peach} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="350" cy="150" r="15" fill={colors.peach} className="animate-pulse" />
  </svg>
);

export const IdeaIllustration = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="80" r="40" fill={colors.peach} fillOpacity="0.1" />
    <path d="M100 130 V110 M80 85 Q80 50 100 50 T120 85 Q120 100 110 110 H90 Q80 100 80 85Z" stroke={colors.peach} strokeWidth="4" />
    <path d="M90 125 H110" stroke={colors.peach} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const VideoIllustration = MainIllustration;
export const MathIllustration = IdeaIllustration;
export const ModuleIllustration = ({ color = "#f58a67" }) => (
  <svg viewBox="0 0 100 100" className="w-12 h-12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="20" y="20" width="60" height="60" rx="12" stroke={color} strokeWidth="6" className="animate-pulse-soft" />
    <path d="M40 50 H60 M50 40 V60" stroke={color} strokeWidth="6" strokeLinecap="round" />
  </svg>
);
