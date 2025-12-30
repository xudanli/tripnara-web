import { useTranslation } from 'react-i18next';

export default function DecisionComparisonSection() {
  const { t } = useTranslation();

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
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '4rem',
            color: '#000',
          }}
        >
          {t('decisionComparison.title', {
            defaultValue: 'TripNARA 与普通旅行 App 的不同',
          })}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '4rem',
            alignItems: 'center',
          }}
        >
          {/* Left: Comparison Diagram */}
          <div>
            {/* Traditional Approach */}
            <div
              style={{
                padding: '2rem',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                marginBottom: '2rem',
                backgroundColor: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  color: '#666',
                }}
              >
                ❌ {t('decisionComparison.traditional', { defaultValue: '传统' })}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  fontSize: '0.95rem',
                }}
              >
                <span style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  {t('decisionComparison.traditionalStep1', { defaultValue: 'Attraction list' })}
                </span>
                <span>→</span>
                <span style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  {t('decisionComparison.traditionalStep2', { defaultValue: 'Sort' })}
                </span>
                <span>→</span>
                <span style={{ padding: '0.5rem 1rem', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  {t('decisionComparison.traditionalStep3', { defaultValue: 'Piece together "itinerary"' })}
                </span>
              </div>
            </div>

            {/* TripNARA Approach */}
            <div
              style={{
                padding: '2rem',
                border: '2px solid #DC2626',
                borderRadius: '12px',
                backgroundColor: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  marginBottom: '1.5rem',
                  color: '#DC2626',
                }}
              >
                ✔ {t('decisionComparison.tripnara', { defaultValue: 'TripNARA' })}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  fontSize: '0.95rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ padding: '0.5rem 1rem', backgroundColor: '#fff5f5', borderRadius: '4px', border: '1px solid #DC2626' }}>
                    {t('decisionComparison.step1', { defaultValue: '是否成立？' })}
                  </span>
                  <span>→</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ padding: '0.5rem 1rem', backgroundColor: '#fff5f5', borderRadius: '4px', border: '1px solid #DC2626' }}>
                    {t('decisionComparison.step2', { defaultValue: '结构化路线' })}
                  </span>
                  <span>→</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ padding: '0.5rem 1rem', backgroundColor: '#fff5f5', borderRadius: '4px', border: '1px solid #DC2626' }}>
                    {t('decisionComparison.step3', { defaultValue: '风险验证' })}
                  </span>
                  <span>→</span>
                </div>
                <div>
                  <span style={{ padding: '0.5rem 1rem', backgroundColor: '#fff5f5', borderRadius: '4px', border: '1px solid #DC2626' }}>
                    {t('decisionComparison.step4', { defaultValue: '可执行' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Explanation */}
          <div>
            <p
              style={{
                fontSize: '1.2rem',
                lineHeight: '1.8',
                color: '#333',
                marginBottom: '1.5rem',
              }}
            >
              {t('decisionComparison.description1', {
                defaultValue: '我们不是从"推荐更多地方"开始，而是从一个更基础的问题开始：',
              })}
            </p>
            <p
              style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#000',
                lineHeight: '1.6',
              }}
            >
              {t('decisionComparison.question', {
                defaultValue: '这条路线，本身是否应该存在？',
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

