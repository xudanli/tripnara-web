import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface WebsiteSectionProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'muted' | 'accent';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const variantClasses = {
  default: 'bg-background',
  muted: 'bg-muted/30',
  accent: 'bg-primary/5',
};

const paddingClasses = {
  sm: 'py-8 px-4',
  md: 'py-12 px-6',
  lg: 'py-16 px-8',
  xl: 'py-24 px-8',
};

const maxWidthClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function WebsiteSection({
  children,
  className,
  variant = 'default',
  padding = 'xl',
  maxWidth = '2xl',
}: WebsiteSectionProps) {
  return (
    <section className={cn(variantClasses[variant], paddingClasses[padding], className)}>
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {children}
      </div>
    </section>
  );
}
