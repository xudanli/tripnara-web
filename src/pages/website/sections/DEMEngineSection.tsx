import { useTranslation } from 'react-i18next';

export default function DEMEngineSection() {
  const { t } = useTranslation();
  const features = [
    { name: t('dem.ascent'), icon: '⛰️', key: 'ascent' },
    { name: t('dem.slope'), icon: '📐', key: 'slope' },
    { name: t('dem.fatigue'), icon: '⚡', key: 'fatigue' },
    { name: t('dem.corridorQuality'), icon: '🛤️', key: 'corridorQuality' },
  ];

  return (
    <section
      style={{
        padding: '6rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '700',
            marginBottom: '1rem',
          }}
        >
          {t('dem.title')}
        </h2>
        <p
          style={{
            fontSize: '1.5rem',
            color: '#666',
            fontWeight: '600',
          }}
        >
          {t('dem.subtitle')}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem',
        }}
      >
        {features.map((feature) => (
          <div
            key={feature.key}
            style={{
              padding: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              textAlign: 'center',
              backgroundColor: '#fff',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              {feature.icon}
            </div>
            <h3
              style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
              }}
            >
              {feature.name}
            </h3>
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
        }}
      >
        <p
          style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            color: '#856404',
          }}
        >
          {t('dem.validation')}
        </p>
      </div>
    </section>
  );
}
