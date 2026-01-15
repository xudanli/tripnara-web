import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeroIllustration } from '@/components/illustrations/HeroIllustration';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { Button } from '@/components/ui/button';

export default function HeroSection() {
  const { t } = useTranslation();
  
  const title = t('hero.title', {
    defaultValue: '你的梦想，不只是 空想 的。',
  });
  const titleParts = title.split(/(空想)/);

  return (
    <WebsiteSection
      className="min-h-[90vh] flex items-center relative"
      variant="default"
      padding="lg"
      maxWidth="xl"
    >
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left side - Text content */}
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight text-foreground flex items-center gap-4 flex-wrap">
            {/* Travel emotion icon */}
            <span className="text-3xl md:text-4xl lg:text-5xl">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block align-middle text-primary"
              >
                {/* Compass icon with smile */}
                <circle cx="24" cy="24" r="18" />
                <circle cx="24" cy="24" r="2" fill="currentColor" />
                <line x1="24" y1="6" x2="24" y2="10" />
                <line x1="24" y1="38" x2="24" y2="42" />
                <line x1="6" y1="24" x2="10" y2="24" />
                <line x1="38" y1="24" x2="42" y2="24" />
                {/* Smile */}
                <path d="M 16 20 Q 24 26 32 20" strokeLinecap="round" />
              </svg>
            </span>
            <span>
              {titleParts.map((part, idx) => 
                part === '空想' ? (
                  <span key={idx} className="text-primary">空想</span>
                ) : (
                  <span key={idx}>{part}</span>
                )
              )}
            </span>
          </h1>

          <p className="text-lg md:text-xl lg:text-2xl leading-relaxed text-muted-foreground mb-4">
            {t('hero.subtitle1', {
              defaultValue: 'TripNARA 帮你把「我想去」变成真正能走完的旅行路线。',
            })}
          </p>

          <p className="text-base md:text-lg lg:text-xl leading-relaxed text-muted-foreground mb-6">
            {t('hero.subtitle2', {
              defaultValue: '从路线方向、风险评估到可执行日程，我们确保计划不仅美好，而且现实、可靠。',
            })}
          </p>

          <div className="flex gap-4 flex-wrap mt-10">
            <Button asChild size="lg" className="text-base px-8 py-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-1">
              <Link to="/login">
                {t('hero.cta1', { defaultValue: '开始规划我的路线' })}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="text-base px-8 py-6 border-2 hover:bg-accent transition-all hover:-translate-y-1"
            >
              <Link to="/product">
                {t('hero.cta2', { defaultValue: '看 TripNARA 如何做决定' })}
              </Link>
            </Button>
          </div>
        </div>

        {/* Right side - Illustration with micro-copy */}
        <div className="relative">
          <HeroIllustration size={500} color="currentColor" highlightColor="currentColor" className="text-foreground" />
          
          {/* Micro-copy annotations */}
          <div className="absolute right-0 md:-right-5 top-48 text-sm text-muted-foreground leading-relaxed max-w-[180px]">
            <div className="mb-2">
              {t('hero.microCopy1', { defaultValue: '灵感 ✓ → 路线 → 日程 → 可执行清单' })}
            </div>
            <div>
              {t('hero.microCopy2', { defaultValue: '梦想，可以被计算为可执行方案。' })}
            </div>
          </div>
        </div>
      </div>
    </WebsiteSection>
  );
}
