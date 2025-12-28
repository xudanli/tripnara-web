import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <header style={{ padding: '1rem', borderBottom: '1px solid #e0e0e0' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          to="/dashboard"
          style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            color: '#000',
          }}
        >
          TripNARA
        </Link>

        {isAuthenticated && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.email}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                }}
              />
            )}
            <span style={{ fontSize: '0.9rem' }}>
              {user.displayName || user.email}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              {t('nav.logout', { defaultValue: 'Logout' })}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
