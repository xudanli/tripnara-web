import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ContactUsDialog } from '@/components/common/ContactUsDialog';
import { Button } from '@/components/ui/button';

export default function Footer() {
  const { t } = useTranslation();
  const [contactUsOpen, setContactUsOpen] = useState(false);

  return (
    <footer className="py-16 px-8 pb-8 bg-foreground text-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="text-2xl font-bold mb-4">
              TripNARA
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Route Intelligence System
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-base font-semibold mb-4">
              {t('footer.navigation', { defaultValue: '导航' })}
            </h4>
            <nav className="flex flex-col gap-3">
              <Link
                to="/product"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('nav.product')}
              </Link>
              <Link
                to="/stories"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('nav.stories')}
              </Link>
              <Link
                to="/route-intelligence"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('nav.routeIntelligence')}
              </Link>
              <Link
                to="/professionals"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('nav.professionals')}
              </Link>
              <Link
                to="/pricing"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('nav.pricing')}
              </Link>
              <Link
                to="/about"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('nav.about')}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setContactUsOpen(true)}
                className="text-muted-foreground hover:text-background p-0 h-auto font-normal justify-start"
              >
                {t('footer.contact')}
              </Button>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-base font-semibold mb-4">
              {t('footer.legal', { defaultValue: '法律' })}
            </h4>
            <nav className="flex flex-col gap-3">
              <Link
                to="/terms"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('footer.terms', { defaultValue: '服务条款' })}
              </Link>
              <Link
                to="/privacy"
                className="text-muted-foreground no-underline text-sm hover:text-background transition-colors"
              >
                {t('footer.privacy', { defaultValue: '隐私政策' })}
              </Link>
            </nav>
          </div>
        </div>

        <div className="pt-8 border-t border-border/20 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TripNARA. All rights reserved.
        </div>
      </div>
      <ContactUsDialog open={contactUsOpen} onOpenChange={setContactUsOpen} />
    </footer>
  );
}

