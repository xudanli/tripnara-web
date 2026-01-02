import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Glasses, DoubleGlasses, Telescope, Route, PersonSitting } from '@/components/illustrations/SimpleIllustrations';

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
      icon: Glasses,
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
      icon: DoubleGlasses,
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
      icon: Telescope,
    },
  ];

  const faqs = [
    { question: t('pricing.faq.cancelable'), answer: '...' },
    { question: t('pricing.faq.teamSupport'), answer: '...' },
    { question: t('pricing.faq.dataPrivacy'), answer: '...' },
    { question: t('pricing.faq.countrySupport'), answer: '...' },
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
          <Route size={120} color="#000" />
          <PersonSitting size={120} color="#000" />
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
          {t('pricing.title')}
        </h1>
        <p
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            lineHeight: '1.8',
            color: '#666',
          }}
        >
          {t('pricing.heroSubtitle')}
        </p>
      </section>

      {/* SECTION 2 · 方案卡片 */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
            }}
          >
            {plans.map((plan) => {
              const IconComponent = plan.icon;
              return (
                <div
                  key={plan.name}
                  style={{
                    padding: '2.5rem',
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '12px',
                    transition: 'all 0.3s',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#e0e0e0';
                  }}
                >
                  <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <IconComponent size={60} color="#000" />
                  </div>

                  <h2
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      marginBottom: '0.5rem',
                      textAlign: 'center',
                      color: '#000',
                    }}
                  >
                    {plan.name}
                  </h2>
                  <p
                    style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: '#000',
                      marginBottom: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    {plan.price}
                  </p>
                  <p
                    style={{
                      color: '#666',
                      marginBottom: '2rem',
                      textAlign: 'center',
                      fontSize: '0.95rem',
                    }}
                  >
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
                          fontSize: '0.95rem',
                          color: '#333',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            color: '#000',
                            fontWeight: 'bold',
                          }}
                        >
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 3 · FAQ */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 2.5rem)',
              fontWeight: '700',
              marginBottom: '3rem',
              textAlign: 'center',
              color: '#000',
            }}
          >
            {t('pricing.faq.title')}
          </h2>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  padding: '2rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  backgroundColor: '#f8f9fa',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    marginBottom: '1rem',
                    color: '#000',
                  }}
                >
                  {faq.question}
                </h3>
                <p style={{ color: '#666', lineHeight: '1.7' }}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 · CTA */}
      <section
        style={{
          padding: '6rem 2rem',
          backgroundColor: '#f8f9fa',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/login"
              style={{
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
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t('pricing.cta.try')}
            </Link>
            <Link
              to="/contact"
              style={{
                padding: '1rem 2.5rem',
                backgroundColor: 'transparent',
                color: '#000',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1.1rem',
                border: '2px solid #e0e0e0',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {t('pricing.cta.contact')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
