import { Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';

interface NavItem {
  key: string;
  path: string;
  dropdownItems?: { key: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    key: 'home',
    path: '/',
  },
  {
    key: 'product',
    path: '/product',
    dropdownItems: [
      { key: 'routeDirection', path: '/product#route-direction' },
      { key: 'executableSchedule', path: '/product#executable-schedule' },
      { key: 'planB', path: '/product#plan-b' },
      { key: 'riskDem', path: '/product#risk-dem' },
      { key: 'travelReadiness', path: '/product#travel-readiness' },
    ],
  },
  {
    key: 'stories',
    path: '/stories',
  },
  {
    key: 'routeIntelligence',
    path: '/route-intelligence',
  },
  {
    key: 'professionals',
    path: '/professionals',
  },
  {
    key: 'pricing',
    path: '/pricing',
  },
  {
    key: 'about',
    path: '/about',
  },
];

export default function WebsiteNavbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { t } = useTranslation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const handleDropdownToggle = (key: string) => {
    setOpenDropdown(openDropdown === key ? null : key);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

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
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            fontSize: '1.5rem',
            fontWeight: '700',
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
            gap: '2.5rem',
            alignItems: 'center',
          }}
          className="desktop-nav"
        >
          {navItems.map((item) => (
            <div
              key={item.key}
              style={{ position: 'relative' }}
              ref={(el) => {
                dropdownRefs.current[item.key] = el;
              }}
              onMouseEnter={() => item.dropdownItems && setOpenDropdown(item.key)}
              onMouseLeave={() => item.dropdownItems && setOpenDropdown(null)}
            >
              {item.dropdownItems ? (
                <>
                  <button
                    onClick={() => handleDropdownToggle(item.key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: isActive(item.path) ? '#000' : '#666',
                      fontWeight: isActive(item.path) ? '700' : '400',
                      fontSize: '0.95rem',
                      padding: '0.5rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      position: 'relative',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#000';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(item.path)) {
                        e.currentTarget.style.color = '#666';
                      }
                    }}
                  >
                    {t(`nav.${item.key}`)}
                    <span style={{ fontSize: '0.7rem' }}>▼</span>
                    {isActive(item.path) && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          backgroundColor: '#000',
                        }}
                      />
                    )}
                  </button>
                  {openDropdown === item.key && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.25rem',
                        backgroundColor: '#fff',
                        border: '2px solid #DC2626',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        minWidth: '280px',
                        padding: '0.5rem 0',
                        zIndex: 1001,
                      }}
                      onMouseEnter={() => setOpenDropdown(item.key)}
                      onMouseLeave={() => setOpenDropdown(null)}
                    >
                      {item.dropdownItems.map((dropdownItem) => (
                        <Link
                          key={dropdownItem.key}
                          to={dropdownItem.path}
                          onClick={(e) => {
                            setOpenDropdown(null);
                            // Handle anchor link navigation
                            if (dropdownItem.path.includes('#')) {
                              const [path, hash] = dropdownItem.path.split('#');
                              if (location.pathname === path) {
                                // If already on the page, scroll to anchor
                                e.preventDefault();
                                const element = document.querySelector(`#${hash}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                  // Fallback: navigate normally
                                  window.location.href = dropdownItem.path;
                                }
                              }
                            }
                          }}
                          style={{
                            display: 'block',
                            padding: '0.75rem 1.25rem',
                            textDecoration: 'none',
                            color: '#333',
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {t(`nav.dropdown.${dropdownItem.key}`)}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  style={{
                    textDecoration: 'none',
                    color: isActive(item.path) ? '#000' : '#666',
                    fontWeight: isActive(item.path) ? '700' : '400',
                    fontSize: '0.95rem',
                    padding: '0.5rem 0',
                    position: 'relative',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#000';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.color = '#666';
                    }
                  }}
                >
                  {t(`nav.${item.key}`)}
                  {isActive(item.path) && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: '#000',
                      }}
                    />
                  )}
                </Link>
              )}
            </div>
          ))}

          {/* Right side buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem' }}>
            <LanguageSwitcher />
            <Link
              to="/login"
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: 'transparent',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: '500',
                border: '1px solid #e0e0e0',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {t('nav.login')}
            </Link>
            <Link
              to="/login"
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: '#DC2626',
                color: '#fff',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b91c1c';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 38, 38, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#DC2626';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
              }}
              onClick={(e) => {
                // Active state: add inset shadow
                e.currentTarget.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.1)';
                setTimeout(() => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.2)';
                }, 150);
              }}
            >
              {t('nav.startPlanning')}
            </Link>
          </div>
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
          className="mobile-menu-button"
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
          className="mobile-menu"
        >
          {/* CTA first on mobile */}
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#DC2626',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            {t('nav.startPlanning')}
          </Link>

          {navItems.map((item) => (
            <div key={item.key}>
              <Link
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: isActive(item.path) ? '#000' : '#333',
                  fontWeight: isActive(item.path) ? '700' : '400',
                  padding: '0.5rem 0',
                }}
              >
                {t(`nav.${item.key}`)}
              </Link>
              {item.dropdownItems && (
                <div style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
                  {item.dropdownItems.map((dropdownItem) => (
                    <Link
                      key={dropdownItem.key}
                      to={dropdownItem.path}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        display: 'block',
                        textDecoration: 'none',
                        color: '#666',
                        fontSize: '0.9rem',
                        padding: '0.4rem 0',
                      }}
                    >
                      {t(`nav.dropdown.${dropdownItem.key}`)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ padding: '0.5rem 0', borderTop: '1px solid #e0e0e0', marginTop: '0.5rem' }}>
            <LanguageSwitcher />
          </div>
          <Link
            to="/login"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'transparent',
              color: '#333',
              textDecoration: 'none',
              borderRadius: '8px',
              textAlign: 'center',
              border: '1px solid #e0e0e0',
            }}
          >
            {t('nav.login')}
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-button {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-menu {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
