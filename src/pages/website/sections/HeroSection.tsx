import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeroIllustration } from '@/components/illustrations/HeroIllustration';

export default function HeroSection() {
  const { t } = useTranslation();
  return (
    <section
      style={{
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#fff',
        color: '#000',
        position: 'relative',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
        }}
      >
        {/* Left side - Text content */}
        <div>
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: '700',
              marginBottom: '2rem',
              lineHeight: '1.2',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Travel emotion icon */}
            <span style={{ fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                stroke="oklch(0.205 0 0)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                {/* Compass icon with smile */}
                <circle cx="24" cy="24" r="18" />
                <circle cx="24" cy="24" r="2" fill="oklch(0.205 0 0)" />
                <line x1="24" y1="6" x2="24" y2="10" />
                <line x1="24" y1="38" x2="24" y2="42" />
                <line x1="6" y1="24" x2="10" y2="24" />
                <line x1="38" y1="24" x2="42" y2="24" />
                {/* Smile */}
                <path d="M 16 20 Q 24 26 32 20" strokeLinecap="round" />
              </svg>
            </span>
            <span>
              {(() => {
                const title = t('hero.title', {
                  defaultValue: '你的梦想，不只是 空想 的。',
                });
                const parts = title.split(/(空想)/);
                return parts.map((part, idx) => 
                  part === '空想' ? (
                    <span key={idx} style={{ color: 'oklch(0.205 0 0)' }}>空想</span>
                  ) : (
                    <span key={idx}>{part}</span>
                  )
                );
              })()}
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
              lineHeight: '1.8',
              color: '#333',
              marginBottom: '1rem',
            }}
          >
            {t('hero.subtitle1', {
              defaultValue: 'TripNARA 帮你把「我想去」变成真正能走完的旅行路线。',
            })}
          </p>

          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.2rem)',
              lineHeight: '1.8',
              color: '#666',
              marginBottom: '1.5rem',
            }}
          >
            {t('hero.subtitle2', {
              defaultValue: '从路线方向、风险评估到可执行日程，我们确保计划不仅美好，而且现实、可靠。',
            })}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              marginTop: '2.5rem',
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
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.25)';
                e.currentTarget.style.backgroundColor = 'oklch(0.25 0 0)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
                e.currentTarget.style.backgroundColor = 'oklch(0.205 0 0)';
              }}
            >
              {t('hero.cta1', { defaultValue: '开始规划我的路线' })}
            </Link>
            <Link
              to="/product"
              style={{
                padding: '1rem 2.5rem',
                backgroundColor: 'transparent',
                color: '#000',
                textDecoration: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '1.1rem',
                border: '2px solid #e0e0e0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
                e.currentTarget.style.borderColor = 'oklch(0.205 0 0)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = '#e0e0e0';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t('hero.cta2', { defaultValue: '看 TripNARA 如何做决定' })}
            </Link>
          </div>
        </div>

        {/* Right side - Illustration with micro-copy */}
        <div style={{ position: 'relative' }}>
          <HeroIllustration size={500} color="#000" highlightColor="oklch(0.205 0 0)" />
          
          {/* Micro-copy annotations */}
          <div
            style={{
              position: 'absolute',
              right: '-20px',
              top: '200px',
              fontSize: '0.85rem',
              color: '#666',
              lineHeight: '1.6',
              maxWidth: '180px',
            }}
          >
            <div style={{ marginBottom: '0.5rem' }}>
              {t('hero.microCopy1', { defaultValue: '灵感 ✓ → 路线 → 日程 → 可执行清单' })}
            </div>
            <div>
              {t('hero.microCopy2', { defaultValue: '梦想，可以被计算为可执行方案。' })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
