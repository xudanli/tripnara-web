import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ClosingSection() {
  const { t } = useTranslation();
  return (
    <section
      style={{
        padding: '6rem 2rem',
        textAlign: 'center',
        backgroundColor: '#000',
        color: '#fff',
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
            marginBottom: '2rem',
            lineHeight: '1.3',
            whiteSpace: 'pre-line',
          }}
        >
          {t('closing.title')}
        </h2>

        <Link
          to="/login"
          style={{
            display: 'inline-block',
            padding: '1rem 2.5rem',
            backgroundColor: '#007bff',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '1.1rem',
            marginTop: '2rem',
          }}
        >
          {t('closing.cta')}
        </Link>
      </div>
    </section>
  );
}
