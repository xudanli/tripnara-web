import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';

const navItems = [
  { path: '/', key: 'home' },
  { path: '/product', key: 'product' },
  { path: '/route-intelligence', key: 'routeIntelligence' },
  { path: '/professionals', key: 'professionals' },
  { path: '/pricing', key: 'pricing' },
  { path: '/stories', key: 'stories' },
  { path: '/about', key: 'about' },
  { path: '/contact', key: 'contact' },
];

export default function WebsiteNavbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: '#fff',
        borderBottom: '1px solid #e0e0e0',
        padding: '1rem 2rem',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            color: '#000',
          }}
        >
          TripNARA
        </Link>

        {/* Desktop Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                textDecoration: 'none',
                color: location.pathname === item.path ? '#007bff' : '#333',
                fontWeight: location.pathname === item.path ? '600' : '400',
                fontSize: '0.9rem',
              }}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <LanguageSwitcher />
          <Link
            to="/login"
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#007bff',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            {t('nav.login')}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
          }}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1rem',
            borderTop: '1px solid #e0e0e0',
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              style={{
                textDecoration: 'none',
                color: location.pathname === item.path ? '#007bff' : '#333',
              }}
            >
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <div style={{ padding: '0.5rem 0' }}>
            <LanguageSwitcher />
          </div>
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            {t('nav.login')}
          </Link>
        </div>
      )}
    </nav>
  );
}

