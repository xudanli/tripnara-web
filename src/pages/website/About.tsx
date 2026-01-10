import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PersonSitting, PersonThinking, Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function AboutPage() {
  const { t } = useTranslation();

  const teamMembers = [
    {
      key: 'founder',
      icon: PersonThinking,
    },
    {
      key: 'coFounder',
      icon: Compass,
    },
    {
      key: 'designDirector',
      icon: PersonSitting,
    },
    {
      key: 'outdoorSafety',
      icon: Mountains,
    },
    {
      key: 'dataScience',
      icon: Route,
    },
    {
      key: 'contentStrategy',
      icon: PersonSitting,
    },
  ];

  const beliefs = [
    {
      point: t('about.believe.point1'),
      desc: t('about.believe.point1Desc'),
    },
    {
      point: t('about.believe.point2'),
      desc: t('about.believe.point2Desc'),
    },
    {
      point: t('about.believe.point3'),
      desc: t('about.believe.point3Desc'),
    },
    {
      point: t('about.believe.point4'),
      desc: t('about.believe.point4Desc'),
    },
    {
      point: t('about.believe.point5'),
      desc: t('about.believe.point5Desc'),
    },
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
          <PersonSitting size={180} color="#000" />
        </div>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: '700',
            marginBottom: '1.5rem',
            color: '#000',
            lineHeight: '1.3',
          }}
        >
          {t('about.title')}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            lineHeight: '1.8',
            color: '#666',
            fontStyle: 'italic',
            marginTop: '1rem',
          }}
        >
          {t('about.titleEn')}
        </p>
      </section>

      {/* SECTION 2 · 使命 */}
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
              marginBottom: '2rem',
              color: '#000',
            }}
          >
            {t('about.mission.title')}
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
              lineHeight: '1.8',
              color: '#333',
            }}
          >
            {t('about.mission.text')}
          </p>
        </div>
      </section>

      {/* SECTION 3 · 我们相信 */}
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
            {t('about.believe.title')}
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            {beliefs.map((belief, idx) => (
              <div
                key={idx}
                style={{
                  padding: '2rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <p
                  style={{
                    fontSize: '1.1rem',
                    lineHeight: '1.8',
                    color: '#000',
                    fontWeight: '600',
                    marginBottom: '0.75rem',
                  }}
                >
                  {belief.point}
                </p>
                <p
                  style={{
                    fontSize: '1rem',
                    lineHeight: '1.8',
                    color: '#666',
                    margin: 0,
                    paddingLeft: '1rem',
                    borderLeft: '3px solid #e0e0e0',
                  }}
                >
                  {belief.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 · TripNARA 的诞生 */}
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
              marginBottom: '2rem',
              color: '#000',
            }}
          >
            {t('about.origin.title')}
          </h2>
          <div
            style={{
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Route size={120} color="#000" />
          </div>
          <p
            style={{
              fontSize: 'clamp(1.2rem, 2vw, 1.5rem)',
              lineHeight: '1.8',
              color: '#333',
              fontStyle: 'italic',
              marginBottom: '2rem',
              maxWidth: '700px',
              margin: '0 auto 2rem',
            }}
          >
            {t('about.origin.quote')}
          </p>
          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              lineHeight: '1.8',
              color: '#666',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            {t('about.origin.description')}
          </p>
        </div>
      </section>

      {/* SECTION 5 · 团队介绍 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('about.team.title')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '2rem',
            }}
          >
            {teamMembers.map((member) => {
              const Icon = member.icon;
              const memberData = t(`about.team.${member.key}`, { returnObjects: true }) as any;
              return (
                <div
                  key={member.key}
                  style={{
                    padding: '2.5rem',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        backgroundColor: 'oklch(0.205 0 0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={32} color="#fff" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3
                        style={{
                          fontSize: '1.3rem',
                          fontWeight: '700',
                          color: '#000',
                          margin: 0,
                          marginBottom: '0.25rem',
                        }}
                      >
                        {memberData.role}
                      </h3>
                      <p
                        style={{
                          fontSize: '0.95rem',
                          color: '#666',
                          margin: 0,
                          lineHeight: '1.5',
                        }}
                      >
                        {memberData.title}
                      </p>
                    </div>
                  </div>

                  {memberData.education && (
                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: '#666',
                        marginBottom: '1rem',
                        lineHeight: '1.6',
                      }}
                    >
                      {memberData.education}
                    </p>
                  )}

                  <p
                    style={{
                      fontSize: '0.95rem',
                      color: '#333',
                      marginBottom: '1rem',
                      lineHeight: '1.7',
                    }}
                  >
                    {memberData.experience}
                  </p>

                  {memberData.contribution && (
                    <p
                      style={{
                        fontSize: '0.95rem',
                        color: '#000',
                        fontWeight: '600',
                        marginBottom: '1rem',
                        lineHeight: '1.7',
                        fontStyle: 'italic',
                      }}
                    >
                      {memberData.contribution}
                    </p>
                  )}

                  {memberData.achievements && memberData.achievements.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      {memberData.achievements.map((achievement: string, idx: number) => (
                        <p
                          key={idx}
                          style={{
                            fontSize: '0.9rem',
                            color: '#666',
                            marginBottom: '0.5rem',
                            lineHeight: '1.6',
                          }}
                        >
                          {achievement}
                        </p>
                      ))}
                    </div>
                  )}

                  {memberData.impact && (
                    <p
                      style={{
                        fontSize: '0.95rem',
                        color: '#333',
                        lineHeight: '1.7',
                        marginBottom: memberData.responsibilities && memberData.responsibilities.length > 0 ? '1rem' : 0,
                      }}
                    >
                      {memberData.impact}
                    </p>
                  )}

                  {memberData.responsibilities && memberData.responsibilities.length > 0 && (
                    <div
                      style={{
                        marginTop: '1.5rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #e0e0e0',
                      }}
                    >
                      <p
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '0.75rem',
                        }}
                      >
                        在团队中负责：
                      </p>
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        {memberData.responsibilities.map((responsibility: string, idx: number) => (
                          <li
                            key={idx}
                            style={{
                              padding: '0.5rem 0',
                              fontSize: '0.9rem',
                              color: '#666',
                              lineHeight: '1.6',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.5rem',
                            }}
                          >
                            <span style={{ color: 'oklch(0.205 0 0)', fontSize: '0.8rem', marginTop: '0.3rem', flexShrink: 0 }}>•</span>
                            <span>{responsibility}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '4rem',
              padding: '2.5rem',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
                lineHeight: '1.8',
                color: '#333',
                margin: 0,
              }}
            >
              {t('about.team.mission')}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6 · 加入我们 */}
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
              marginBottom: '2rem',
              color: '#000',
            }}
          >
            {t('about.recruiting.title')}
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#666',
              marginBottom: '3rem',
            }}
          >
            {t('about.recruiting.text')}
          </p>
          <Link
            to="/join-us"
            style={{
              display: 'inline-block',
              padding: '1rem 2.5rem',
              backgroundColor: 'oklch(0.205 0 0)',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = 'oklch(0.205 0 0)';
            }}
          >
            {t('about.recruiting.cta')}
          </Link>
        </div>
      </section>
    </div>
  );
}
