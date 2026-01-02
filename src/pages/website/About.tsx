import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PersonSitting, PersonThinking, Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function AboutPage() {
  const { t } = useTranslation();

  const teamRoles = [
    { key: 'product', label: t('about.team.product') },
    { key: 'data', label: t('about.team.data') },
    { key: 'geography', label: t('about.team.geography') },
    { key: 'ai', label: t('about.team.ai') },
    { key: 'outdoor', label: t('about.team.outdoor') },
    { key: 'design', label: t('about.team.design') },
  ];

  const beliefs = [
    t('about.believe.point1'),
    t('about.believe.point2'),
    t('about.believe.point3'),
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
            marginBottom: '2rem',
            color: '#000',
            lineHeight: '1.3',
          }}
        >
          {t('about.title')}
        </h1>
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
                  fontSize: '1.1rem',
                  lineHeight: '1.8',
                  color: '#333',
                }}
              >
                {belief}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 · 团队介绍（可选匿名） */}
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
            {t('about.team.title')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {teamRoles.map((role, idx) => {
              const icons = [PersonThinking, Route, Mountains, Compass, PersonSitting, Route];
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={role.key}
                  style={{
                    padding: '2rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                    <Icon size={60} color="#000" />
                  </div>
                  <p
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#000',
                      margin: 0,
                    }}
                  >
                    {role.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5 · 联系方式 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '2rem',
              color: '#000',
            }}
          >
            {t('about.contact.title')}
          </h2>
          <Link
            to="/contact"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
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
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            联系我们
          </Link>
        </div>
      </section>

      {/* SECTION 6 · 招募 */}
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
            }}
          >
            {t('about.recruiting.text')}
          </p>
        </div>
      </section>
    </div>
  );
}
