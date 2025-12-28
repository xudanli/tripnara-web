import { useTranslation } from 'react-i18next';

export default function StoriesPage() {
  const { t } = useTranslation();
  const stories = [
    {
      title: t('stories.expedition.title'),
      excerpt: t('stories.expedition.excerpt'),
    },
    {
      title: t('stories.alpine.title'),
      excerpt: t('stories.alpine.excerpt'),
    },
    {
      title: t('stories.designer.title'),
      excerpt: t('stories.designer.excerpt'),
    },
  ];

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: '700',
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        {t('stories.title')}
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {stories.map((story, idx) => (
          <article
            key={idx}
            style={{
              padding: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {story.title}
            </h2>
            <p style={{ color: '#666', lineHeight: '1.8' }}>{story.excerpt}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
