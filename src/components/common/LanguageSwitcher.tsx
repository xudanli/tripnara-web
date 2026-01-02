import { useTranslation } from 'react-i18next';

// 品牌色：酒红色
const BRAND_RED = '#DC2626';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}
    >
      <button
        onClick={() => changeLanguage('en')}
        style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: i18n.language === 'en' ? BRAND_RED : 'transparent',
          color: i18n.language === 'en' ? '#fff' : '#333',
          border: `1px solid ${BRAND_RED}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (i18n.language !== 'en') {
            e.currentTarget.style.backgroundColor = '#FEF2F2';
          }
        }}
        onMouseLeave={(e) => {
          if (i18n.language !== 'en') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('zh')}
        style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: i18n.language === 'zh' ? BRAND_RED : 'transparent',
          color: i18n.language === 'zh' ? '#fff' : '#333',
          border: `1px solid ${BRAND_RED}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          if (i18n.language !== 'zh') {
            e.currentTarget.style.backgroundColor = '#FEF2F2';
          }
        }}
        onMouseLeave={(e) => {
          if (i18n.language !== 'zh') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        中文
      </button>
    </div>
  );
}

