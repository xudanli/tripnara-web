import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const isActive = (lang: string) => {
    return i18n.language === lang || i18n.language?.startsWith(lang);
  };

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => changeLanguage('en')}
        className={cn(
          'px-3 py-1 rounded border text-sm cursor-pointer transition-all',
          isActive('en')
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent text-foreground border-border hover:bg-accent'
        )}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('zh')}
        className={cn(
          'px-3 py-1 rounded border text-sm cursor-pointer transition-all',
          isActive('zh')
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-transparent text-foreground border-border hover:bg-accent'
        )}
      >
        中文
      </button>
    </div>
  );
}
