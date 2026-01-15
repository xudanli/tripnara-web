import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface WebsiteHeadingProps {
  children: ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4;
  align?: 'left' | 'center' | 'right';
}

const headingClasses = {
  1: 'text-4xl md:text-5xl lg:text-6xl font-bold',
  2: 'text-3xl md:text-4xl lg:text-5xl font-bold',
  3: 'text-2xl md:text-3xl font-semibold',
  4: 'text-xl md:text-2xl font-semibold',
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function WebsiteHeading({
  children,
  className,
  level = 2,
  align = 'left',
}: WebsiteHeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag className={cn(headingClasses[level], alignClasses[align], className)}>
      {children}
    </Tag>
  );
}
