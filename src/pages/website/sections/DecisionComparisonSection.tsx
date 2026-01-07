import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbuBearIcon, DrDreDogIcon, NeptuneOtterIcon } from '@/components/illustrations/PersonaIcons';

export default function DecisionComparisonSection() {
  const { t } = useTranslation();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  return (
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#f8f9fa',
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        {/* Main Title */}
        <h2
          style={{
            fontSize: 'clamp(2.25rem, 5vw, 2.5rem)',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: '#000',
            lineHeight: '1.2',
          }}
        >
          {t('decisionComparison.title', {
            defaultValue: 'TripNARA 如何重新定义旅行规划？',
          })}
        </h2>

        {/* Subtitle */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '4rem',
            maxWidth: '800px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              lineHeight: '1.8',
              color: '#666',
              marginBottom: '1rem',
            }}
          >
            {t('decisionComparison.description1', {
              defaultValue: '我们不是从"推荐更多景点"开始，',
            })}
          </p>
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              lineHeight: '1.8',
              color: '#666',
              marginBottom: '1.5rem',
            }}
          >
            {t('decisionComparison.description2', {
              defaultValue: '而是从一个更基础的问题出发：',
            })}
          </p>
          <p
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: '700',
              color: '#000',
              lineHeight: '1.4',
              margin: 0,
            }}
          >
            👉 {(() => {
              const question = t('decisionComparison.question', {
                defaultValue: '这条路线，是否本身就应该存在？',
              });
              const parts = question.split('存在');
              return (
                <>
                  {parts[0]}
                  <span
                    style={{
                      backgroundColor: '#fef3c7',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: '800',
                      color: 'oklch(0.205 0 0)',
                    }}
                  >
                    存在
                  </span>
                  {parts[1]}
                </>
              );
            })()}
          </p>
        </div>

        {/* Comparison Layout - Side by Side */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3rem',
            marginTop: '3rem',
          }}
        >
          {/* Traditional Travel App */}
          <div
            style={{
              padding: '2.5rem',
              borderRadius: '16px',
              backgroundColor: 'rgba(241, 245, 249, 0.8)',
              border: '2px dashed #cbd5e1',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '2rem',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🔺</span>
              {t('decisionComparison.traditional', { defaultValue: '传统旅行 App' })}
            </div>

            {/* Traditional Flow */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#666',
                  transform: 'rotate(-2deg)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                }}
              >
                {t('decisionComparison.traditionalStep1', { defaultValue: '景点清单' })}
              </div>
              <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>→</span>
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#666',
                  transform: 'rotate(2deg)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                }}
              >
                {t('decisionComparison.traditionalStep2', { defaultValue: '排序' })}
              </div>
              <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>→</span>
              <div
                style={{
                  padding: '0.75rem 1.25rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#666',
                  transform: 'rotate(-1.5deg)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                }}
              >
                {t('decisionComparison.traditionalStep3', { defaultValue: '拼成"行程"' })}
              </div>
            </div>

            {/* Traditional Focus */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '8px',
                fontSize: '0.95rem',
                color: '#666',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              只关注"去哪"
            </div>
          </div>

          {/* TripNARA */}
          <div
            style={{
              padding: '2.5rem',
              borderRadius: '16px',
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '2rem',
                color: 'oklch(0.205 0 0)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>✅</span>
              {t('decisionComparison.tripnara', { defaultValue: 'TripNARA' })}
            </div>

            {/* TripNARA Flow - Timeline Style */}
            <div
              style={{
                position: 'relative',
                paddingLeft: '1.5rem',
                marginBottom: '2rem',
              }}
            >
              {/* Timeline vertical line */}
              <div
                style={{
                  position: 'absolute',
                  left: '1.5rem',
                  top: '1.5rem',
                  bottom: '1.5rem',
                  width: '2px',
                  background: 'linear-gradient(to bottom, oklch(0.205 0 0), oklch(0.5 0.15 0))',
                  borderRadius: '1px',
                }}
              />
              
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem',
                }}
              >
                {/* Step 1: 是否成立？- Neptune */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.75rem',
                      top: '0.25rem',
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '3px solid oklch(0.5 0.15 0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      zIndex: 2,
                    }}
                  >
                    {!imageErrors.neptune ? (
                      <img
                        src="/images/personas/neptune-logo.svg"
                        alt="Neptune"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, neptune: true }));
                        }}
                      />
                    ) : (
                      <NeptuneOtterIcon size={24} color="oklch(0.5 0.15 0)" />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingLeft: '1.5rem' }}>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#fef2f2',
                        borderRadius: '8px',
                        border: '1px solid oklch(0.5 0.15 0)',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        color: '#000',
                        marginBottom: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {t('decisionComparison.step1', { defaultValue: '是否成立？' })}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        lineHeight: '1.5',
                        paddingLeft: '0.25rem',
                      }}
                    >
                      {t('decisionComparison.step1Desc', {
                        defaultValue: '从目标出发，判断这段路是否值得存在',
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 2: 结构化路线 - Dr.Dre */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.75rem',
                      top: '0.25rem',
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '3px solid oklch(0.205 0 0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      zIndex: 2,
                    }}
                  >
                    {!imageErrors.dre ? (
                      <img
                        src="/images/personas/dr-dre-logo.svg"
                        alt="Dr.Dre"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, dre: true }));
                        }}
                      />
                    ) : (
                      <DrDreDogIcon size={24} color="oklch(0.205 0 0)" />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingLeft: '1.5rem' }}>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid oklch(0.205 0 0)',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        color: '#000',
                        marginBottom: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {t('decisionComparison.step2', { defaultValue: '结构化路线' })}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        lineHeight: '1.5',
                        paddingLeft: '0.25rem',
                      }}
                    >
                      {t('decisionComparison.step2Desc', {
                        defaultValue: '梳理节点与节奏，形成逻辑闭环',
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 3: 风险验证 - Abu */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.75rem',
                      top: '0.25rem',
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: '3px solid oklch(0.205 0 0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      zIndex: 2,
                    }}
                  >
                    {!imageErrors.abu ? (
                      <img
                        src="/images/personas/abu-logo.svg"
                        alt="Abu"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, abu: true }));
                        }}
                      />
                    ) : (
                      <AbuBearIcon size={24} color="oklch(0.205 0 0)" />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingLeft: '1.5rem' }}>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#eff6ff',
                        borderRadius: '8px',
                        border: '1px solid oklch(0.205 0 0)',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        color: '#000',
                        marginBottom: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      {t('decisionComparison.step3', { defaultValue: '风险验证' })}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        lineHeight: '1.5',
                        paddingLeft: '0.25rem',
                      }}
                    >
                      {t('decisionComparison.step3Desc', {
                        defaultValue: '评估安全性与可行性，确保路线可执行',
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 4: 可执行 */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '-1.75rem',
                      top: '0.25rem',
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      backgroundColor: 'oklch(0.205 0 0)',
                      border: '3px solid oklch(0.205 0 0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      zIndex: 2,
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>
                  </div>
                  <div style={{ flex: 1, paddingLeft: '1.5rem' }}>
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'oklch(0.205 0 0)',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: '0.5rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      }}
                    >
                      {t('decisionComparison.step4', { defaultValue: '可执行' })}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        lineHeight: '1.5',
                        paddingLeft: '0.25rem',
                      }}
                    >
                      {t('decisionComparison.step4Desc', {
                        defaultValue: '生成可执行的完整路线方案',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TripNARA Focus */}
            <div
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: '#fefce8',
                borderRadius: '8px',
                fontSize: '0.95rem',
                color: '#000',
                fontWeight: '600',
                textAlign: 'center',
                border: 'none',
              }}
            >
              ✅ 关注"应不应该去" 而不是"能去哪"
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
