import { useTranslation } from 'react-i18next';
import { PersonThinking, Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function RouteIntelligencePage() {
  const { t } = useTranslation();

  const corePoints = [
    t('routeIntelligence.corePoints.point1'),
    t('routeIntelligence.corePoints.point2'),
    t('routeIntelligence.corePoints.point3'),
    t('routeIntelligence.corePoints.point4'),
  ];

  const methodologyItems = [
    t('routeIntelligence.methodology.routeDirection'),
    t('routeIntelligence.methodology.system1System2'),
    t('routeIntelligence.methodology.riskGatekeeper'),
    t('routeIntelligence.methodology.executableRhythm'),
  ];

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {/* SECTION 1 · Hero */}
      <section
        style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center' }}>
          <Route size={200} color="#000" />
        </div>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: '700',
            marginBottom: '1.5rem',
            color: '#000',
            lineHeight: '1.2',
          }}
        >
          {t('routeIntelligence.title')}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            lineHeight: '1.8',
            color: '#666',
          }}
        >
          {t('routeIntelligence.subtitle')}
        </p>
      </section>

      {/* SECTION 2 · 四个核心观点 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h2
          style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
          }}
        >
            {t('routeIntelligence.corePoints.title')}
        </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            {corePoints.map((point, idx) => (
              <div
                key={idx}
              style={{
                  padding: '2rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  lineHeight: '1.8',
                  color: '#333',
                }}
              >
                {idx + 1}. {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 方法论拆解 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('routeIntelligence.methodology.title')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {methodologyItems.map((item, idx) => {
              const icons = [Route, Compass, PersonThinking, Mountains];
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={idx}
              style={{
                    padding: '2rem',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <Icon size={60} color="#000" />
                  </div>
                  <p style={{ fontSize: '1rem', color: '#333', margin: 0 }}>{item}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 · AI 于我们意味着什么 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
            <PersonThinking size={150} color="#000" />
          </div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '1.5rem',
              color: '#000',
            }}
          >
            {t('routeIntelligence.ai.title')}
          </h2>
          <p
              style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#666',
              }}
            >
            {t('routeIntelligence.ai.subtitle')}
            </p>
          </div>
      </section>

      {/* SECTION 5 · 品牌宣言 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <p
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: '600',
              lineHeight: '1.6',
              color: '#000',
              fontStyle: 'italic',
              marginBottom: '2rem',
            }}
          >
            {t('routeIntelligence.manifesto.en')}
          </p>
          <p
            style={{
              fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
              lineHeight: '1.8',
              color: '#666',
            }}
          >
            {t('routeIntelligence.manifesto.zh')}
          </p>
        </div>
      </section>
    </div>
  );
}
