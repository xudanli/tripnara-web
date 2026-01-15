import { useTranslation } from 'react-i18next';
import { PersonThinking, Compass, Mountains, Route } from '@/components/illustrations/SimpleIllustrations';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';

export default function WhoUsesSection() {
  const { t } = useTranslation();
  const users = [
    {
      name: t('whoUses.deepTravelers'),
      icon: PersonThinking,
    },
    {
      name: t('whoUses.expeditionTeams'),
      icon: Compass,
    },
    {
      name: t('whoUses.insurance'),
      icon: Mountains,
    },
    {
      name: t('whoUses.travelDesigners'),
      icon: Route,
    },
  ];

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <WebsiteHeading level={2} align="center" className="mb-16">
        {t('whoUses.title')}
      </WebsiteHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {users.map((user) => {
          const IconComponent = user.icon;
          return (
            <WebsiteCard key={user.name} hover className="text-center">
              <CardContent className="p-10">
                <div className="mb-6 flex justify-center">
                  <IconComponent
                    size={user.icon === PersonThinking ? 120 : 80}
                    className="text-foreground"
                  />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {user.name}
                </h3>
              </CardContent>
            </WebsiteCard>
          );
        })}
      </div>
    </WebsiteSection>
  );
}
