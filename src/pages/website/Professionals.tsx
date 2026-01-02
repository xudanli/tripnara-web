import { useTranslation } from 'react-i18next';
import { PersonSitting, PersonThinking, Compass, Mountains, Route } from '@/components/illustrations/SimpleIllustrations';

export default function ProfessionalsPage() {
  const { t } = useTranslation();

  const targetUsers = [
    { key: 'travelConsultant', label: t('professionals.users.travelConsultant') },
    { key: 'outdoorLeader', label: t('professionals.users.outdoorLeader') },
    { key: 'photographyTeacher', label: t('professionals.users.photographyTeacher') },
    { key: 'explorationPlanner', label: t('professionals.users.explorationPlanner') },
    { key: 'b2bProductManager', label: t('professionals.users.b2bProductManager') },
  ];

  const coreValueCards = [
    {
      key: 'feasibility',
      title: t('professionals.coreValues.feasibility.title'),
      subtitle: t('professionals.coreValues.feasibility.subtitle'),
      items: [
        t('professionals.coreValues.feasibility.riskRating'),
        t('professionals.coreValues.feasibility.fatigueModel'),
        t('professionals.coreValues.feasibility.alternativePoints'),
        t('professionals.coreValues.feasibility.tradeoffAdvice'),
      ],
    },
    {
      key: 'compliance',
      title: t('professionals.coreValues.compliance.title'),
      items: [
        t('professionals.coreValues.compliance.visa'),
        t('professionals.coreValues.compliance.permit'),
        t('professionals.coreValues.compliance.environmental'),
        t('professionals.coreValues.compliance.drone'),
        t('professionals.coreValues.compliance.mountain'),
      ],
    },
    {
      key: 'riskCalculation',
      title: t('professionals.coreValues.riskCalculation.title'),
      subtitle: t('professionals.coreValues.riskCalculation.subtitle'),
      assumptions: [
        t('professionals.coreValues.riskCalculation.weather'),
        t('professionals.coreValues.riskCalculation.physical'),
        t('professionals.coreValues.riskCalculation.vehicle'),
        t('professionals.coreValues.riskCalculation.pace'),
      ],
      output: t('professionals.coreValues.riskCalculation.output'),
    },
    {
      key: 'teamCommunication',
      title: t('professionals.coreValues.teamCommunication.title'),
      items: [
        t('professionals.coreValues.teamCommunication.collaboration'),
        t('professionals.coreValues.teamCommunication.transparency'),
        t('professionals.coreValues.teamCommunication.attribution'),
      ],
    },
  ];

  const journeySteps = [
    { step: 1, key: 'discovery', title: t('professionals.journey.discovery.title'), description: t('professionals.journey.discovery.description') },
    { step: 2, key: 'understanding', title: t('professionals.journey.understanding.title'), description: t('professionals.journey.understanding.description') },
    { step: 3, key: 'profile', title: t('professionals.journey.profile.title'), description: t('professionals.journey.profile.description') },
    { step: 4, key: 'routeDirection', title: t('professionals.journey.routeDirection.title'), description: t('professionals.journey.routeDirection.description') },
    { step: 5, key: 'planning', title: t('professionals.journey.planning.title'), description: t('professionals.journey.planning.description') },
    { step: 6, key: 'preparation', title: t('professionals.journey.preparation.title'), description: t('professionals.journey.preparation.description') },
    { step: 7, key: 'execution', title: t('professionals.journey.execution.title'), description: t('professionals.journey.execution.description') },
    { step: 8, key: 'review', title: t('professionals.journey.review.title'), description: t('professionals.journey.review.description') },
  ];

  return (
    <div style={{ backgroundColor: '#fff' }}>
      {/* SECTION 1 · Hero */}
      <section
        style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '700',
            marginBottom: '1.5rem',
            color: '#000',
            lineHeight: '1.2',
        }}
      >
          {t('professionals.hero.title')}
      </h1>
        <p
          style={{
            fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
            lineHeight: '1.8',
            color: '#666',
            fontWeight: '500',
          }}
        >
          {t('professionals.hero.subtitle')}
        </p>
      </section>

      {/* SECTION 2 · 用户是谁 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(1.8rem, 4vw, 2.2rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
          }}
        >
            {t('professionals.users.title')}
        </h2>

        <div
          style={{
            display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}
        >
            {targetUsers.map((user, idx) => {
              const icons = [PersonSitting, Compass, Mountains, Route, PersonThinking];
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={user.key}
                  style={{
                    padding: '2rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    textAlign: 'center',
                    transition: 'transform 0.2s, box-shadow 0.2s',
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
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <Icon size={60} color="oklch(0.205 0 0)" />
                  </div>
                  <p
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#000',
                      margin: 0,
                    }}
                  >
                    {user.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 核心价值卡片 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
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
            {coreValueCards.map((card, idx) => {
              const icons = [Compass, Route, Mountains, PersonThinking];
              const Icon = icons[idx % icons.length];
              return (
            <div
                  key={card.key}
                  style={{
                    padding: '2.5rem',
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #e0e0e0',
                    borderRadius: '16px',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: 'oklch(0.205 0 0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <h3
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        color: '#000',
                        margin: 0,
                      }}
                    >
                      {card.title}
                    </h3>
                  </div>
                  {card.subtitle && (
                    <p
                      style={{
                        fontSize: '1rem',
                        color: '#666',
                        marginBottom: '1.5rem',
                        lineHeight: '1.6',
                      }}
                    >
                      {card.subtitle}
                    </p>
                  )}
                  {card.items && (
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      {card.items.map((item, itemIdx) => (
                        <li
                          key={itemIdx}
                          style={{
                            padding: '0.75rem 0',
                            fontSize: '1rem',
                            color: '#333',
                            borderBottom: itemIdx < card.items.length - 1 ? '1px solid #e0e0e0' : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                          }}
                        >
                          <span style={{ color: 'oklch(0.205 0 0)', fontSize: '1.2rem' }}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {card.assumptions && (
                    <div>
                      <p
                        style={{
                          fontSize: '0.95rem',
                          color: '#666',
                          marginBottom: '1rem',
                          fontWeight: '600',
                        }}
                      >
                        {t('professionals.coreValues.riskCalculation.assumptions')}:
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                          marginBottom: '1rem',
                        }}
                      >
                        {card.assumptions.map((assumption, assIdx) => (
                          <span
                            key={assIdx}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#fff',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              color: '#333',
                            }}
                          >
                            {assumption}
                          </span>
                        ))}
                      </div>
                      <p
                        style={{
                          fontSize: '1rem',
                          color: 'oklch(0.205 0 0)',
                          fontWeight: '600',
                          margin: 0,
                        }}
                      >
                        → {card.output}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 · 你在构建行业基础设施 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: '600',
              color: '#000',
              lineHeight: '1.6',
            }}
          >
            {t('professionals.infrastructure')}
          </p>
        </div>
      </section>

      {/* SECTION 5 · 品牌语气指南 */}
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
              marginBottom: '1rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('professionals.voice.title')}
          </h2>
          <p
            style={{
              fontSize: '1.2rem',
              textAlign: 'center',
              color: '#666',
              marginBottom: '4rem',
            }}
          >
            {t('professionals.voice.subtitle')}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              marginBottom: '4rem',
            }}
          >
            <div
              style={{
                padding: '2rem',
                backgroundColor: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: 'oklch(0.205 0 0)',
                  marginBottom: '1.5rem',
                }}
              >
                {t('professionals.voice.not.title')}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['mystical', 'sales', 'viral', 'overpromise'].map((key) => (
                  <li
                    key={key}
                    style={{
                      padding: '0.5rem 0',
                      fontSize: '1rem',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ color: 'oklch(0.205 0 0)' }}>❌</span>
                    {t(`professionals.voice.not.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div
              style={{
                padding: '2rem',
                backgroundColor: '#f0fdf4',
                border: '2px solid #bbf7d0',
                borderRadius: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: '#16a34a',
                  marginBottom: '1.5rem',
                }}
              >
                {t('professionals.voice.is.title')}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['integrity', 'transparency', 'understanding', 'human', 'boundary'].map((key) => (
                  <li
                    key={key}
                    style={{
                      padding: '0.5rem 0',
                      fontSize: '1rem',
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
              }}
            >
                    <span style={{ color: '#16a34a' }}>✔</span>
                    {t(`professionals.voice.is.${key}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '2rem',
            }}
          >
            {['risk', 'rejection', 'success'].map((key) => (
              <div
                key={key}
                style={{
                  padding: '2rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                }}
              >
                <h4
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#000',
                    marginBottom: '1rem',
                  }}
                >
                  {t(`professionals.voice.examples.${key}.title`)}
                </h4>
                <p
                  style={{
                    fontSize: '1rem',
                    color: '#333',
                    lineHeight: '1.8',
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  "{t(`professionals.voice.examples.${key}.text`)}"
                </p>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* SECTION 6 · 真实用户旅程图 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '1rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('professionals.journey.title')}
          </h2>
          <p
            style={{
              fontSize: '1.2rem',
              textAlign: 'center',
              color: '#666',
              marginBottom: '4rem',
            }}
          >
            {t('professionals.journey.subtitle')}
          </p>

          <div
            style={{
              display: 'grid',
              gap: '1.5rem',
            }}
          >
            {journeySteps.map((step, idx) => (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  gap: '2rem',
                  padding: '2rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'oklch(0.205 0 0)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    flexShrink: 0,
        }}
      >
                  {step.step}
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      color: '#000',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '1rem',
                      color: '#666',
                      lineHeight: '1.6',
                      margin: 0,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7 · 品牌宣言 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <h2
          style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '2rem',
              color: '#000',
            }}
          >
            {t('professionals.manifesto.title')}
          </h2>
          <div
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '2',
              color: '#333',
              marginBottom: '2rem',
            }}
          >
            <p style={{ marginBottom: '1.5rem' }}>{t('professionals.manifesto.line1')}</p>
            <p style={{ marginBottom: '1.5rem' }}>{t('professionals.manifesto.line2')}</p>
            <p style={{ marginBottom: '1.5rem' }}>{t('professionals.manifesto.line3')}</p>
          </div>
          <div
            style={{
              padding: '2rem',
              backgroundColor: '#f8f9fa',
              border: '2px solid oklch(0.205 0 0)',
              borderRadius: '12px',
              marginTop: '2rem',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
            fontWeight: '600',
                color: 'oklch(0.205 0 0)',
                margin: 0,
                lineHeight: '1.8',
              }}
            >
              {t('professionals.manifesto.commitment')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
