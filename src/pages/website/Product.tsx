import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RoutePlanning } from '@/components/illustrations/SceneIllustrations';
import { Mountains, PersonThinking, Compass, Route } from '@/components/illustrations/SimpleIllustrations';

export default function ProductPage() {
  const { t } = useTranslation();
  const location = useLocation();

  // Handle anchor scrolling when component mounts or hash changes
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        // Small delay to ensure the page has rendered
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

  const modules = [
    {
      title: t('product.module1.title'),
      description: t('product.module1.description'),
      scene: t('product.module1.scene'),
      value: t('product.module1.value'),
      illustration: RoutePlanning,
    },
    {
      title: t('product.module2.title'),
      description: t('product.module2.description'),
      scene: t('product.module2.scene'),
      value: t('product.module2.value'),
      illustration: PersonThinking,
    },
    {
      title: t('product.module3.title'),
      description: t('product.module3.description'),
      scene: t('product.module3.scene'),
      value: t('product.module3.value'),
      illustration: Compass,
    },
    {
      title: t('product.module4.title'),
      description: t('product.module4.description'),
      scene: t('product.module4.scene'),
      value: t('product.module4.value'),
      illustration: Mountains,
    },
    {
      title: t('product.module5.title'),
      description: t('product.module5.description'),
      scene: t('product.module5.scene'),
      value: t('product.module5.value'),
      illustration: Compass,
    },
  ];

  const workflowSteps = [
    t('product.workflow.step1'),
    t('product.workflow.step2'),
    t('product.workflow.step3'),
    t('product.workflow.step4'),
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
          <RoutePlanning size={200} color="#000" />
        </div>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: '700',
            marginBottom: '3rem',
            color: '#000',
            lineHeight: '1.2',
          }}
        >
          {t('product.title')}
        </h1>

        <div
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            lineHeight: '1.8',
            color: '#333',
            marginBottom: '3rem',
          }}
        >
          <p style={{ marginBottom: '1rem' }}>我们并不是推荐更多地点，</p>
          <p style={{ marginBottom: '1rem' }}>而是帮助你判断一条路线是否应该存在，</p>
          <p>并把它转化为真正能执行的旅行方案。</p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/login"
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#DC2626',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {t('product.hero.cta1')}
          </Link>
          <Link
            to="/route-intelligence"
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: 'transparent',
              color: '#000',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              border: '2px solid #e0e0e0',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {t('product.hero.cta2')}
          </Link>
        </div>
      </section>

      {/* SECTION 2 · 模块矩阵（核心功能卡片） */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            {modules.map((module, idx) => {
              const Illustration = module.illustration;
              return (
                <div
                  key={idx}
                  id={
                    idx === 0
                      ? 'route-direction'
                      : idx === 1
                      ? 'executable-schedule'
                      : idx === 2
                      ? 'plan-b'
                      : idx === 3
                      ? 'risk-dem'
                      : 'travel-readiness'
                  }
                  style={{
                    padding: '2.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
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
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <Illustration size={100} color="#000" />
                  </div>
                  <h3
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      marginBottom: '1rem',
                      color: '#000',
                      textAlign: 'center',
                    }}
                  >
                    {module.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#666',
                      lineHeight: '1.7',
                      marginBottom: '1.5rem',
                      textAlign: 'center',
                    }}
                  >
                    {module.description}
                  </p>
                  <div
                    style={{
                      paddingTop: '1.5rem',
                      borderTop: '1px solid #e0e0e0',
                      fontSize: '0.9rem',
                      color: '#999',
                    }}
                  >
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>{module.scene}:</strong> ...
                    </div>
                    <div>
                      <strong>{module.value}:</strong> ...
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 工作流程（4 步） */}
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
            {t('product.workflow.title')}
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
            }}
          >
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '2rem',
                  padding: '2rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <div
                  style={{
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    backgroundColor: '#DC2626',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  style={{
                    fontSize: '1.2rem',
                    color: '#333',
                    lineHeight: '1.8',
                    margin: 0,
                    paddingTop: '0.5rem',
                  }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 · 为什么可靠 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              color: '#000',
            }}
          >
            {t('product.reliable.title')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
            }}
          >
            <div
              style={{
                padding: '2rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
              }}
            >
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <PersonThinking size={80} color="#000" />
              </div>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: '#000',
                }}
              >
                {t('product.reliable.firstPrinciples')}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.7' }}>
                ...
              </p>
            </div>
            <div
              style={{
                padding: '2rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
              }}
            >
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <Route size={80} color="#000" />
              </div>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: '#000',
                }}
              >
                {t('product.reliable.dataRigorous')}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.7' }}>
                ...
              </p>
            </div>
            <div
              style={{
                padding: '2rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
              }}
            >
              <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <Compass size={80} color="#000" />
              </div>
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  color: '#000',
                }}
              >
                {t('product.reliable.aiStructure')}
              </h3>
              <p style={{ color: '#666', lineHeight: '1.7' }}>
                ...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 · CTA */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              padding: '1.25rem 3rem',
              backgroundColor: '#DC2626',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.2rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {t('product.cta.text')}
          </Link>
        </div>
      </section>
    </div>
  );
}
