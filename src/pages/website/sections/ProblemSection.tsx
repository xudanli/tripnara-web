import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ProblemSection() {
  const { t } = useTranslation();
  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <WebsiteHeading level={2} className="mb-6 whitespace-pre-line">
            {t('problem.title')}
          </WebsiteHeading>
        </div>

        <div className="flex flex-col gap-8">
          {/* Regular Trip - Red Hotspots */}
          <div className="p-6 border-2 border-destructive rounded-lg bg-destructive/10">
            <h3 className="mb-4 text-destructive font-semibold">
              {t('problem.regularTrip')}
            </h3>
            <div className="flex gap-2 flex-wrap">
              {['Place A', 'Place B', 'Place C', 'Place D', 'Place E'].map(
                (place) => (
                  <Badge
                    key={place}
                    className="px-4 py-2 text-sm bg-destructive text-destructive-foreground"
                  >
                    {place}
                  </Badge>
                )
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('problem.regularTripDesc')}
            </p>
          </div>

          {/* TripNARA - Linear Structure */}
          <div className="p-6 border-2 border-primary rounded-lg bg-primary/10">
            <h3 className="mb-4 text-primary font-semibold">
              {t('problem.tripnaraRoute')}
            </h3>
            <div className="flex items-center gap-2">
              {['A', '→', 'B', '→', 'C', '→', 'D'].map((item, idx) => (
                <span
                  key={idx}
                  className={cn(
                    item === '→' ? 'px-0 text-primary font-bold text-xl' : 'px-4 py-2 text-sm bg-primary text-primary-foreground rounded',
                    'inline-block'
                  )}
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t('problem.tripnaraRouteDesc')}
            </p>
          </div>
        </div>
      </div>
    </WebsiteSection>
  );
}
