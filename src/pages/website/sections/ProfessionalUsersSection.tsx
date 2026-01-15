import { useTranslation } from 'react-i18next';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { Badge } from '@/components/ui/badge';

export default function ProfessionalUsersSection() {
  const { t } = useTranslation();

  const users = [
    t('professionalUsers.user1', { defaultValue: '旅行顾问' }),
    t('professionalUsers.user2', { defaultValue: '徒步领队' }),
    t('professionalUsers.user3', { defaultValue: '探索摄影师' }),
    t('professionalUsers.user4', { defaultValue: '户外向导' }),
  ];

  return (
    <WebsiteSection variant="muted" padding="xl" maxWidth="xl" className="text-center">
      <WebsiteHeading level={2} align="center" className="mb-12">
        {t('professionalUsers.title', {
          defaultValue: 'TripNARA 也被这些人使用',
        })}
      </WebsiteHeading>

      <div className="flex flex-wrap gap-4 justify-center mb-12">
        {users.map((user, idx) => (
          <Badge
            key={idx}
            variant="outline"
            className="px-8 py-4 text-lg font-medium bg-background"
          >
            ✔ {user}
          </Badge>
        ))}
      </div>

      <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
        {t('professionalUsers.description', {
          defaultValue: '可信 · 专业 · 决策能力',
        })}
      </p>
    </WebsiteSection>
  );
}
