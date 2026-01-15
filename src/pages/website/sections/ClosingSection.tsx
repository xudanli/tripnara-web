import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { Button } from '@/components/ui/button';

export default function ClosingSection() {
  const { t } = useTranslation();
  return (
    <WebsiteSection
      variant="default"
      padding="xl"
      maxWidth="lg"
      className="text-center bg-foreground text-background"
    >
      <WebsiteHeading level={2} align="center" className="mb-8 whitespace-pre-line">
        {t('closing.title')}
      </WebsiteHeading>

      <Button asChild size="lg" className="text-lg px-10 py-6 mt-8 bg-primary text-primary-foreground">
        <Link to="/login">
          {t('closing.cta')}
        </Link>
      </Button>
    </WebsiteSection>
  );
}
