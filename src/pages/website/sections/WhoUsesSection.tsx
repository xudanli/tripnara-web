import { useTranslation } from 'react-i18next';

export default function WhoUsesSection() {
  const { t } = useTranslation();
  const users = [
    t('whoUses.deepTravelers'),
    t('whoUses.expeditionTeams'),
    t('whoUses.insurance'),
    t('whoUses.travelDesigners'),
  ];

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
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '4rem',
          }}
        >
          {t('whoUses.title')}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
          }}
        >
          {users.map((user) => (
            <div
              key={user}
              style={{
                padding: '2rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#333',
                }}
              >
                {user}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
