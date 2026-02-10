import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

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
      <Button
        variant={isActive('en') ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('en')}
      >
        EN
      </Button>
      <Button
        variant={isActive('zh') ? 'default' : 'outline'}
        size="sm"
        onClick={() => changeLanguage('zh')}
      >
        中文
      </Button>
    </div>
  );
}
