import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';

export default function DEMEngineSection() {
  const { t } = useTranslation();
  const features = [
    { name: t('dem.ascent'), icon: '⛰️', key: 'ascent' },
    { name: t('dem.slope'), icon: '📐', key: 'slope' },
    { name: t('dem.fatigue'), icon: '⚡', key: 'fatigue' },
    { name: t('dem.corridorQuality'), icon: '🛤️', key: 'corridorQuality' },
  ];

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <div className="text-center mb-16">
        <WebsiteHeading level={2} align="center" className="mb-4">
          {t('dem.title')}
        </WebsiteHeading>
        <p className="text-2xl text-muted-foreground font-semibold">
          {t('dem.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {features.map((feature) => (
          <WebsiteCard key={feature.key}>
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold">
                {feature.name}
              </h3>
            </CardContent>
          </WebsiteCard>
        ))}
      </div>

      <div className="text-center p-8 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
        <p className="text-xl font-semibold text-yellow-800">
          {t('dem.validation')}
        </p>
      </div>
    </WebsiteSection>
  );
}
