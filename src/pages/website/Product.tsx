import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoutePlanning } from '@/components/illustrations/SceneIllustrations';
import { Mountains, PersonThinking, Compass, Route } from '@/components/illustrations/SimpleIllustrations';
import TrustGovernanceSection from './sections/TrustGovernanceSection';

export default function ProductPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [expandedReliable, setExpandedReliable] = useState(false);

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

  const workflowSteps = [1, 2, 3, 4, 5] as const;

  const reliableCards = [
    { key: 'firstPrinciples', icon: PersonThinking },
    { key: 'trustGovernance', icon: Route },
    { key: 'dataRigorous', icon: Mountains },
    { key: 'aiStructure', icon: Compass },
  ] as const;

  const comparisonRows = [1, 2, 3, 4, 5] as const;

  const systemSteps = [1, 2, 3, 4, 5, 6] as const;

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
          <p style={{ marginBottom: '1rem' }}>{t('product.hero.line1')}</p>
          <p style={{ marginBottom: '1rem' }}>{t('product.hero.line2')}</p>
          <p>{t('product.hero.line3')}</p>
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
              backgroundColor: 'oklch(0.205 0 0)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.backgroundColor = 'oklch(0.205 0 0)';
            }}
          >
            {t('product.hero.cta1', { defaultValue: '开始制定我的路线 →' })}
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
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {t('product.hero.cta2', { defaultValue: '查看系统原理 →' })}
          </Link>
        </div>
      </section>

      <TrustGovernanceSection showRoles={true} />

      {/* SECTION 2 · 模块矩阵（核心功能卡片） */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '1rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('product.modules.title')}
          </h2>
          <p
            style={{
              fontSize: '1rem',
              textAlign: 'center',
              color: '#666',
              marginBottom: '3rem',
              lineHeight: '1.7',
              maxWidth: '640px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {t('product.modules.subtitle')}
          </p>
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
                      : 'trusted-projects'
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
                    e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
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
                      color: '#666',
                    }}
                  >
                    <div style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>
                      <strong style={{ color: '#000' }}>{module.scene}:</strong>{' '}
                      {t(`product.module${idx + 1}.sceneContent`, {
                        defaultValue: '计划中跨地域、多日程、多变量不确定行程',
                      })}
                    </div>
                    <div style={{ lineHeight: '1.6' }}>
                      <strong style={{ color: '#000' }}>{module.value}:</strong>{' '}
                      {t(`product.module${idx + 1}.valueContent`, {
                        defaultValue: '保证每一步都有数据支持 + 可落地替代选项',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 工作流程（Timeline 样式） */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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

          {/* Timeline */}
          <div
            style={{
              position: 'relative',
              paddingLeft: '3rem',
            }}
          >
            {/* Vertical timeline line */}
            <div
              style={{
                position: 'absolute',
                left: '1.5rem',
                top: '1.5rem',
                bottom: '1.5rem',
                width: '3px',
                background: 'linear-gradient(to bottom, oklch(0.205 0 0), oklch(0.5 0.15 0))',
                borderRadius: '2px',
              }}
            />

            {workflowSteps.map((stepNum, idx) => (
              <div
                key={stepNum}
                style={{
                  position: 'relative',
                  marginBottom: idx < workflowSteps.length - 1 ? '3rem' : '0',
                  paddingLeft: '3rem',
                }}
              >
                {/* Timeline node */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.5rem',
                    top: '0.5rem',
                    width: '3rem',
                    height: '3rem',
                    borderRadius: '50%',
                    backgroundColor: idx === workflowSteps.length - 1 ? 'oklch(0.5 0.15 0)' : '#fff',
                    border: '3px solid oklch(0.205 0 0)',
                    color: idx === workflowSteps.length - 1 ? '#fff' : 'oklch(0.205 0 0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    zIndex: 2,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {String(stepNum).padStart(2, '0')}
                </div>

                {/* Step card */}
                <div
                  style={{
                    padding: '1.5rem 2rem',
                    backgroundColor: idx === workflowSteps.length - 1 ? '#fefce8' : '#fff',
                    border: `2px solid ${idx === workflowSteps.length - 1 ? 'oklch(0.5 0.15 0)' : '#e0e0e0'}`,
                    borderRadius: '12px',
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(8px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      color: '#000',
                      marginBottom: '0.5rem',
                    }}
                  >
                    {t(`product.workflow.step${stepNum}`)}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      lineHeight: '1.6',
                      margin: 0,
                    }}
                  >
                    {t(`product.workflow.step${stepNum}Desc`)}
                  </p>
                </div>

                {/* Arrow down (except last) */}
                {idx < workflowSteps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '1.5rem',
                      top: '4.5rem',
                      fontSize: '1.5rem',
                      color: 'oklch(0.205 0 0)',
                      transform: 'translateX(-50%)',
                    }}
                  >
                    ↓
                  </div>
                )}
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
        <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
            }}
          >
            {reliableCards.map(({ key, icon: Icon }) => (
              <div
                key={key}
                style={{
                  padding: '2rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <Icon size={80} color="#000" />
                </div>
                <h3
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    color: '#000',
                  }}
                >
                  {t(`product.reliable.${key}`)}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.7' }}>
                  {t(`product.reliable.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>

          {/* Expandable details */}
          <div
            style={{
              maxWidth: '700px',
              margin: '0 auto',
              textAlign: 'left',
            }}
          >
            <button
              onClick={() => setExpandedReliable(!expandedReliable)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                color: '#666',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '1rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                e.currentTarget.style.color = 'oklch(0.205 0 0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.color = '#666';
              }}
            >
              {expandedReliable
                ? t('product.reliable.collapseButton', { defaultValue: '收起' })
                : t('product.reliable.expandButton', { defaultValue: '展开详情' })}
            </button>

            {expandedReliable && (
              <div
                style={{
                  padding: '2rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  marginTop: '1rem',
                }}
              >
                <p
                  style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    marginBottom: '1.5rem',
                    color: '#000',
                  }}
                >
                  {t('product.reliable.expandTitle', {
                    defaultValue: 'TripNARA 基于旅行最核心问题的还原：',
                  })}
                </p>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  <li
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f0f0f0',
                      color: '#666',
                      lineHeight: '1.7',
                    }}
                  >
                    • {t('product.reliable.expandPoint1')}
                  </li>
                  <li
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f0f0f0',
                      color: '#666',
                      lineHeight: '1.7',
                    }}
                  >
                    • {t('product.reliable.expandPoint2')}
                  </li>
                  <li
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f0f0f0',
                      color: '#666',
                      lineHeight: '1.7',
                    }}
                  >
                    • {t('product.reliable.expandPoint3')}
                  </li>
                  <li
                    style={{
                      padding: '0.75rem 0',
                      color: '#666',
                      lineHeight: '1.7',
                    }}
                  >
                    • {t('product.reliable.expandPoint4')}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 5 · 对比表格 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('product.comparison.title', { defaultValue: '我们和普通工具的区别' })}
          </h2>

          <div
            style={{
              overflowX: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: '#fff',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th
                    style={{
                      padding: '1.25rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: '#000',
                      borderBottom: '2px solid #e0e0e0',
                      fontSize: '1rem',
                    }}
                  >
                    {t('product.comparison.columnDimension')}
                  </th>
                  <th
                    className="p-5 text-left font-semibold text-destructive border-b-2 border-border text-base"
                  >
                    {t('product.comparison.columnTraditional')}
                  </th>
                  <th
                    style={{
                      padding: '1.25rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: 'oklch(0.205 0 0)',
                      borderBottom: '2px solid #e0e0e0',
                      fontSize: '1rem',
                    }}
                  >
                    {t('product.comparison.columnTripnara')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((rowNum, idx) => (
                  <tr
                    key={rowNum}
                    style={{
                      borderBottom: idx < comparisonRows.length - 1 ? '1px solid #f0f0f0' : 'none',
                    }}
                  >
                    <td
                      style={{
                        padding: '1.25rem',
                        fontWeight: '600',
                        color: '#333',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      {t(`product.comparison.dimension${rowNum}`)}
                    </td>
                    <td style={{ padding: '1.25rem', color: '#666', lineHeight: '1.6' }}>
                      {t(`product.comparison.traditional${rowNum}`)}
                    </td>
                    <td style={{ padding: '1.25rem', color: '#333', lineHeight: '1.6' }}>
                      {t(`product.comparison.tripnara${rowNum}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 6 · 系统架构图 */}
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
            {t('product.systemDiagram.title', { defaultValue: '系统架构' })}
          </h2>

          {/* System Flow Diagram */}
          <div
            style={{
              padding: '3rem',
              backgroundColor: '#fff',
              borderRadius: '16px',
              border: '1px solid #e0e0e0',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                alignItems: 'center',
              }}
            >
              {systemSteps.map((stepNum) => (
                <div key={stepNum} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                  <div
                    style={{
                      padding: '1.5rem 2rem',
                      backgroundColor: stepNum === 6 ? '#fefce8' : '#fff',
                      borderRadius: '12px',
                      border: `2px solid ${stepNum === 6 ? 'oklch(0.5 0.15 0)' : 'oklch(0.205 0 0)'}`,
                      textAlign: 'center',
                      minWidth: '300px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#000', fontSize: '1rem' }}>
                      {t(`product.systemDiagram.step${stepNum}`)}
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', color: 'oklch(0.205 0 0)' }}>↓</div>
                </div>
              ))}

              <div
                style={{
                  padding: '1.5rem 2rem',
                  backgroundColor: 'oklch(0.205 0 0)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  minWidth: '300px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
              >
                <div style={{ fontWeight: '700', color: '#fff', fontSize: '1.1rem' }}>
                  {t('product.systemDiagram.output')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 · CTA */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '1.25rem 3rem',
                backgroundColor: 'oklch(0.205 0 0)',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1.2rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
              }}
            >
              {t('product.cta.text')}
            </Link>
            <Link
              to="/trusted-projects"
              style={{
                display: 'inline-block',
                padding: '1.25rem 3rem',
                backgroundColor: 'transparent',
                color: '#000',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1.2rem',
                border: '2px solid #e0e0e0',
              }}
            >
              {t('product.cta.trustedProjects')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
