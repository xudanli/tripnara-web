import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Route, Compass, Mountains } from '@/components/illustrations/SimpleIllustrations';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function HeroFeaturesSection() {
  const { t } = useTranslation();
  const features = [
    {
      icon: Route,
      title: t('heroFeatures.card1.title', { defaultValue: '先判断：这条路线是否应该存在' }),
      description: t('heroFeatures.card1.description', {
        defaultValue: '不是把更多景点塞进日程，而是先确认方向是否合理、可达、可执行。',
      }),
      tag: t('heroFeatures.card1.tag', { defaultValue: '路线方向引擎 · RouteDirection' }),
    },
    {
      icon: Compass,
      title: t('heroFeatures.card2.title', { defaultValue: '每天都能走完，而不是一堆点' }),
      description: t('heroFeatures.card2.description', {
        defaultValue: 'TripNARA 会根据车程、停留、节奏与余量生成可执行日程结构。',
      }),
    },
    {
      icon: Mountains,
      title: t('heroFeatures.card3.title', { defaultValue: '如果情况变化，也不会崩盘' }),
      description: t('heroFeatures.card3.description', {
        defaultValue: '关闭？天气？体力不支？系统会自动生成最优替换方案。',
      }),
    },
  ];

  const testimonials = [
    {
      quote: t('heroFeatures.testimonial1.quote', {
        defaultValue: '终于不用再担心"计划赶不上变化"了。TripNARA 让我第一次真正走完了整条路线。',
      }),
      author: t('heroFeatures.testimonial1.author', { defaultValue: '张明' }),
      role: t('heroFeatures.testimonial1.role', { defaultValue: '深度旅行者' }),
    },
    {
      quote: t('heroFeatures.testimonial2.quote', {
        defaultValue: '作为户外领队，TripNARA 的风险评估功能帮我们避免了很多潜在问题。',
      }),
      author: t('heroFeatures.testimonial2.author', { defaultValue: '李华' }),
      role: t('heroFeatures.testimonial2.role', { defaultValue: '户外领队' }),
    },
  ];

  return (
    <WebsiteSection variant="default" padding="xl" maxWidth="xl" className="relative overflow-hidden">
      {/* Subtle map texture background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10 L30 15 L50 10 L70 20 L90 15' stroke='%23000' stroke-width='1' fill='none'/%3E%3Cpath d='M10 30 L30 35 L50 30 L70 40 L90 35' stroke='%23000' stroke-width='1' fill='none'/%3E%3Cpath d='M10 50 L30 55 L50 50 L70 60 L90 55' stroke='%23000' stroke-width='1' fill='none'/%3E%3Cpath d='M10 70 L30 75 L50 70 L70 80 L90 75' stroke='%23000' stroke-width='1' fill='none'/%3E%3Ccircle cx='30' cy='15' r='2' fill='%23000'/%3E%3Ccircle cx='50' cy='10' r='2' fill='%23000'/%3E%3Ccircle cx='70' cy='20' r='2' fill='%23000'/%3E%3Ccircle cx='30' cy='35' r='2' fill='%23000'/%3E%3Ccircle cx='50' cy='30' r='2' fill='%23000'/%3E%3Ccircle cx='70' cy='40' r='2' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        }}
      />
      
      <div className="relative z-10">
        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16">
          {features.map((feature, idx) => {
            const IconComponent = feature.icon;
            return (
              <WebsiteCard
                key={idx}
                hover
                className="cursor-pointer group"
              >
                <CardContent className="p-10">
                  <div className="icon-container mb-6 flex justify-center transition-transform duration-300 group-hover:-translate-y-1">
                    <IconComponent size={70} className="text-foreground" />
                  </div>

                  <h3 className="text-xl font-bold mb-4 text-center text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-base text-muted-foreground text-center leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {feature.tag && (
                    <div className="text-center mt-4">
                      <Badge variant="outline" className="text-xs px-3 py-1">
                        {feature.tag}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </WebsiteCard>
            );
          })}
        </div>

        {/* User Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {testimonials.map((testimonial, idx) => (
            <WebsiteCard key={idx} className="bg-muted/30 border-muted">
              <CardContent className="p-8 relative">
                {/* Quote mark */}
                <div className="text-6xl leading-none text-primary opacity-15 absolute top-4 left-6 font-serif">
                  "
                </div>
                <p className="text-base leading-relaxed text-foreground mb-6 pl-4 italic relative z-10">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3 pl-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">
                      {testimonial.author}
                    </div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </WebsiteCard>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <Button asChild size="lg" className="text-lg px-10 py-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
            <Link to="/login">
              {t('heroFeatures.bottomCTA', { defaultValue: '把梦想变成路线 →' })}
            </Link>
          </Button>
        </div>
      </div>
    </WebsiteSection>
  );
}
