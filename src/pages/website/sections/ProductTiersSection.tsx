import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';

export default function ProductTiersSection() {
  const { t } = useTranslation();
  const tiers = [
    {
      name: t('tiers.explorer.name'),
      description: t('tiers.explorer.description'),
    },
    {
      name: t('tiers.navigator.name'),
      description: t('tiers.navigator.description'),
    },
    {
      name: t('tiers.pathfinder.name'),
      description: t('tiers.pathfinder.description'),
    },
  ];

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <WebsiteHeading level={2} align="center" className="mb-16">
        {t('tiers.title')}
      </WebsiteHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <WebsiteCard key={tier.name}>
            <CardContent className="p-10 text-center">
              <h3 className="text-3xl font-bold mb-4 text-primary">
                {tier.name}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {tier.description}
              </p>
            </CardContent>
          </WebsiteCard>
        ))}
      </div>
    </WebsiteSection>
  );
}
