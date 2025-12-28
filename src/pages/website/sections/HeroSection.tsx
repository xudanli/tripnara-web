import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function HeroSection() {
  const { t } = useTranslation();
  return (
    <section
      style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background: Terrain Contour / Satellite View */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0,50 Q25,30 50,50 T100,50\' stroke=\'%23fff\' fill=\'none\'/%3E%3C/svg%3E")',
          backgroundSize: '200px 200px',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px' }}>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: '700',
            marginBottom: '1.5rem',
            lineHeight: '1.2',
            whiteSpace: 'pre-line',
          }}
        >
          {t('hero.title')}
        </h1>

        <p
          style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            marginBottom: '3rem',
            opacity: 0.95,
            lineHeight: '1.6',
            whiteSpace: 'pre-line',
          }}
        >
          {t('hero.subtitle')}
        </p>

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
              backgroundColor: '#fff',
              color: '#667eea',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {t('hero.startPlanning')}
          </Link>
          <Link
            to="/product"
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: 'transparent',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              border: '2px solid #fff',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {t('hero.learnMore')}
          </Link>
        </div>
      </div>
    </section>
  );
}

