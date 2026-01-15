import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';

export default function UserStoriesSection() {
  const { t } = useTranslation();

  const stories = [
    {
      title: t('userStories.story1.title', { defaultValue: '冰岛环岛' }),
      subtitle: t('userStories.story1.subtitle', { defaultValue: '先判断可行域' }),
    },
    {
      title: t('userStories.story2.title', { defaultValue: '新西兰徒步' }),
      subtitle: t('userStories.story2.subtitle', { defaultValue: '风险管理' }),
    },
    {
      title: t('userStories.story3.title', { defaultValue: '欧洲火车' }),
      subtitle: t('userStories.story3.subtitle', { defaultValue: '结构化路线' }),
    },
  ];

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl">
      <WebsiteHeading level={2} align="center" className="mb-16">
        {t('userStories.title', {
          defaultValue: '看看大家如何使用 TripNARA',
        })}
      </WebsiteHeading>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stories.map((story, idx) => (
          <WebsiteCard key={idx} hover>
            <CardContent className="p-10">
              <h3 className="text-2xl font-bold mb-2 text-foreground">
                {story.title}
              </h3>
              <p className="text-base text-muted-foreground">
                {story.subtitle}
              </p>
            </CardContent>
          </WebsiteCard>
        ))}
      </div>
    </WebsiteSection>
  );
}
