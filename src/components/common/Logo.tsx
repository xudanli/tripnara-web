import { cn } from '@/lib/utils';
import logoImage from '@/assets/images/logo.png';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'full' | 'icon' | 'text';
  color?: string;
}

export default function Logo({ 
  className, 
  size = 48, 
  variant = 'full',
  color = 'currentColor'
}: LogoProps) {
  if (variant === 'text') {
    return (
      <span className={cn('text-xl font-brand font-bold uppercase', className)}>
        TRIPNARA
      </span>
    );
  }

  // 🆕 使用图片 logo
  const logoIcon = (
    <img 
      src={logoImage}
      alt="TripNARA Logo"
      width={size}
      height={size}
      className={cn('flex-shrink-0 object-contain', variant === 'icon' && className)}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        maxWidth: `${size}px`, 
        maxHeight: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        display: 'block'
      }}
    />
  );

  if (variant === 'icon') {
    return logoIcon;
  }

  // variant === 'full' (icon + text)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {logoIcon}
      <span className="text-xl font-brand font-bold uppercase">TRIPNARA</span>
    </div>
  );
}

