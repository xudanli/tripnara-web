import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonThinking, Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function RouteIntelligencePage() {
  const { t } = useTranslation();
  const [expandedPoints, setExpandedPoints] = useState<boolean[]>([false, false, false, false]);
  const [expandAll, setExpandAll] = useState(false);

  const corePoints = [
    {
      title: t('routeIntelligence.corePoints.point1'),
      desc: t('routeIntelligence.corePoints.point1Desc'),
    },
    {
      title: t('routeIntelligence.corePoints.point2'),
      desc: t('routeIntelligence.corePoints.point2Desc'),
    },
    {
      title: t('routeIntelligence.corePoints.point3'),
      desc: t('routeIntelligence.corePoints.point3Desc'),
    },
    {
      title: t('routeIntelligence.corePoints.point4'),
      desc: t('routeIntelligence.corePoints.point4Desc'),
    },
  ];

  const togglePoint = (idx: number) => {
    const newExpanded = [...expandedPoints];
    newExpanded[idx] = !newExpanded[idx];
    setExpandedPoints(newExpanded);
  };

  const handleExpandAll = () => {
    const newState = !expandAll;
    setExpandAll(newState);
    setExpandedPoints([newState, newState, newState, newState]);
  };

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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '3rem',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                fontWeight: '700',
                color: '#000',
                margin: 0,
              }}
            >
              {t('routeIntelligence.corePoints.title')}
            </h2>
            <button
              onClick={handleExpandAll}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '0.9rem',
                color: '#666',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.borderColor = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              {expandAll ? t('routeIntelligence.corePoints.collapseAll') : t('routeIntelligence.corePoints.expandAll')}
            </button>
          </div>

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
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => togglePoint(idx)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#333',
                      flex: 1,
                    }}
                  >
                    {idx + 1}. {point.title}
                  </div>
                  <div
                    style={{
                      fontSize: '1.2rem',
                      color: '#666',
                      transition: 'transform 0.3s ease',
                      transform: expandedPoints[idx] ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </div>
                </div>
                {expandedPoints[idx] && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #f0f0f0',
                      fontSize: '1rem',
                      lineHeight: '1.8',
                      color: '#666',
                    }}
                  >
                    → {point.desc}
                  </div>
                )}
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

          {/* 概念引擎 */}
          <div style={{ marginBottom: '4rem' }}>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              📌 {t('routeIntelligence.methodology.conceptEngine.title')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  key: 'routeDirection',
                  icon: Route,
                },
                {
                  key: 'system1System2',
                  icon: Compass,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '2rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <Icon size={60} color="#000" />
                    </div>
                    <p style={{ fontSize: '1rem', color: '#333', margin: 0 }}>
                      {t(`routeIntelligence.methodology.conceptEngine.${item.key}`)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 决策辅助者 */}
          <div>
            <h3
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              📌 {t('routeIntelligence.methodology.decisionAssistant.title')}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  key: 'riskGatekeeper',
                  icon: PersonThinking,
                },
                {
                  key: 'executableRhythm',
                  icon: Mountains,
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '2rem',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #e0e0e0',
                      borderRadius: '12px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <Icon size={60} color="#000" />
                    </div>
                    <p style={{ fontSize: '1rem', color: '#333', margin: 0 }}>
                      {t(`routeIntelligence.methodology.decisionAssistant.${item.key}`)}
                    </p>
                  </div>
                );
              })}
            </div>
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
              marginBottom: '1.5rem',
            }}
          >
            {t('routeIntelligence.ai.subtitle')}
          </p>
          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              lineHeight: '1.8',
              color: '#666',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            {t('routeIntelligence.ai.description')}
          </p>
        </div>
      </section>

      {/* SECTION 5 · TripNARA 如何学习决策哲学 */}
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
              marginBottom: '1.5rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('routeIntelligence.philosophy.title')}
          </h2>
          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              lineHeight: '1.8',
              color: '#666',
              marginBottom: '2rem',
              textAlign: 'center',
            }}
          >
            {t('routeIntelligence.philosophy.description')}
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {[
              'reference1',
              'reference2',
              'reference3',
              'reference4',
            ].map((key, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  color: '#333',
                  textAlign: 'center',
                }}
              >
                {t(`routeIntelligence.philosophy.${key}`)}
              </div>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <button
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t('routeIntelligence.philosophy.viewWhitePaper')}
            </button>
            <button
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.borderColor = '#000';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {t('routeIntelligence.philosophy.viewGuide')}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 6 · 品牌宣言 */}
      <section
        style={{
          padding: '8rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          {/* 装饰性线段 */}
          <div
            style={{
              marginBottom: '3rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e0e0e0',
                maxWidth: '100px',
              }}
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#000',
              }}
            />
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e0e0e0',
                maxWidth: '100px',
              }}
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#000',
              }}
            />
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e0e0e0',
                maxWidth: '100px',
              }}
            />
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#000',
              }}
            />
            <div
              style={{
                flex: 1,
                height: '1px',
                backgroundColor: '#e0e0e0',
                maxWidth: '100px',
              }}
            />
          </div>

          <p
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
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
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              lineHeight: '1.8',
              color: '#666',
              fontStyle: 'italic',
            }}
          >
            {t('routeIntelligence.manifesto.zh')}
          </p>
        </div>
      </section>
    </div>
  );
}
