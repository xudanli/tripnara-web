import { useTranslation } from 'react-i18next';
import { RoutePlanning } from '@/components/illustrations/SceneIllustrations';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';

export default function RouteDirectionSection() {
  const { t } = useTranslation();
  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <WebsiteHeading level={2} className="mb-8">
            {t('routeDirection.title')}
          </WebsiteHeading>
          <p className="text-xl md:text-2xl lg:text-3xl italic text-foreground leading-relaxed whitespace-pre-line">
            {t('routeDirection.description')}
          </p>
        </div>
        
        <div className="flex justify-center items-center">
          <RoutePlanning size={400} className="text-foreground" />
        </div>
      </div>
    </WebsiteSection>
  );
}
