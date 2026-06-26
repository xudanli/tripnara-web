import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Building2, Shield, Star, Users } from 'lucide-react';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';
import { Button } from '@/components/ui/button';

const PILLAR_ICONS = {
  verification: Shield,
  qualification: BadgeCheck,
  projectFit: Users,
  reputation: Star,
} as const;

const ROLE_ICONS = {
  traveler: Users,
  professional: BadgeCheck,
  agency: Building2,
  organizer: Star,
} as const;

interface TrustGovernanceSectionProps {
  showRoles?: boolean;
  showTrustedProjectsCta?: boolean;
}

export default function TrustGovernanceSection({
  showRoles = true,
  showTrustedProjectsCta = true,
}: TrustGovernanceSectionProps) {
  const { t } = useTranslation();

  const pillarKeys = ['verification', 'qualification', 'projectFit', 'reputation'] as const;
  const roleKeys = ['traveler', 'professional', 'agency', 'organizer'] as const;

  return (
    <WebsiteSection variant="muted" padding="xl" maxWidth="xl">
      <div className="text-center mb-12 max-w-3xl mx-auto">
        <WebsiteHeading level={2} align="center" className="mb-4">
          {t('websiteTrust.title')}
        </WebsiteHeading>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t('websiteTrust.subtitle')}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('websiteTrust.noCreditScore')}
        </p>
      </div>

      <div className="mb-14">
        <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-8">
          {t('websiteTrust.pillarsTitle')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillarKeys.map((key) => {
            const Icon = PILLAR_ICONS[key];
            return (
              <WebsiteCard key={key}>
                <CardContent className="p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="text-base font-semibold mb-2">
                    {t(`websiteTrust.pillars.${key}.title`)}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`websiteTrust.pillars.${key}.description`)}
                  </p>
                </CardContent>
              </WebsiteCard>
            );
          })}
        </div>
      </div>

      {showRoles && (
        <div className="mb-14">
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-2">{t('websiteTrust.rolesTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('websiteTrust.rolesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roleKeys.map((key) => {
              const Icon = ROLE_ICONS[key];
              return (
                <WebsiteCard key={key}>
                  <CardContent className="p-6 flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold mb-1">
                        {t(`websiteTrust.roles.${key}.title`)}
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(`websiteTrust.roles.${key}.description`)}
                      </p>
                    </div>
                  </CardContent>
                </WebsiteCard>
              );
            })}
          </div>
        </div>
      )}

      {showTrustedProjectsCta && (
        <div className="text-center rounded-xl border border-border bg-background px-6 py-10">
          <h3 className="text-lg font-semibold mb-2">{t('websiteTrust.trustedProjects.title')}</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
            {t('websiteTrust.trustedProjects.description')}
          </p>
          <Button asChild variant="outline" className="border-black">
            <Link to="/trusted-projects">{t('websiteTrust.trustedProjects.cta')}</Link>
          </Button>
        </div>
      )}
    </WebsiteSection>
  );
}
