import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { Button } from '@/components/ui/button';

export default function FinalCTASection() {
  const { t } = useTranslation();

  return (
    <WebsiteSection variant="muted" padding="xl" maxWidth="lg" className="text-center">
      <WebsiteHeading level={2} align="center" className="mb-12">
        {t('finalCTA.title', {
          defaultValue: '让梦想变成真正能走完的路线',
        })}
      </WebsiteHeading>

      <div className="flex gap-4 justify-center flex-wrap">
        <Button asChild size="lg" className="text-lg px-10 py-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <Link to="/login">
            {t('finalCTA.button1', { defaultValue: '开始规划 →' })}
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="text-lg px-10 py-6 border-2 hover:bg-background transition-all"
        >
          <Link to="/product">
            {t('finalCTA.button2', { defaultValue: '看看 TripNARA 如何做决定 →' })}
          </Link>
        </Button>
      </div>
    </WebsiteSection>
  );
}
