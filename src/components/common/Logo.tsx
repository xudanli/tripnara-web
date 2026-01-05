import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'full' | 'icon' | 'text';
  color?: string;
}

export default function Logo({ 
  className, 
  size = 24, 
  variant = 'full',
  color = 'currentColor'
}: LogoProps) {
  if (variant === 'text') {
    return (
      <span className={cn('text-xl font-brand uppercase', className)}>
        TRIPNARA
      </span>
    );
  }

  const iconSvg = (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', variant === 'icon' && className)}
    >
      <path d="M50 20V80" stroke={color} strokeWidth="1.5" strokeLinecap="square"/>
      <path d="M35 35L50 20L65 35" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"/>
      <path d="M50 45H65V60L50 75L35 60V45H50" stroke={color} strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" opacity="0.8"/>
      <circle cx="50" cy="20" r="1.5" fill={color}/>
    </svg>
  );

  if (variant === 'icon') {
    return iconSvg;
  }

  // variant === 'full' (icon + text)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {iconSvg}
      <span className="text-xl font-brand uppercase">TRIPNARA</span>
    </div>
  );
}

