import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useAuth } from '@/hooks/useAuth';
import Logo from '../common/Logo';
import { cn } from '@/lib/utils';

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
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, userMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

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
    <nav className="sticky top-0 z-[1000] bg-background border-b border-border py-4 px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link
          to="/"
          className="no-underline text-foreground flex items-center"
        >
          <Logo variant="full" size={28} className="text-foreground" />
        </Link>

        {/* Desktop Navigation */}
        <div className="desktop-nav flex gap-10 items-center">
          {navItems.map((item) => (
            <div
              key={item.key}
              className="relative"
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
                    className={cn(
                      'bg-transparent border-none cursor-pointer py-2 flex items-center gap-1 relative transition-colors text-sm',
                      isActive(item.path) ? 'text-foreground font-bold' : 'text-muted-foreground font-normal',
                      'hover:text-foreground'
                    )}
                  >
                    {t(`nav.${item.key}`)}
                    <span className="text-[0.7rem]">▼</span>
                    {isActive(item.path) && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
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
                        border: '2px solid oklch(0.205 0 0)',
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
            {isAuthenticated ? (
              <div
                style={{ position: 'relative' }}
                ref={(el) => {
                  userMenuRef.current = el;
                }}
                onMouseEnter={() => setUserMenuOpen(true)}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500',
                    color: '#333',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    if (!userMenuOpen) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user?.displayName || user?.email || 'User'}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'oklch(0.205 0 0)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                      }}
                    >
                      {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{user?.displayName || user?.email || t('nav.user')}</span>
                  <span style={{ fontSize: '0.7rem' }}>▼</span>
                </button>
                {userMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      backgroundColor: '#fff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      minWidth: '200px',
                      padding: '0.5rem 0',
                      zIndex: 1001,
                    }}
                  >
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid #e0e0e0',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#000' }}>
                        {user?.displayName || user?.email}
                      </div>
                      {user?.email && user?.displayName && (
                        <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                    <Link
                      to="/dashboard/settings?tab=preferences"
                      onClick={() => setUserMenuOpen(false)}
                      style={{
                        display: 'block',
                        padding: '0.75rem 1rem',
                        textDecoration: 'none',
                        color: '#333',
                        fontSize: '0.95rem',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {t('nav.preferences')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'oklch(0.205 0 0)',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                style={{
                  padding: '0.6rem 1.5rem',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
                onClick={(e) => {
                  // Active state: add inset shadow
                  const target = e.currentTarget;
                  if (target) {
                    target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.2)';
                    setTimeout(() => {
                      if (target) {
                        target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                      }
                    }, 150);
                  }
                }}
              >
                {t('nav.startPlanning')}
              </Link>
            )}
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
            to={isAuthenticated ? "/dashboard" : "/login"}
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#1a1a1a',
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
          {isAuthenticated ? (
            <>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderTop: '1px solid #e0e0e0',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user?.displayName || user?.email || 'User'}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'oklch(0.205 0 0)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: '600',
                    }}
                  >
                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.95rem', color: '#000' }}>
                    {user?.displayName || user?.email}
                  </div>
                  {user?.email && user.displayName && (
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <Link
                to="/dashboard/settings?tab=preferences"
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
                {t('nav.preferences')}
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  color: 'oklch(0.205 0 0)',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid oklch(0.205 0 0)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                }}
              >
                {t('nav.logout')}
              </button>
            </>
          ) : null}
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
