import { useTranslation } from 'react-i18next';

export default function ProfessionalUsersSection() {
  const { t } = useTranslation();

  const users = [
    t('professionalUsers.user1', { defaultValue: '旅行顾问' }),
    t('professionalUsers.user2', { defaultValue: '徒步领队' }),
    t('professionalUsers.user3', { defaultValue: '探索摄影师' }),
    t('professionalUsers.user4', { defaultValue: '户外向导' }),
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
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            fontWeight: '700',
            marginBottom: '3rem',
            color: '#000',
          }}
        >
          {t('professionalUsers.title', {
            defaultValue: 'TripNARA 也被这些人使用',
          })}
        </h2>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'center',
            marginBottom: '3rem',
          }}
        >
          {users.map((user, idx) => (
            <div
              key={idx}
              style={{
                padding: '1rem 2rem',
                backgroundColor: '#fff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: '500',
                color: '#333',
              }}
            >
              ✔ {user}
            </div>
          ))}
        </div>

        <p
          style={{
            fontSize: '1.1rem',
            color: '#666',
            lineHeight: '1.8',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          {t('professionalUsers.description', {
            defaultValue: '可信 · 专业 · 决策能力',
          })}
        </p>
      </div>
    </section>
  );
}

