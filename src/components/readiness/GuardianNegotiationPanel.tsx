import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PersonaAvatar } from '@/components/common/PersonaAvatar';
import { getPersonaName, PERSONA_ROLE_LABEL_ZH } from '@/lib/persona-icons';
import type { GuardianNegotiationResult } from '@/types/readiness-guardian-negotiation';
import {
  getGuardianStanceStyles,
  GUARDIAN_CONSENSUS_LABEL_EN,
  GUARDIAN_CONSENSUS_LABEL_ZH,
  GUARDIAN_STANCE_LABEL_EN,
  GUARDIAN_STANCE_LABEL_ZH,
  guardianPersonaToAvatarType,
} from '@/lib/readiness-guardian-negotiation.util';
import { useTranslation } from 'react-i18next';

const PERSONA_ORDER = ['ABU', 'DR_DRE', 'NEPTUNE'] as const;

export interface GuardianNegotiationPanelProps {
  negotiation: GuardianNegotiationResult;
  className?: string;
  compact?: boolean;
  /** 开发 mock 数据提示 */
  isMock?: boolean;
  /** 覆盖默认「三人格共识」标题（可执行证明修复预览用） */
  title?: string;
  /** 合议范围说明（如整趟行程 vs 当前方案） */
  description?: string;
  scopeBadge?: string;
  /** 嵌套在折叠区时省略外层 Card 标题 */
  embedded?: boolean;
}

export default function GuardianNegotiationPanel({
  negotiation,
  className,
  compact = false,
  isMock = false,
  title,
  description,
  scopeBadge,
  embedded = false,
}: GuardianNegotiationPanelProps) {
  const { i18n, t } = useTranslation();
  const isZh = i18n.language.startsWith('zh');
  const panelTitle =
    title ??
    t('dashboard.readiness.guardian.title', { defaultValue: '三人格共识' });

  const sortedPersonas = [...negotiation.personas].sort(
    (a, b) =>
      PERSONA_ORDER.indexOf(a.persona) - PERSONA_ORDER.indexOf(b.persona)
  );

  return (
    <Card
      className={cn(
        'border-border/80 bg-muted/20 dark:bg-muted/10 w-full min-w-0 overflow-visible',
        embedded && 'border-0 bg-transparent shadow-none',
        className
      )}
    >
      {!embedded ? (
        <CardHeader className={cn('pb-2', compact && 'py-3')}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className={cn('flex items-center gap-2 text-base', compact && 'text-sm')}>
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{panelTitle}</span>
              {scopeBadge ? (
                <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                  {scopeBadge}
                </Badge>
              ) : null}
            </CardTitle>
            {negotiation.consensus ? (
              <Badge variant="outline" className="text-[10px]">
                {isZh
                  ? GUARDIAN_CONSENSUS_LABEL_ZH[negotiation.consensus]
                  : GUARDIAN_CONSENSUS_LABEL_EN[negotiation.consensus]}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{description}</p>
          ) : null}
          {negotiation.summary ? (
            <p className="text-xs text-muted-foreground mt-1">{negotiation.summary}</p>
          ) : null}
          {isMock ? (
            <p className="text-[11px] text-warning dark:text-warning mt-1">
              {t('dashboard.readiness.cascade.mockBanner', {
                defaultValue: '开发 mock 数据（VITE_READINESS_CASCADE_MOCK=true）',
              })}
            </p>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('space-y-2', compact && 'pt-0', embedded && 'p-0')}>
        {embedded && (description || scopeBadge) ? (
          <div className="space-y-1 pb-1">
            {scopeBadge ? (
              <Badge variant="outline" className="text-[10px] h-5 font-normal">
                {scopeBadge}
              </Badge>
            ) : null}
            {description ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
            ) : null}
          </div>
        ) : null}
        {sortedPersonas.map((view) => {
          const avatarPersona = guardianPersonaToAvatarType(view.persona);
          return (
            <div
              key={view.persona}
              className="rounded-lg border bg-card p-3 flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:items-start w-full min-w-0"
            >
              <PersonaAvatar
                persona={avatarPersona}
                size={compact ? 32 : 36}
                withBackground
                className="shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1.5 w-full">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-semibold">{getPersonaName(avatarPersona)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {PERSONA_ROLE_LABEL_ZH[avatarPersona]}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] shrink-0', getGuardianStanceStyles(view.stance))}
                  >
                    {isZh
                      ? GUARDIAN_STANCE_LABEL_ZH[view.stance]
                      : GUARDIAN_STANCE_LABEL_EN[view.stance]}
                  </Badge>
                </div>
                <p className="text-sm text-foreground leading-relaxed break-words whitespace-normal">
                  {view.message}
                </p>
                {view.suggestion ? (
                  <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-normal">
                    {view.suggestion}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {negotiation.userActionRequired && negotiation.userActionRequired.length > 0 ? (
          <p className="text-[11px] text-muted-foreground pt-1 border-t">
            {t('dashboard.readiness.guardian.userBoundary', {
              defaultValue: '决策取舍需您自行确认；TripNARA 不会代您执行预订或改签。',
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
