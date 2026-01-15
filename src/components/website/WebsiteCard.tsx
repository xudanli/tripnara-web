import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactNode } from 'react';

interface WebsiteCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function WebsiteCard({ children, className, hover = false, onClick }: WebsiteCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        hover && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
        className
      )}
      onClick={onClick}
    >
      {children}
    </Card>
  );
}

export { CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
