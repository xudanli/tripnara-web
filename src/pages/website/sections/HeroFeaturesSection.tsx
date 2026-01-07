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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle map texture background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L30 15 L50 10 L70 20 L90 15' stroke='%23000' stroke-width='1' fill='none'/%3E%3Cpath d='M10 30 L30 35 L50 30 L70 40 L90 35' stroke='%23000' stroke-width='1' fill='none'/%3E%3Cpath d='M10 50 L30 55 L50 50 L70 60 L90 55' stroke='%23000' stroke-width='1' fill='none'/%3E%3Cpath d='M10 70 L30 75 L50 70 L70 80 L90 75' stroke='%23000' stroke-width='1' fill='none'/%3E%3Ccircle cx='30' cy='15' r='2' fill='%23000'/%3E%3Ccircle cx='50' cy='10' r='2' fill='%23000'/%3E%3Ccircle cx='70' cy='20' r='2' fill='%23000'/%3E%3Ccircle cx='30' cy='35' r='2' fill='%23000'/%3E%3Ccircle cx='50' cy='30' r='2' fill='%23000'/%3E%3Ccircle cx='70' cy='40' r='2' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
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
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)';
                  e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                  e.currentTarget.style.backgroundColor = '#fefefe';
                  // Icon float animation
                  const iconContainer = e.currentTarget.querySelector('.icon-container') as HTMLElement;
                  if (iconContainer) {
                    iconContainer.style.transform = 'translateY(-4px)';
                    iconContainer.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.backgroundColor = '#fff';
                  // Reset icon
                  const iconContainer = e.currentTarget.querySelector('.icon-container') as HTMLElement;
                  if (iconContainer) {
                    iconContainer.style.transform = 'translateY(0)';
                  }
                }}
              >
                <div 
                  className="icon-container"
                  style={{ 
                    marginBottom: '1.5rem', 
                    display: 'flex', 
                    justifyContent: 'center',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
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

        {/* User Testimonials */}
        <div
          style={{
            marginBottom: '4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
          }}
        >
          {[
            {
              quote: t('heroFeatures.testimonial1.quote', {
                defaultValue: '终于不用再担心"计划赶不上变化"了。TripNARA 让我第一次真正走完了整条路线。',
              }),
              author: t('heroFeatures.testimonial1.author', { defaultValue: '张明' }),
              role: t('heroFeatures.testimonial1.role', { defaultValue: '深度旅行者' }),
            },
            {
              quote: t('heroFeatures.testimonial2.quote', {
                defaultValue: '作为户外领队，TripNARA 的风险评估功能帮我们避免了很多潜在问题。',
              }),
              author: t('heroFeatures.testimonial2.author', { defaultValue: '李华' }),
              role: t('heroFeatures.testimonial2.role', { defaultValue: '户外领队' }),
            },
          ].map((testimonial, idx) => (
            <div
              key={idx}
              style={{
                padding: '2rem',
                backgroundColor: '#fafafa',
                borderRadius: '12px',
                border: '1px solid #f0f0f0',
                position: 'relative',
              }}
            >
              {/* Quote mark */}
              <div
                style={{
                  fontSize: '4rem',
                  lineHeight: '1',
                  color: 'oklch(0.205 0 0)',
                  opacity: 0.15,
                  position: 'absolute',
                  top: '1rem',
                  left: '1.5rem',
                  fontFamily: 'Georgia, serif',
                }}
              >
                "
              </div>
              <p
                style={{
                  fontSize: '1rem',
                  lineHeight: '1.7',
                  color: '#333',
                  marginBottom: '1.5rem',
                  paddingLeft: '1rem',
                  fontStyle: 'italic',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {testimonial.quote}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  paddingLeft: '1rem',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'oklch(0.205 0 0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                  }}
                >
                  {testimonial.author.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#000', fontSize: '0.95rem' }}>
                    {testimonial.author}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              color: '#fff',
              backgroundColor: 'oklch(0.205 0 0)',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '1.1rem',
              padding: '1rem 2.5rem',
              borderRadius: '8px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
              e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.backgroundColor = 'oklch(0.205 0 0)';
            }}
          >
            {t('heroFeatures.bottomCTA', { defaultValue: '把梦想变成路线 →' })}
          </Link>
        </div>
      </div>
    </section>
  );
}
