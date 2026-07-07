import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  travelStatusSectionBody,
  travelStatusSectionDescription,
  travelStatusSectionHeader,
  travelStatusSectionShellCompact,
  travelStatusSectionTitle,
} from './travel-status-ui';

interface TravelStatusSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  compact?: boolean;
}

export default function TravelStatusSection({
  title,
  description,
  action,
  children,
  className,
  id,
  compact = false,
}: TravelStatusSectionProps) {
  return (
    <section id={id} className={cn(travelStatusSectionShellCompact, compact && 'shadow-none', className)}>
      <div className={cn(travelStatusSectionHeader, compact && 'px-3 py-2')}>
        <div className="min-w-0 flex-1">
          <h2 className={travelStatusSectionTitle}>{title}</h2>
          {description ? <p className={travelStatusSectionDescription}>{description}</p> : null}
        </div>
        {action}
      </div>
      <div className={cn(travelStatusSectionBody, compact && 'px-3 py-2.5')}>{children}</div>
    </section>
  );
}
