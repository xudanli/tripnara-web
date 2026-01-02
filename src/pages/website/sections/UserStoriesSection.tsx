import { useTranslation } from 'react-i18next';

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
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '4rem',
            color: '#000',
          }}
        >
          {t('userStories.title', {
            defaultValue: '看看大家如何使用 TripNARA',
          })}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}
        >
          {stories.map((story, idx) => (
            <div
              key={idx}
              style={{
                padding: '2.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  color: '#000',
                }}
              >
                {story.title}
              </h3>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#666',
                }}
              >
                {story.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

