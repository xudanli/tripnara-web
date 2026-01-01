import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus } from 'lucide-react';
import {
  EmptyTripsIllustration,
  EmptyPlacesIllustration,
  EmptyScheduleIllustration,
  EmptyExecuteIllustration,
} from '@/components/illustrations/OnboardingIllustrations';

type EmptyStateType = 'trips' | 'places' | 'schedule' | 'execute' | 'custom';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  demoActionLabel?: string;
  onDemoAction?: () => void;
  icon?: React.ReactNode;
  type?: EmptyStateType;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  demoActionLabel,
  onDemoAction,
  icon,
  type = 'custom',
}: EmptyStateProps) {
  const getIllustration = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'trips':
        return <EmptyTripsIllustration size={160} />;
      case 'places':
        return <EmptyPlacesIllustration size={160} />;
      case 'schedule':
        return <EmptyScheduleIllustration size={160} />;
      case 'execute':
        return <EmptyExecuteIllustration size={160} />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mb-6 flex justify-center opacity-60">
          {getIllustration()}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {demoActionLabel && onDemoAction && (
            <Button variant="outline" onClick={onDemoAction}>
              {demoActionLabel}
            </Button>
          )}
          <Button onClick={onAction}>
            {actionLabel}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

