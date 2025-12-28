import { useTranslation } from 'react-i18next';

export default function ProductTiersSection() {
  const { t } = useTranslation();
  const tiers = [
    {
      name: t('tiers.explorer.name'),
      description: t('tiers.explorer.description'),
    },
    {
      name: t('tiers.navigator.name'),
      description: t('tiers.navigator.description'),
    },
    {
      name: t('tiers.pathfinder.name'),
      description: t('tiers.pathfinder.description'),
    },
  ];

  return (
    <section
      style={{
        padding: '6rem 2rem',
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
        {t('tiers.title')}
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
        }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.name}
            style={{
              padding: '2.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff',
              textAlign: 'center',
            }}
          >
            <h3
              style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                marginBottom: '1rem',
                color: '#007bff',
              }}
            >
              {tier.name}
            </h3>
            <p style={{ color: '#666', lineHeight: '1.6' }}>
              {tier.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
