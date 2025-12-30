import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';

export default function HeroFeaturesSection() {
  const { t } = useTranslation();
  const features = [
    {
      icon: Route,
      title: t('heroFeatures.card1.title', { defaultValue: '先判断：这条路线是否应该存在' }),
      description: t('heroFeatures.card1.description', {
        defaultValue: '不是把更多景点塞进日程，而是先确认方向是否合理、可达、可执行。',
      }),
      tag: t('heroFeatures.card1.tag', { defaultValue: '路线方向引擎 · RouteDirection' }),
    },
    {
      icon: Compass,
      title: t('heroFeatures.card2.title', { defaultValue: '每天都能走完，而不是一堆点' }),
      description: t('heroFeatures.card2.description', {
        defaultValue: 'TripNARA 会根据车程、停留、节奏与余量生成可执行日程结构。',
      }),
    },
    {
      icon: Mountains,
      title: t('heroFeatures.card3.title', { defaultValue: '如果情况变化，也不会崩盘' }),
      description: t('heroFeatures.card3.description', {
        defaultValue: '关闭？天气？体力不支？系统会自动生成最优替换方案。',
      }),
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
        {/* Feature Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
            marginBottom: '4rem',
          }}
        >
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={idx}
                style={{
                  padding: '2.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <IconComponent size={70} color="#000" />
                </div>

                <h3
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    color: '#000',
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  style={{
                    fontSize: '1rem',
                    color: '#666',
                    textAlign: 'center',
                    lineHeight: '1.7',
                    marginBottom: feature.tag ? '1rem' : '0',
                  }}
                >
                  {feature.description}
                </p>

                {feature.tag && (
                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <span
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#f5f5f5',
                        color: '#666',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      {feature.tag}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              color: '#DC2626',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1rem',
              borderBottom: '2px solid #DC2626',
              paddingBottom: '0.25rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {t('heroFeatures.bottomCTA', { defaultValue: '把梦想变成路线 →' })}
          </Link>
        </div>
      </div>
    </section>
  );
}
