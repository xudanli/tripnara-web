import { useTranslation } from 'react-i18next';

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
          backgroundColor: i18n.language === 'en' ? '#007bff' : 'transparent',
          color: i18n.language === 'en' ? '#fff' : '#333',
          border: '1px solid #007bff',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('zh')}
        style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: i18n.language === 'zh' ? '#007bff' : 'transparent',
          color: i18n.language === 'zh' ? '#fff' : '#333',
          border: '1px solid #007bff',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        中文
      </button>
    </div>
  );
}

