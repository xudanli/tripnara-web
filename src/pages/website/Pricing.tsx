import { useTranslation } from 'react-i18next';

export default function PricingPage() {
  const { t } = useTranslation();
  const plans = [
    {
      name: t('pricing.explorer.name'),
      price: t('pricing.explorer.price'),
      description: t('pricing.explorer.description'),
      features: [
        t('pricing.explorer.features.basic'),
        t('pricing.explorer.features.dem'),
        t('pricing.explorer.features.log'),
      ],
    },
    {
      name: t('pricing.navigator.name'),
      price: t('pricing.navigator.price'),
      description: t('pricing.navigator.description'),
      features: [
        t('pricing.navigator.features.advanced'),
        t('pricing.navigator.features.personas'),
        t('pricing.navigator.features.routeDirection'),
        t('pricing.navigator.features.support'),
      ],
    },
    {
      name: t('pricing.pathfinder.name'),
      price: t('pricing.pathfinder.price'),
      description: t('pricing.pathfinder.description'),
      features: [
        t('pricing.pathfinder.features.full'),
        t('pricing.pathfinder.features.compliance'),
        t('pricing.pathfinder.features.integrations'),
        t('pricing.pathfinder.features.dedicated'),
      ],
    },
  ];

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: 'clamp(2.5rem, 5vw, 4rem)',
          fontWeight: '700',
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        {t('pricing.title')}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
        }}
      >
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              padding: '2.5rem',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff',
            }}
          >
            <h2
              style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
              }}
            >
              {plan.name}
            </h2>
            <p
              style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#007bff',
                marginBottom: '1rem',
              }}
            >
              {plan.price}
            </p>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              {plan.description}
            </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {plan.features.map((feature, idx) => (
                <li
                  key={idx}
                  style={{
                    marginBottom: '0.75rem',
                    paddingLeft: '1.5rem',
                    position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', left: 0 }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
