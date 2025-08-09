import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
  };

  return (
    <div className={`${sizeClasses[size]} aspect-square ${className}`}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="teacherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          
          <linearGradient id="studentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        
        {/* Background Circle */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          fill="#F8FAFC"
          stroke="#E5E7EB"
          strokeWidth="2"
        />
        
        {/* Teacher Figure (Left) */}
        <g transform="translate(18, 30)">
          {/* Teacher Head */}
          <circle cx="12" cy="12" r="7" fill="url(#teacherGradient)"/>
          
          {/* Teacher Body */}
          <rect 
            x="6" 
            y="18" 
            width="12" 
            height="18" 
            rx="6" 
            fill="url(#teacherGradient)" 
            opacity="0.8"
          />
          
          {/* Teacher's Book */}
          <rect 
            x="8" 
            y="28" 
            width="8" 
            height="6" 
            rx="1" 
            fill="white"
          />
          
          {/* Book line */}
          <line x1="9" y1="31" x2="15" y2="31" stroke="url(#teacherGradient)" strokeWidth="1"/>
        </g>
        
        {/* Connection Arrow (Center) */}
        <g transform="translate(40, 45)">
          {/* Arrow */}
          <path 
            d="M5 5 L15 5 L12 2 M15 5 L12 8" 
            stroke="url(#connectionGradient)" 
            strokeWidth="2.5" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Knowledge dots */}
          <circle cx="8" cy="2" r="1.5" fill="url(#connectionGradient)"/>
          <circle cx="11" cy="8" r="1.5" fill="url(#connectionGradient)"/>
        </g>
        
        {/* Student Figure (Right) */}
        <g transform="translate(64, 30)">
          {/* Student Head */}
          <circle cx="12" cy="12" r="6" fill="url(#studentGradient)"/>
          
          {/* Student Body */}
          <rect 
            x="7" 
            y="18" 
            width="10" 
            height="18" 
            rx="5" 
            fill="url(#studentGradient)" 
            opacity="0.8"
          />
          
          {/* Student's Notebook */}
          <rect 
            x="9" 
            y="28" 
            width="6" 
            height="6" 
            rx="1" 
            fill="white"
          />
          
          {/* Notebook line */}
          <line x1="10" y1="31" x2="14" y2="31" stroke="url(#studentGradient)" strokeWidth="1"/>
        </g>
        
        {/* Simple Progress Indicator (Bottom) */}
        <g transform="translate(35, 70)">
          {/* Three progress bars */}
          <rect x="0" y="0" width="6" height="8" rx="3" fill="url(#studentGradient)"/>
          <rect x="8" y="0" width="6" height="12" rx="3" fill="url(#teacherGradient)"/>
          <rect x="16" y="0" width="6" height="10" rx="3" fill="url(#connectionGradient)"/>
          
          {/* Simple connection line */}
          <path 
            d="M3 8 Q11 4 19 10" 
            stroke="url(#connectionGradient)" 
            strokeWidth="1.5" 
            fill="none" 
            opacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
};

export default Logo;