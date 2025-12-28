import { useTranslation } from 'react-i18next';

export default function AboutPage() {
  const { t } = useTranslation();
  const taglines = t('about.taglines', { returnObjects: true }) as string[];

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
        {t('about.title')}
      </h1>

      <section style={{ marginBottom: '4rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('about.mission.title')}
        </h2>
        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '2rem',
          }}
        >
          {t('about.mission.p1')}
        </p>
        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#333',
            fontWeight: '600',
          }}
        >
          {t('about.mission.p2')}
        </p>
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('about.philosophy.title')}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {taglines.slice(0, 6).map((tagline, idx) => (
            <div
              key={idx}
              style={{
                padding: '1.5rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                fontStyle: 'italic',
                color: '#555',
              }}
            >
              {tagline}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('about.vision.title')}
        </h2>
        <p
          style={{
            fontSize: '1.3rem',
            lineHeight: '1.8',
            color: '#333',
            fontStyle: 'italic',
            padding: '2rem',
            backgroundColor: '#f0f8ff',
            borderRadius: '8px',
          }}
        >
          {t('about.vision.text')}
        </p>
      </section>
    </div>
  );
}
