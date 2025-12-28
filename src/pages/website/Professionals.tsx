import { useTranslation } from 'react-i18next';

export default function ProfessionalsPage() {
  const { t } = useTranslation();
  const useCases = [
    t('professionals.expedition'),
    t('professionals.alpine'),
    t('professionals.highAltitude'),
    t('professionals.remoteTerrain'),
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
        {t('professionals.title')}
      </h1>

      <section style={{ marginBottom: '4rem' }}>
        <h2
          style={{
            fontSize: '1.8rem',
            fontWeight: '600',
            marginBottom: '2rem',
          }}
        >
          {t('professionals.suitableFor')}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {useCases.map((useCase) => (
            <div
              key={useCase}
              style={{
                padding: '2rem',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fff',
                textAlign: 'center',
              }}
            >
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600' }}>{useCase}</h3>
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          padding: '3rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
        }}
      >
        <h2
          style={{
            fontSize: '1.8rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
          }}
        >
          {t('professionals.whyTitle')}
        </h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>✓</span>
            {t('professionals.evidence')}
          </li>
          <li style={{ marginBottom: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>✓</span>
            {t('professionals.terrain')}
          </li>
          <li style={{ marginBottom: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>✓</span>
            {t('professionals.transparency')}
          </li>
          <li style={{ marginBottom: '1rem', paddingLeft: '1.5rem', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>✓</span>
            {t('professionals.safety')}
          </li>
        </ul>
      </section>
    </div>
  );
}
