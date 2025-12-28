import { useTranslation } from 'react-i18next';

export default function ThreePersonasSection() {
  const { t } = useTranslation();
  const personas = [
    {
      name: t('personas.abu.name'),
      title: t('personas.abu.title'),
      description: t('personas.abu.description'),
      color: '#dc3545',
    },
    {
      name: t('personas.dre.name'),
      title: t('personas.dre.title'),
      description: t('personas.dre.description'),
      color: '#007bff',
    },
    {
      name: t('personas.neptune.name'),
      title: t('personas.neptune.title'),
      description: t('personas.neptune.description'),
      color: '#28a745',
    },
  ];

  return (
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#f8f9fa',
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
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '4rem',
          }}
        >
          {t('personas.title')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {personas.map((persona) => (
            <div
              key={persona.name}
              style={{
                padding: '2rem',
                border: `2px solid ${persona.color}`,
                borderRadius: '8px',
                backgroundColor: '#fff',
              }}
            >
              <h3
                style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  color: persona.color,
                }}
              >
                {persona.name}
              </h3>
              <p
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: '#333',
                }}
              >
                {persona.title}
              </p>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                {persona.description}
              </p>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '1rem' }}>
            {t('personas.decisionLog')}
          </p>
          <div
            style={{
              width: '100%',
              height: '200px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
            }}
          >
            {t('personas.decisionLogScreenshot')}
          </div>
        </div>
      </div>
    </section>
  );
}
