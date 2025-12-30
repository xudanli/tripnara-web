import { useTranslation } from 'react-i18next';

export default function ThreePersonasSection() {
  const { t } = useTranslation();
  const personas = [
    {
      name: t('personas.abu.name', { defaultValue: 'Abu' }),
      title: t('personas.abu.title', { defaultValue: '安全守门人' }),
      description: t('personas.abu.description', {
        defaultValue: '风险不过关 → 直接否决',
      }),
      details: t('personas.abu.details', {
        defaultValue: '天气 · 海拔 · 车况 · 能力匹配',
      }),
    },
    {
      name: t('personas.dre.name', { defaultValue: 'Dr.Dre' }),
      title: t('personas.dre.title', { defaultValue: '日程结构师' }),
      description: t('personas.dre.description', {
        defaultValue: '帮你把旅程安排得刚刚好',
      }),
    },
    {
      name: t('personas.neptune.name', { defaultValue: 'Neptune' }),
      title: t('personas.neptune.title', { defaultValue: '修复替换者' }),
      description: t('personas.neptune.description', {
        defaultValue: '情况变化？我来兜底',
      }),
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
          {t('personas.title', {
            defaultValue: '帮助你做出更好旅行决定的三位合伙人',
          })}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem',
          }}
        >
          {personas.map((persona, idx) => (
            <div
              key={idx}
              style={{
                padding: '2.5rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                textAlign: 'center',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#DC2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              <h3
                style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  color: '#000',
                }}
              >
                {persona.name}
              </h3>
              <p
                style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#666',
                  marginBottom: '1.5rem',
                }}
              >
                {persona.title}
              </p>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#333',
                  lineHeight: '1.7',
                  marginBottom: persona.details ? '1rem' : '0',
                }}
              >
                {persona.description}
              </p>
              {persona.details && (
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: '#666',
                    lineHeight: '1.6',
                    marginTop: '1rem',
                  }}
                >
                  {persona.details}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
