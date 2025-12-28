import { useTranslation } from 'react-i18next';

export default function RouteIntelligencePage() {
  const { t } = useTranslation();
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
        {t('routeIntelligence.title')}
      </h1>

      <section style={{ marginBottom: '4rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('routeIntelligence.whatIs.title')}
        </h2>
        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '1.5rem',
          }}
        >
          {t('routeIntelligence.whatIs.p1')}
        </p>
        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#333',
          }}
        >
          {t('routeIntelligence.whatIs.p2')}
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
          {t('routeIntelligence.components.title')}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
          }}
        >
          <div
            style={{
              padding: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {t('routeIntelligence.components.routeDirection.title')}
            </h3>
            <p style={{ color: '#666', lineHeight: '1.8' }}>
              {t('routeIntelligence.components.routeDirection.description')}
            </p>
          </div>

          <div
            style={{
              padding: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {t('routeIntelligence.components.dem.title')}
            </h3>
            <p style={{ color: '#666', lineHeight: '1.8' }}>
              {t('routeIntelligence.components.dem.description')}
            </p>
          </div>

          <div
            style={{
              padding: '2rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {t('routeIntelligence.components.personas.title')}
            </h3>
            <p style={{ color: '#666', lineHeight: '1.8' }}>
              {t('routeIntelligence.components.personas.description')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
