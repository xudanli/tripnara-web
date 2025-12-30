import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function FinalCTASection() {
  const { t } = useTranslation();

  return (
    <section
      style={{
        padding: '6rem 2rem',
        backgroundColor: '#f8f9fa',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '700',
            marginBottom: '3rem',
            color: '#000',
            lineHeight: '1.3',
          }}
        >
          {t('finalCTA.title', {
            defaultValue: '让梦想变成真正能走完的路线',
          })}
        </h2>

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
              backgroundColor: '#DC2626',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(220, 38, 38, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(220, 38, 38, 0.3)';
            }}
          >
            {t('finalCTA.button1', { defaultValue: '开始规划 →' })}
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
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {t('finalCTA.button2', { defaultValue: '看看 TripNARA 如何做决定 →' })}
          </Link>
        </div>
      </div>
    </section>
  );
}

