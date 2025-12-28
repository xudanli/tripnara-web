import { useTranslation } from 'react-i18next';

export default function RouteDirectionSection() {
  const { t } = useTranslation();
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
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontWeight: '700',
            marginBottom: '2rem',
            lineHeight: '1.3',
          }}
        >
          {t('routeDirection.title')}
        </h2>
        <p
          style={{
            fontSize: 'clamp(1.2rem, 2vw, 1.8rem)',
            fontStyle: 'italic',
            color: '#555',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: '1.8',
            whiteSpace: 'pre-line',
          }}
        >
          {t('routeDirection.description')}
        </p>
      </div>
    </section>
  );
}
