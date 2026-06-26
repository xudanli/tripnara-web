import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';
import { Button } from '@/components/ui/button';

export default function UserStoriesSection() {
  const { t } = useTranslation();

  const stories = [1, 2, 3, 4].map((id) => ({
    title: t(`userStories.story${id}.title`),
    subtitle: t(`userStories.story${id}.subtitle`),
  }));

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <WebsiteHeading level={2} align="center" className="mb-16">
        {t('userStories.title')}
      </WebsiteHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {stories.map((story, idx) => (
          <WebsiteCard key={idx} hover>
            <CardContent className="p-10">
              <h3 className="text-xl font-bold mb-2 text-foreground">
                {story.title}
              </h3>
              <p className="text-base text-muted-foreground">
                {story.subtitle}
              </p>
            </CardContent>
          </WebsiteCard>
        ))}
      </div>

      <div className="text-center">
        <Button asChild variant="outline" size="lg" className="border-2">
          <Link to="/stories">{t('userStories.viewAll')}</Link>
        </Button>
      </div>
    </WebsiteSection>
  );
}
