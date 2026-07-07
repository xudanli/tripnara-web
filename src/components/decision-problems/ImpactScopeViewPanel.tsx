import { useState } from 'react';
import { ArrowDown, ChevronDown, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  arrangementDisplayLabel,
  formatImpactScopeChainLink,
  formatImpactScopeDetailNarrative,
  formatImpactScopeHeadline,
  formatImpactScopeTrigger,
  resolveImpactScopeDay,
} from '@/lib/impact-scope-i18n.util';
import type { ImpactScopeArrangement, ImpactScopeView } from '@/types/impact-scope';
import {
  DecisionDrawerSection,
  DecisionDrawerSectionHeader,
  DecisionSection,
} from '@/components/decision-problems/decision-center-ui';

export interface ImpactScopeViewPanelProps {
  view: ImpactScopeView;
  /** 检测来源等元信息（如 Dr.Dre · urgency HIGH） */
  metadata?: string | null;
  onDayClick?: (dayIndex: number) => void;
  className?: string;
  embedded?: boolean;
  /** 工作台窄栏：去掉 hint / 缩小行高 */
  compact?: boolean;
  /** headline 与顶栏/摘要重复时不展示影响标题卡 */
  suppressHeadline?: boolean;
  hideSectionHint?: boolean;
  hideSectionTitle?: boolean;
}

/** 价值 ① · 本体论连锁影响范围（Canonical L2，i18n 渲染 narrative） */
export function ImpactScopeViewPanel({
  view,
  metadata,
  onDayClick,
  className,
  embedded = false,
  compact = false,
  suppressHeadline = false,
  hideSectionHint = false,
  hideSectionTitle = false,
}: ImpactScopeViewPanelProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [chainOpen, setChainOpen] = useState(false);

  const headline = formatImpactScopeHeadline(view, t, language);
  const detailText = formatImpactScopeDetailNarrative(view, t, language);
  const impactDay = resolveImpactScopeDay(view);
  const triggerText = formatImpactScopeTrigger(view.trigger, t, { day: impactDay });
  const hasArrangements = Boolean(view.arrangements?.length);
  const hasChain = Boolean(view.chain?.length);
  const showChainCollapsed = hasChain && hasArrangements;

  const content = (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2', className)}>
      {!suppressHeadline && (headline || triggerText || metadata) ? (
        <div
          className={cn(
            'rounded-lg border border-gate-confirm-border/60 bg-gate-confirm/8',
            compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
          )}
        >
          {headline ? (
            <p className="text-sm font-semibold leading-snug text-foreground">{headline}</p>
          ) : null}
          {(triggerText || metadata || detailText) ? (
            <div
              className={cn(
                'flex flex-wrap items-center gap-1.5',
                headline ? 'mt-1.5' : '',
              )}
            >
              {triggerText ? (
                <Badge
                  variant="outline"
                  className="border-border/60 bg-muted/15 text-[11px] font-normal text-muted-foreground"
                >
                  {triggerText}
                </Badge>
              ) : null}
              {metadata ? (
                <span className="text-[11px] text-muted-foreground">{metadata}</span>
              ) : null}
            </div>
          ) : null}
          {detailText ? (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{detailText}</p>
          ) : null}
        </div>
      ) : null}

      {hasArrangements ? (
        <div>
          {!compact ? (
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">
              {t('impact.scope.arrangementsTitle')}
            </p>
          ) : null}
          <ul className={cn(compact ? 'space-y-1' : 'space-y-2')}>
            {view.arrangements!.map((arrangement) => (
              <ArrangementRow
                key={arrangement.id ?? `${arrangement.label}-${arrangement.dayIndex}`}
                arrangement={arrangement}
                onDayClick={onDayClick}
                compact={compact}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {hasChain ? (
        showChainCollapsed ? (
          <div>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/20"
              onClick={() => setChainOpen((open) => !open)}
              aria-expanded={chainOpen}
            >
              <span>{chainOpen ? t('impact.scope.chainCollapse') : t('impact.scope.chainExpand')}</span>
              <ChevronDown
                className={cn('h-3.5 w-3.5 shrink-0 transition-transform', chainOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {chainOpen ? (
              <ChainDiagram chain={view.chain!} className="mt-2" />
            ) : null}
          </div>
        ) : (
          <ChainDiagram chain={view.chain!} />
        )
      ) : null}
    </div>
  );

  if (embedded) {
    if (compact && hideSectionTitle) {
      return <div className={className}>{content}</div>;
    }
    return (
      <DecisionSection title={t('impact.scope.sectionTitle')} icon={MapPin} compact>
        {!hideSectionHint ? (
          <p className="mb-1.5 text-[11px] leading-snug text-muted-foreground">
            {t('impact.scope.sectionHint')}
          </p>
        ) : null}
        {content}
      </DecisionSection>
    );
  }

  return (
    <DecisionDrawerSection>
      <DecisionDrawerSectionHeader title={t('impact.scope.sectionTitle')} />
      <div className="mt-3">{content}</div>
    </DecisionDrawerSection>
  );
}

function ChainDiagram({
  chain,
  className,
}: {
  chain: NonNullable<ImpactScopeView['chain']>;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn('space-y-0', className)}>
      <p className="mb-2 text-[11px] font-medium text-muted-foreground">
        {t('impact.scope.chainTitle')}
      </p>
      <ol className="space-y-0">
        {chain.map((link, index) => {
          const rendered = formatImpactScopeChainLink(link, t);
          return (
            <li key={`${link.kind ?? 'link'}-${link.entityRef ?? link.consequenceKind ?? link.label ?? index}`}>
              <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
                {rendered.kindLabel ? (
                  <p className="text-[11px] font-medium text-muted-foreground">{rendered.kindLabel}</p>
                ) : null}
                <p className={cn('text-sm font-medium text-foreground', rendered.kindLabel && 'mt-0.5')}>
                  {rendered.body}
                </p>
                {rendered.detail ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{rendered.detail}</p>
                ) : null}
              </div>
              {index < chain.length - 1 ? (
                <div className="flex justify-center py-1 text-muted-foreground/50">
                  <ArrowDown className="h-3 w-3" aria-hidden />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ArrangementRow({
  arrangement,
  onDayClick,
  compact = false,
}: {
  arrangement: ImpactScopeArrangement;
  onDayClick?: (dayIndex: number) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const displayLabel = arrangementDisplayLabel(arrangement);
  const kindLabel = arrangement.arrangementKind
    ? t(`impact.arrangement.kind.${arrangement.arrangementKind}`, {
        defaultValue: arrangement.arrangementKind,
      })
    : undefined;

  return (
    <li
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border/60 bg-muted/12',
        compact ? 'px-2 py-1.5' : 'gap-3 bg-background px-3 py-2.5',
      )}
    >
      <div
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
          arrangement.isDirect === true
            ? 'bg-gate-confirm-foreground'
            : arrangement.isDirect === false
              ? 'bg-muted-foreground/40'
              : 'bg-primary/50',
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{displayLabel}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {arrangement.dayIndex != null ? (
            onDayClick ? (
              <button
                type="button"
                className="text-[11px] font-medium text-primary hover:underline"
                onClick={() => onDayClick(arrangement.dayIndex!)}
              >
                {t('impact.scope.dayLabel', { day: arrangement.dayIndex })}
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                {t('impact.scope.dayLabel', { day: arrangement.dayIndex })}
              </span>
            )
          ) : null}
          {kindLabel && !kindLabel.startsWith('impact.arrangement.') ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              {kindLabel}
            </Badge>
          ) : null}
          {arrangement.isDirect === true ? (
            <Badge variant="outline" className="border-gate-confirm-border text-[11px] font-normal text-gate-confirm-foreground">
              {t('impact.scope.directImpact')}
            </Badge>
          ) : arrangement.isDirect === false ? (
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              {t('impact.scope.sameDayCascade')}
            </Badge>
          ) : null}
        </div>
      </div>
    </li>
  );
}
