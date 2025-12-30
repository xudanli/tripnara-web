import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PersonSitting, PersonThinking, Compass, Mountains, Route } from '@/components/illustrations/SimpleIllustrations';

export default function ProfessionalsPage() {
  const { t } = useTranslation();

  const targetUsers = [
    { key: 'leader', label: t('professionals.leader') },
    { key: 'travelConsultant', label: t('professionals.travelConsultant') },
    { key: 'outdoorOrg', label: t('professionals.outdoorOrg') },
    { key: 'transportPlanner', label: t('professionals.transportPlanner') },
    { key: 'explorationPhotographer', label: t('professionals.explorationPhotographer') },
  ];

  const capabilities = [
    t('professionals.capabilities.riskManagement'),
    t('professionals.capabilities.routeEvaluation'),
    t('professionals.capabilities.structureControl'),
    t('professionals.capabilities.teamRhythm'),
  ];

  const cooperationMethods = [
    { key: 'beta', label: t('professionals.cooperation.beta') },
    { key: 'api', label: t('professionals.cooperation.api') },
    { key: 'jointExperiment', label: t('professionals.cooperation.jointExperiment') },
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
        <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <Compass size={120} color="#000" />
          <Route size={120} color="#000" />
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
          {t('professionals.title')}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            lineHeight: '1.8',
            color: '#666',
          }}
        >
          {t('professionals.subtitle')}
        </p>
      </section>

      {/* SECTION 2 · 适用对象 */}
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
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('professionals.suitableFor')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {targetUsers.map((user, idx) => {
              const icons = [PersonSitting, Compass, Mountains, Route, PersonSitting];
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
                    {user.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 · 能力清单 */}
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
            {t('professionals.capabilities.title')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {capabilities.map((capability, idx) => {
              const icons = [Mountains, Route, Compass, PersonThinking];
              const Icon = icons[idx % icons.length];
              return (
                <div
                  key={idx}
                  style={{
                    padding: '2rem',
                    backgroundColor: '#f8f9fa',
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
                      color: '#333',
                      margin: 0,
                    }}
                  >
                    {capability}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 4 · 专业背书语气 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontSize: '1.2rem',
              color: '#333',
            }}
          >
            <span style={{ fontWeight: '600' }}>{t('professionals.trustworthy')}</span>
            <span>·</span>
            <span style={{ fontWeight: '600' }}>{t('professionals.rational')}</span>
            <span>·</span>
            <span style={{ fontWeight: '600' }}>{t('professionals.traceable')}</span>
            <span>·</span>
            <span style={{ fontWeight: '600' }}>{t('professionals.evidenceBased')}</span>
          </div>
        </div>
      </section>

      {/* SECTION 5 · 合作方式 */}
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
            {t('professionals.cooperation.title')}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {cooperationMethods.map((method) => (
              <div
                key={method.key}
                style={{
                  padding: '2rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#000',
                    margin: 0,
                  }}
                >
                  {method.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
