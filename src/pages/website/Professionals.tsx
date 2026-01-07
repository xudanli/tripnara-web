import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PersonSitting, PersonThinking, Compass, Mountains, Route } from '@/components/illustrations/SimpleIllustrations';

export default function ProfessionalsPage() {
  const { t } = useTranslation();
  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  const targetUsers = [
    {
      key: 'travelConsultant',
      label: t('professionals.users.travelConsultant'),
      desc: t('professionals.users.travelConsultantDesc'),
      icon: PersonSitting,
    },
    {
      key: 'outdoorLeader',
      label: t('professionals.users.outdoorLeader'),
      desc: t('professionals.users.outdoorLeaderDesc'),
      icon: Compass,
    },
    {
      key: 'photographyTeacher',
      label: t('professionals.users.photographyTeacher'),
      desc: t('professionals.users.photographyTeacherDesc'),
      icon: Mountains,
    },
    {
      key: 'explorationPlanner',
      label: t('professionals.users.explorationPlanner'),
      desc: t('professionals.users.explorationPlannerDesc'),
      icon: Route,
    },
    {
      key: 'b2bProductManager',
      label: t('professionals.users.b2bProductManager'),
      desc: t('professionals.users.b2bProductManagerDesc'),
      icon: PersonThinking,
    },
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
      icon: Compass,
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
      icon: Route,
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
      icon: Mountains,
    },
    {
      key: 'teamCommunication',
      title: t('professionals.coreValues.teamCommunication.title'),
      items: [
        t('professionals.coreValues.teamCommunication.collaboration'),
        t('professionals.coreValues.teamCommunication.transparency'),
        t('professionals.coreValues.teamCommunication.attribution'),
      ],
      icon: PersonThinking,
    },
  ];

  const journeySteps = [
    { step: 1, key: 'discovery', title: t('professionals.journey.discovery.title'), description: t('professionals.journey.discovery.description'), icon: Compass },
    { step: 2, key: 'understanding', title: t('professionals.journey.understanding.title'), description: t('professionals.journey.understanding.description'), icon: PersonThinking },
    { step: 3, key: 'profile', title: t('professionals.journey.profile.title'), description: t('professionals.journey.profile.description'), icon: PersonSitting },
    { step: 4, key: 'routeDirection', title: t('professionals.journey.routeDirection.title'), description: t('professionals.journey.routeDirection.description'), icon: Route },
    { step: 5, key: 'planning', title: t('professionals.journey.planning.title'), description: t('professionals.journey.planning.description'), icon: Compass },
    { step: 6, key: 'preparation', title: t('professionals.journey.preparation.title'), description: t('professionals.journey.preparation.description'), icon: Mountains },
    { step: 7, key: 'execution', title: t('professionals.journey.execution.title'), description: t('professionals.journey.execution.description'), icon: Route },
    { step: 8, key: 'review', title: t('professionals.journey.review.title'), description: t('professionals.journey.review.description'), icon: PersonThinking },
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
            {targetUsers.map((user) => {
              const Icon = user.icon;
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
                    position: 'relative',
                  }}
                  onMouseEnter={() => setHoveredUser(user.key)}
                  onMouseLeave={() => setHoveredUser(null)}
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
                      marginBottom: hoveredUser === user.key ? '0.75rem' : 0,
                      transition: 'margin-bottom 0.2s',
                    }}
                  >
                    {user.label}
                  </p>
                  {hoveredUser === user.key && (
                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: '#666',
                        lineHeight: '1.6',
                        margin: 0,
                        animation: 'fadeIn 0.2s ease-in',
                      }}
                    >
                      {user.desc}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 品牌语气指南（移到前面） */}
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
                    margin: 0,
                  }}
                >
                  {t(`professionals.voice.examples.${key}.text`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 · 核心价值卡片 */}
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
            {t('professionals.coreValues.title')}
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              textAlign: 'center',
              color: '#666',
              marginBottom: '3rem',
              fontWeight: '500',
            }}
          >
            {t('professionals.coreValues.subtitle')}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '2rem',
            }}
          >
            {coreValueCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.key}
                  style={{
                    padding: '2.5rem',
                    backgroundColor: '#fff',
                    border: '2px solid #e0e0e0',
                    borderRadius: '16px',
                    transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#999',
                    }}
                  >
                    Step {idx + 1}
                  </div>
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
                      <Icon size={24} color="#fff" />
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
                              backgroundColor: '#f8f9fa',
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

      {/* SECTION 5 · 你在构建行业基础设施 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
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
            {journeySteps.map((step, idx) => {
              const Icon = step.icon;
              return (
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
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(8px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      backgroundColor: 'oklch(0.205 0 0)',
                      color: '#fff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      flexShrink: 0,
                      gap: '0.25rem',
                    }}
                  >
                    <Icon size={24} color="#fff" />
                    <span style={{ fontSize: '0.9rem' }}>{step.step}</span>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 7 · 品牌宣言 */}
      <section
        style={{
          padding: '8rem 2rem',
          backgroundColor: '#fff',
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
            {t('professionals.manifesto.title')}
          </h2>
          <div
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '2',
              color: '#333',
              marginBottom: '3rem',
            }}
          >
            <p style={{ marginBottom: '1.5rem' }}>{t('professionals.manifesto.line1')}</p>
            <p style={{ marginBottom: '0.5rem' }}>
              {t('professionals.manifesto.line2')}
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              {t('professionals.manifesto.line3')}
            </p>
            <p style={{ marginBottom: '1.5rem' }}>
              {t('professionals.manifesto.line4')}
            </p>
            <p style={{ marginBottom: '1.5rem', fontWeight: '600' }}>
              {t('professionals.manifesto.line5')}
            </p>
          </div>
          <div
            style={{
              padding: '2.5rem',
              backgroundColor: '#f8f9fa',
              border: 'none',
              borderRadius: '12px',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
                fontWeight: '500',
                color: '#666',
                margin: 0,
                lineHeight: '1.8',
                fontStyle: 'italic',
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
