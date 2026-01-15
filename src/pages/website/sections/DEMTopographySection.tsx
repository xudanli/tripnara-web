import { useTranslation } from 'react-i18next';
import { Mountains } from '@/components/illustrations/SimpleIllustrations';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { Badge } from '@/components/ui/badge';

export default function DEMTopographySection() {
  const { t } = useTranslation();

  const features = [
    t('demTopography.slope', { defaultValue: '坡度' }),
    t('demTopography.ascent', { defaultValue: '累积爬升' }),
    t('demTopography.difficulty', { defaultValue: '难度强度' }),
    t('demTopography.fatigue', { defaultValue: '疲劳趋势' }),
  ];

  return (
    <WebsiteSection variant="muted" padding="xl" maxWidth="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="flex justify-center">
          <Mountains size={350} className="text-foreground" />
        </div>

        <div>
          <WebsiteHeading level={2} className="mb-8">
            {t('demTopography.title', {
              defaultValue: '地形，是旅行计划的真相层',
            })}
          </WebsiteHeading>

          <p className="text-xl leading-relaxed text-muted-foreground mb-8">
            {t('demTopography.description', {
              defaultValue: 'TripNARA 以地形为真相层。坡度、累计爬升、走行难度，不再凭感觉。',
            })}
          </p>

          <div className="flex flex-wrap gap-3">
            {features.map((feature, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="px-4 py-2 text-sm bg-background"
              >
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </WebsiteSection>
  );
}
