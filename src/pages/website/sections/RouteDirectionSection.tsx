import { useTranslation } from 'react-i18next';
import { RoutePlanning } from '@/components/illustrations/SceneIllustrations';

export default function RouteDirectionSection() {
  const { t } = useTranslation();
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '4rem',
          alignItems: 'center',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: '700',
              marginBottom: '2rem',
              lineHeight: '1.3',
              color: '#000',
            }}
          >
            {t('routeDirection.title')}
          </h2>
          <p
            style={{
              fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
              fontStyle: 'italic',
              color: '#333',
              lineHeight: '1.8',
              whiteSpace: 'pre-line',
            }}
          >
            {t('routeDirection.description')}
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <RoutePlanning size={400} color="#000" />
        </div>
      </div>
    </section>
  );
}
