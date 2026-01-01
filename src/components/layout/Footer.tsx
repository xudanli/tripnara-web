import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContactUsDialog } from '@/components/common/ContactUsDialog';

export default function Footer() {
  const { t } = useTranslation();
  const [contactUsOpen, setContactUsOpen] = useState(false);

  return (
    <footer
      style={{
        padding: '4rem 2rem 2rem',
        backgroundColor: '#000',
        color: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem',
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1rem',
              }}
            >
              TripNARA
            </div>
            <p
              style={{
                fontSize: '0.9rem',
                color: '#999',
                lineHeight: '1.6',
              }}
            >
              Route Intelligence System
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {t('footer.navigation', { defaultValue: '导航' })}
            </h4>
            <nav
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <Link
                to="/product"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('nav.product')}
              </Link>
              <Link
                to="/stories"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('nav.stories')}
              </Link>
              <Link
                to="/route-intelligence"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('nav.routeIntelligence')}
              </Link>
              <Link
                to="/professionals"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('nav.professionals')}
              </Link>
              <Link
                to="/pricing"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('nav.pricing')}
              </Link>
              <Link
                to="/about"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('nav.about')}
              </Link>
              <button
                onClick={() => setContactUsOpen(true)}
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
              >
                {t('footer.contact')}
              </button>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4
              style={{
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1rem',
              }}
            >
              {t('footer.legal', { defaultValue: '法律' })}
            </h4>
            <nav
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <Link
                to="/terms"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('footer.terms', { defaultValue: '服务条款' })}
              </Link>
              <Link
                to="/privacy"
                style={{ color: '#ccc', textDecoration: 'none', fontSize: '0.9rem' }}
              >
                {t('footer.privacy', { defaultValue: '隐私政策' })}
              </Link>
            </nav>
          </div>
        </div>

        <div
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid #333',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#666',
          }}
        >
          © {new Date().getFullYear()} TripNARA. All rights reserved.
        </div>
      </div>
      <ContactUsDialog open={contactUsOpen} onOpenChange={setContactUsOpen} />
    </footer>
  );
}

