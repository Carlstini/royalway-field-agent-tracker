import React from 'react';
// @ts-ignore
import royalwayLogo from './royalway_logo_1782720227166.jpg';

interface RoyalwayLogoProps {
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inverse?: boolean;
}

export default function RoyalwayLogo({
  variant = 'horizontal',
  size = 'md',
  className = '',
  inverse = false,
}: RoyalwayLogoProps) {
  // Determine sizing classes for the image container
  const sizeClasses = {
    sm: 'h-7',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-24',
  };

  const logoUrl = royalwayLogo;

  // If inverse is true (e.g. on a dark background like bg-slate-900),
  // we place the white-background logo inside a high-contrast white rounded badge/pill to look clean and professional.
  const logoImg = (
    <img
      src={logoUrl}
      alt="Royalway Media Logo"
      className={`object-contain max-w-full rounded-md ${sizeClasses[size]}`}
      referrerPolicy="no-referrer"
    />
  );

  if (inverse) {
    return (
      <div className={`inline-flex items-center bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-200/50 ${className}`}>
        {logoImg}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      {logoImg}
    </div>
  );
}
