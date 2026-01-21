import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AbuBearIcon, DrDreDogIcon, NeptuneOtterIcon } from '@/components/illustrations/PersonaIcons';
import { WebsiteSection } from '@/components/website/WebsiteSection';
import { WebsiteCard, CardContent } from '@/components/website/WebsiteCard';
import { WebsiteHeading } from '@/components/website/WebsiteHeading';
import { getPersonaIconColorClasses } from '@/lib/persona-colors';
import { Badge } from '@/components/ui/badge';

export default function DecisionComparisonSection() {
  const { t } = useTranslation();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const question = t('decisionComparison.question', {
    defaultValue: '这条路线，是否本身就应该存在？',
  });
  const questionParts = question.split('存在');

  return (
    <WebsiteSection variant="muted" padding="xl" maxWidth="2xl">
      {/* Main Title */}
      <WebsiteHeading level={2} align="center" className="mb-6">
        {t('decisionComparison.title', {
          defaultValue: 'TripNARA 如何重新定义旅行规划？',
        })}
      </WebsiteHeading>

      {/* Subtitle */}
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <p className="text-base md:text-lg lg:text-xl leading-relaxed text-muted-foreground mb-4">
          {t('decisionComparison.description1', {
            defaultValue: '我们不是从"推荐更多景点"开始，',
          })}
        </p>
        <p className="text-base md:text-lg lg:text-xl leading-relaxed text-muted-foreground mb-6">
          {t('decisionComparison.description2', {
            defaultValue: '而是从一个更基础的问题出发：',
          })}
        </p>
        <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
          👉 {questionParts[0]}
          <Badge className="ml-2 mr-2 bg-yellow-100 text-primary font-extrabold inline-flex">
            存在
          </Badge>
          {questionParts[1]}
        </div>
      </div>

      {/* Comparison Layout - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
        {/* Traditional Travel App */}
        <WebsiteCard className="bg-muted/50 border-2 border-dashed">
          <CardContent className="p-10">
            <div className="text-2xl font-bold mb-8 text-destructive flex items-center gap-2">
              <span className="text-xl">🔺</span>
              {t('decisionComparison.traditional', { defaultValue: '传统旅行 App' })}
            </div>

            {/* Traditional Flow */}
            <div className="flex items-center gap-3 flex-wrap mb-8">
              <Badge variant="outline" className="px-5 py-2 text-base font-medium -rotate-2 bg-background/90 border-dashed">
                {t('decisionComparison.traditionalStep1', { defaultValue: '景点清单' })}
              </Badge>
              <span className="text-xl text-muted-foreground">→</span>
              <Badge variant="outline" className="px-5 py-2 text-base font-medium rotate-2 bg-background/90 border-dashed">
                {t('decisionComparison.traditionalStep2', { defaultValue: '排序' })}
              </Badge>
              <span className="text-xl text-muted-foreground">→</span>
              <Badge variant="outline" className="px-5 py-2 text-base font-medium -rotate-[1.5deg] bg-background/90 border-dashed">
                {t('decisionComparison.traditionalStep3', { defaultValue: '拼成"行程"' })}
              </Badge>
            </div>

            {/* Traditional Focus */}
            <div className="p-4 bg-background/60 rounded-lg text-sm text-muted-foreground italic text-center">
              只关注"去哪"
            </div>
          </CardContent>
        </WebsiteCard>

        {/* TripNARA */}
        <WebsiteCard className="bg-background border shadow-md">
          <CardContent className="p-10">
            <div className="text-2xl font-bold mb-8 text-primary flex items-center gap-2">
              <span className="text-xl">✅</span>
              {t('decisionComparison.tripnara', { defaultValue: 'TripNARA' })}
            </div>

            {/* TripNARA Flow - Timeline Style */}
            <div className="relative pl-6 mb-8">
              {/* Timeline vertical line */}
              <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
              
              <div className="flex flex-col gap-8">
                {/* Step 1: 是否成立？- Neptune */}
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-7 top-1 w-12 h-12 rounded-full bg-background border-4 border-persona-neptune-accent flex items-center justify-center overflow-hidden shadow-md z-10">
                    {!imageErrors.neptune ? (
                      <img
                        src="/images/personas/neptune-logo.svg"
                        alt="Neptune"
                        className="w-full h-full object-contain"
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, neptune: true }));
                        }}
                      />
                    ) : (
                      <NeptuneOtterIcon size={24} className={getPersonaIconColorClasses('NEPTUNE')} />
                    )}
                  </div>
                  <div className="flex-1 pl-6">
                    <Badge className="px-4 py-2 text-sm font-bold mb-2 bg-destructive/10 border-persona-neptune-accent text-foreground shadow-sm">
                      {t('decisionComparison.step1', { defaultValue: '是否成立？' })}
                    </Badge>
                    <div className="text-xs text-muted-foreground leading-relaxed pl-1">
                      {t('decisionComparison.step1Desc', {
                        defaultValue: '从目标出发，判断这段路是否值得存在',
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 2: 结构化路线 - Dr.Dre */}
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-7 top-1 w-12 h-12 rounded-full bg-background border-4 border-primary flex items-center justify-center overflow-hidden shadow-md z-10">
                    {!imageErrors.dre ? (
                      <img
                        src="/images/personas/dr-dre-logo.svg"
                        alt="Dr.Dre"
                        className="w-full h-full object-contain"
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, dre: true }));
                        }}
                      />
                    ) : (
                      <DrDreDogIcon size={24} className={getPersonaIconColorClasses('DR_DRE')} />
                    )}
                  </div>
                  <div className="flex-1 pl-6">
                    <Badge className="px-4 py-2 text-sm font-bold mb-2 bg-persona-dre/10 border-primary text-foreground shadow-sm">
                      {t('decisionComparison.step2', { defaultValue: '结构化路线' })}
                    </Badge>
                    <div className="text-xs text-muted-foreground leading-relaxed pl-1">
                      {t('decisionComparison.step2Desc', {
                        defaultValue: '梳理节点与节奏，形成逻辑闭环',
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 3: 风险验证 - Abu */}
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-7 top-1 w-12 h-12 rounded-full bg-background border-4 border-primary flex items-center justify-center overflow-hidden shadow-md z-10">
                    {!imageErrors.abu ? (
                      <img
                        src="/images/personas/abu-logo.svg"
                        alt="Abu"
                        className="w-full h-full object-contain"
                        onError={() => {
                          setImageErrors((prev) => ({ ...prev, abu: true }));
                        }}
                      />
                    ) : (
                      <AbuBearIcon size={24} className={getPersonaIconColorClasses('ABU')} />
                    )}
                  </div>
                  <div className="flex-1 pl-6">
                    <Badge className="px-4 py-2 text-sm font-bold mb-2 bg-persona-abu/10 border-primary text-foreground shadow-sm">
                      {t('decisionComparison.step3', { defaultValue: '风险验证' })}
                    </Badge>
                    <div className="text-xs text-muted-foreground leading-relaxed pl-1">
                      {t('decisionComparison.step3Desc', {
                        defaultValue: '评估安全性与可行性，确保路线可执行',
                      })}
                    </div>
                  </div>
                </div>

                {/* Step 4: 可执行 */}
                <div className="relative flex items-start gap-4">
                  <div className="absolute -left-7 top-1 w-12 h-12 rounded-full bg-primary border-4 border-primary flex items-center justify-center shadow-lg z-10">
                    <span className="text-background text-xl font-bold">✓</span>
                  </div>
                  <div className="flex-1 pl-6">
                    <Badge className="px-4 py-2 text-sm font-bold mb-2 bg-primary text-primary-foreground shadow-md">
                      {t('decisionComparison.step4', { defaultValue: '可执行' })}
                    </Badge>
                    <div className="text-xs text-muted-foreground leading-relaxed pl-1">
                      {t('decisionComparison.step4Desc', {
                        defaultValue: '生成可执行的完整路线方案',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TripNARA Focus */}
            <div className="p-4 px-5 bg-yellow-50 rounded-lg text-sm text-foreground font-semibold text-center border-none">
              ✅ 关注"应不应该去" 而不是"能去哪"
            </div>
          </CardContent>
        </WebsiteCard>
      </div>
    </WebsiteSection>
  );
}
