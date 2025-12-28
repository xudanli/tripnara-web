import { useTranslation } from 'react-i18next';

export default function ProductPage() {
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
        {t('product.title')}
      </h1>

      {/* Section 1 - First Principles */}
      <section style={{ marginBottom: '6rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('product.firstPrinciples.title')}
        </h2>
        <p
          style={{
            fontSize: '1.3rem',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '1.5rem',
          }}
        >
          {t('product.firstPrinciples.question')}
        </p>
        <p
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#007bff',
            fontStyle: 'italic',
            padding: '2rem',
            backgroundColor: '#f0f8ff',
            borderRadius: '8px',
            borderLeft: '4px solid #007bff',
          }}
        >
          {t('product.firstPrinciples.answer')}
        </p>
      </section>

      {/* Section 2 - RouteDirection */}
      <section style={{ marginBottom: '6rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('product.routeDirection.title')}
        </h2>
        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '2rem',
          }}
        >
          {t('product.routeDirection.description')}
        </p>
        <p style={{ color: '#666', lineHeight: '1.8' }}>
          {t('product.routeDirection.detail')}
        </p>
      </section>

      {/* Section 3 - DEM Evidence */}
      <section style={{ marginBottom: '6rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('product.demEvidence.title')}
        </h2>
        <p
          style={{
            fontSize: '1.2rem',
            lineHeight: '1.8',
            color: '#333',
            fontWeight: '600',
          }}
        >
          {t('product.demEvidence.description')}
        </p>
      </section>

      {/* Section 4 - Three Personas */}
      <section style={{ marginBottom: '6rem' }}>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('product.threePersonas.title')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {t('personas.abu.name')}
            </h3>
            <p style={{ color: '#666' }}>{t('product.threePersonas.abu')}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {t('personas.dre.name')}
            </h3>
            <p style={{ color: '#666' }}>{t('product.threePersonas.dre')}</p>
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              {t('personas.neptune.name')}
            </h3>
            <p style={{ color: '#666' }}>{t('product.threePersonas.neptune')}</p>
          </div>
        </div>
      </section>

      {/* Section 5 - Decision Log */}
      <section>
        <h2
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '2rem',
          }}
        >
          {t('product.decisionLog.title')}
        </h2>
        <p style={{ fontSize: '1.2rem', lineHeight: '1.8', color: '#333' }}>
          {t('product.decisionLog.description')}
        </p>
      </section>
    </div>
  );
}

