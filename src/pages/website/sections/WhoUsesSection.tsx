import { useTranslation } from 'react-i18next';
import { PersonThinking, Compass, Mountains, Route } from '@/components/illustrations/SimpleIllustrations';

export default function WhoUsesSection() {
  const { t } = useTranslation();
  const users = [
    {
      name: t('whoUses.deepTravelers'),
      icon: PersonThinking,
    },
    {
      name: t('whoUses.expeditionTeams'),
      icon: Compass,
    },
    {
      name: t('whoUses.insurance'),
      icon: Mountains,
    },
    {
      name: t('whoUses.travelDesigners'),
      icon: Route,
    },
  ];

  return (
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#fff',
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
            color: '#000',
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
          {users.map((user) => {
            const IconComponent = user.icon;
            return (
              <div
                key={user.name}
                style={{
                  padding: '2.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  textAlign: 'center',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div
                  style={{
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <IconComponent size={user.icon === PersonThinking ? 120 : 80} color="#000" />
                </div>
                <h3
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    color: '#000',
                  }}
                >
                  {user.name}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
