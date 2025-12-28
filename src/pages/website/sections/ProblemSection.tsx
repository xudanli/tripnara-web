import { useTranslation } from 'react-i18next';

export default function ProblemSection() {
  const { t } = useTranslation();
  return (
    <section
      style={{
        padding: '6rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              marginBottom: '1.5rem',
              lineHeight: '1.3',
              whiteSpace: 'pre-line',
            }}
          >
            {t('problem.title')}
          </h2>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Regular Trip - Red Hotspots */}
          <div
            style={{
              padding: '1.5rem',
              border: '2px solid #ff4444',
              borderRadius: '8px',
              backgroundColor: '#fff5f5',
            }}
          >
            <h3 style={{ marginBottom: '1rem', color: '#ff4444' }}>
              {t('problem.regularTrip')}
            </h3>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              {['Place A', 'Place B', 'Place C', 'Place D', 'Place E'].map(
                (place) => (
                  <span
                    key={place}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#ff4444',
                      color: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                    }}
                  >
                    {place}
                  </span>
                )
              )}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              {t('problem.regularTripDesc')}
            </p>
          </div>

          {/* TripNARA - Linear Structure */}
          <div
            style={{
              padding: '1.5rem',
              border: '2px solid #007bff',
              borderRadius: '8px',
              backgroundColor: '#f0f8ff',
            }}
          >
            <h3 style={{ marginBottom: '1rem', color: '#007bff' }}>
              {t('problem.tripnaraRoute')}
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {['A', '→', 'B', '→', 'C', '→', 'D'].map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: item === '→' ? '0' : '0.5rem 1rem',
                    backgroundColor: item === '→' ? 'transparent' : '#007bff',
                    color: item === '→' ? '#007bff' : '#fff',
                    borderRadius: '4px',
                    fontSize: item === '→' ? '1.2rem' : '0.9rem',
                    fontWeight: item === '→' ? 'bold' : 'normal',
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              {t('problem.tripnaraRouteDesc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

