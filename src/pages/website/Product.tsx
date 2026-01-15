import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RoutePlanning } from '@/components/illustrations/SceneIllustrations';
import { Mountains, PersonThinking, Compass, Route } from '@/components/illustrations/SimpleIllustrations';

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

            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
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
                  {String(idx + 1).padStart(2, '0')}
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
                    {step}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      lineHeight: '1.6',
                      margin: 0,
                    }}
                  >
                    {t(`product.workflow.step${idx + 1}Desc`, {
                      defaultValue: '从目标出发，判断这段路是否值得存在',
                    })}
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              marginBottom: '3rem',
            }}
          >
            <div
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
                {t('product.reliable.firstPrinciplesDesc', {
                  defaultValue: '从最基础的问题出发：这条路线是否应该存在？',
                })}
              </p>
            </div>
            <div
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
                {t('product.reliable.dataRigorousDesc', {
                  defaultValue: '基于真实地形数据、天气数据、历史经验，而非猜测',
                })}
              </p>
            </div>
            <div
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
                {t('product.reliable.aiStructureDesc', {
                  defaultValue: 'AI 提供智能建议，结构化算法确保可执行性',
                })}
              </p>
            </div>
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
                    • {t('product.reliable.expandPoint1', {
                      defaultValue: '是否值得存在（第一性原则）',
                    })}
                  </li>
                  <li
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f0f0f0',
                      color: '#666',
                      lineHeight: '1.7',
                    }}
                  >
                    • {t('product.reliable.expandPoint2', {
                      defaultValue: '是否可以执行（结构与节奏）',
                    })}
                  </li>
                  <li
                    style={{
                      padding: '0.75rem 0',
                      color: '#666',
                      lineHeight: '1.7',
                    }}
                  >
                    • {t('product.reliable.expandPoint3', {
                      defaultValue: '是否具备安全性与恢复能力（决策与备选）',
                    })}
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
                    功能维度
                  </th>
                  <th
                    className="p-5 text-left font-semibold text-destructive border-b-2 border-border text-base"
                  >
                    普通旅行 App
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
                    TripNARA
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    dimension: t('product.comparison.dimension1', { defaultValue: '起点逻辑' }),
                    traditional: t('product.comparison.traditional1', { defaultValue: '景点推荐列表' }),
                    tripnara: t('product.comparison.tripnara1', {
                      defaultValue: '路线是否应存在的判断逻辑',
                    }),
                  },
                  {
                    dimension: t('product.comparison.dimension2', { defaultValue: '结构生成' }),
                    traditional: t('product.comparison.traditional2', { defaultValue: '按兴趣拼景点' }),
                    tripnara: t('product.comparison.tripnara2', {
                      defaultValue: '节奏+余量平衡的结构算法',
                    }),
                  },
                  {
                    dimension: t('product.comparison.dimension3', { defaultValue: '应变能力' }),
                    traditional: t('product.comparison.traditional3', { defaultValue: '无 / 靠用户修改' }),
                    tripnara: t('product.comparison.tripnara3', {
                      defaultValue: '自动生成 Plan B 结构化替代',
                    }),
                  },
                  {
                    dimension: t('product.comparison.dimension4', { defaultValue: '风险处理' }),
                    traditional: t('product.comparison.traditional4', {
                      defaultValue: '手动检查天气/安全',
                    }),
                    tripnara: t('product.comparison.tripnara4', {
                      defaultValue: '地形+条件+算法评估',
                    }),
                  },
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: idx < 3 ? '1px solid #f0f0f0' : 'none',
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
                      {row.dimension}
                    </td>
                    <td style={{ padding: '1.25rem', color: '#666', lineHeight: '1.6' }}>
                      {row.traditional}
                    </td>
                    <td style={{ padding: '1.25rem', color: '#333', lineHeight: '1.6' }}>
                      {row.tripnara}
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
              {/* Step 1 */}
              <div className="px-8 py-6 rounded-xl border-2 border-primary text-center min-w-[300px] shadow-sm bg-primary/10">
                <div className="font-semibold text-foreground text-base">
                  {t('product.systemDiagram.step1', { defaultValue: '用户输入（目标/偏好）' })}
                </div>
              </div>
              <div className="text-4xl text-primary">↓</div>

              {/* Step 2 */}
              <div className="px-8 py-6 rounded-xl border-2 border-primary text-center min-w-[300px] shadow-sm bg-destructive/10">
                <div className="font-semibold text-foreground text-base">
                  {t('product.systemDiagram.step2', {
                    defaultValue: '路线可行性评估模块（RouteDirection）',
                  })}
                </div>
              </div>
              <div className="text-4xl text-primary">↓</div>

              {/* Step 3 */}
              <div className="px-8 py-6 rounded-xl border-2 border-primary text-center min-w-[300px] shadow-sm bg-persona-dre/10">
                <div className="font-semibold text-foreground text-base">
                  {t('product.systemDiagram.step3', {
                    defaultValue: '结构生成模块（节奏 / 时间 / 节点）',
                  })}
                </div>
              </div>
              <div style={{ fontSize: '2rem', color: 'oklch(0.205 0 0)' }}>↓</div>

              {/* Step 4 */}
              <div
                style={{
                  padding: '1.5rem 2rem',
                  backgroundColor: '#eff6ff',
                  borderRadius: '12px',
                  border: '2px solid oklch(0.205 0 0)',
                  textAlign: 'center',
                  minWidth: '300px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontWeight: '600', color: '#000', fontSize: '1rem' }}>
                  {t('product.systemDiagram.step4', {
                    defaultValue: '风险评估模块（地形 / 气候 / 安全）',
                  })}
                </div>
              </div>
              <div style={{ fontSize: '2rem', color: 'oklch(0.205 0 0)' }}>↓</div>

              {/* Step 5 */}
              <div
                style={{
                  padding: '1.5rem 2rem',
                  backgroundColor: '#fefce8',
                  borderRadius: '12px',
                  border: '2px solid oklch(0.5 0.15 0)',
                  textAlign: 'center',
                  minWidth: '300px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ fontWeight: '600', color: '#000', fontSize: '1rem' }}>
                  {t('product.systemDiagram.step5', {
                    defaultValue: 'Plan B 替代推荐模块',
                  })}
                </div>
              </div>
              <div style={{ fontSize: '2rem', color: 'oklch(0.205 0 0)' }}>↓</div>

              {/* Output */}
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
                  {t('product.systemDiagram.output', {
                    defaultValue: '最终输出：可执行行程结构（含备用）',
                  })}
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
            {t('product.cta.text')}
          </Link>
        </div>
      </section>
    </div>
  );
}
