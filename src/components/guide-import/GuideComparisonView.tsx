import { useMemo, useState } from 'react';
import type { GuideTripContext, PlanCandidate } from '@/types/guide-import';
import { SOURCE_CONFIDENCE_LABELS, type SourceConfidenceLevel } from '@/types/guide-import';
import { Button } from '@/components/ui/button';
import { PERSONA_LOGO_SRC } from '@/lib/persona-icons';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  GuideImportCard,
  GuideImportFooterActions,
  GuideImportScrollX,
  GuideImportSectionHeader,
  GuideImportSidebarPanel,
  guideImportPrimaryButtonClass,
  guideImportUi,
} from '@/components/guide-import/guide-import-ui';

const PERSONA_SIDEBAR = [
  {
    id: 'neptune',
    name: 'Neptune',
    logo: PERSONA_LOGO_SRC.NEPTUNE,
    role: '体验导向',
    desc: '保留独特体验，优化游览节奏与主线连贯性',
  },
  {
    id: 'abu',
    name: 'Abu',
    logo: PERSONA_LOGO_SRC.ABU,
    role: '效率与安全',
    desc: '减少低价值移动，核验道路与天气硬约束',
  },
  {
    id: 'dre',
    name: 'Dr.Dre',
    logo: PERSONA_LOGO_SRC.DR_DRE,
    role: '风险与节奏',
    desc: '控制单日负荷，避免疲劳累积与不可执行安排',
  },
];

interface GuideComparisonViewProps {
  candidate: PlanCandidate;
  tripContext: GuideTripContext;
  onAcceptAll: () => void;
  onViewItems?: () => void;
  onKeepOriginal: () => void;
  accepting?: boolean;
  acceptDisabled?: boolean;
  className?: string;
}

function formatContextLabel(ctx: GuideTripContext): string {
  const parts: string[] = [];
  if (ctx.startDate && ctx.endDate) parts.push(`${ctx.startDate} 至 ${ctx.endDate}`);
  if (ctx.travelerProfile === 'couple') parts.push('2 人');
  if (ctx.transportMode === 'self_drive') parts.push('自驾');
  return parts.join(' · ') || '默认出行条件';
}

function ComparisonTable({
  rows,
}: {
  rows: Array<{
    id: string;
    category: string;
    original: string;
    adjusted: string;
    reason: string;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-muted-foreground">
            <th className="p-3 font-medium w-[100px]">内容</th>
            <th className="p-3 font-medium">原攻略</th>
            <th className="p-3 font-medium">TripNARA 调整</th>
            <th className="p-3 font-medium min-w-[160px]">调整原因</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60 last:border-0 align-top">
              <td className="p-3 font-medium whitespace-nowrap">{row.category}</td>
              <td className="p-3 text-muted-foreground">{row.original}</td>
              <td className="p-3 text-muted-foreground font-medium">{row.adjusted}</td>
              <td className="p-3 text-xs text-muted-foreground leading-relaxed">{row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GuideComparisonView({
  candidate,
  tripContext,
  onAcceptAll,
  onViewItems,
  onKeepOriginal,
  accepting,
  acceptDisabled,
  className,
}: GuideComparisonViewProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const rows = useMemo(
    () =>
      candidate.adjustments.length
        ? candidate.adjustments.map((a) => ({
            id: a.id,
            category: a.category,
            original: a.originalGuide,
            adjusted: a.adjustedPlan,
            reason: a.reason ?? '—',
          }))
        : [
            {
              id: '1',
              category: 'Day 2 驾驶',
              original: '约 6.5 小时（雷克雅未克 → 霍芬）',
              adjusted: '拆为两天',
              reason: '单日驾驶过长，拆分后节奏更安全',
            },
            {
              id: '2',
              category: '黑沙滩',
              original: '晚上到达',
              adjusted: '调整至白天',
              reason: '光线与海浪安全风险',
            },
          ],
    [candidate.adjustments],
  );

  const previewRows = rows.slice(0, 2);

  return (
    <div className={cn(guideImportUi.stackCompact, 'min-w-0', className)}>
      <p className={guideImportUi.sectionDesc}>{formatContextLabel(tripContext)}</p>

      <GuideImportCard className="space-y-3">
        <GuideImportSectionHeader
          title={`共 ${rows.length} 处调整`}
          description="默认展示摘要，展开可查看完整对比表"
        />
        <ul className="space-y-2 text-sm">
          {previewRows.map((row) => (
            <li key={row.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="font-medium text-foreground">{row.category}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {row.original} → <span className="text-muted-foreground">{row.adjusted}</span>
              </p>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 gap-2"
          aria-expanded={detailsExpanded}
          onClick={() => setDetailsExpanded((prev) => !prev)}
        >
          {detailsExpanded ? (
            <>
              收起调整明细
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              展开完整对比表
              <span className="text-muted-foreground font-normal">（{rows.length} 项）</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </Button>
      </GuideImportCard>

      {detailsExpanded ? (
        <GuideImportScrollX contentClassName="w-full min-w-[720px] xl:min-w-0">
          <div className={cn(guideImportUi.gridMainSidebar, 'lg:grid-cols-[minmax(0,1fr)_minmax(0,240px)]')}>
            <GuideImportCard padding={false} className="overflow-hidden">
              <ComparisonTable rows={rows} />
              <p className={cn(guideImportUi.footnote, 'p-3 border-t bg-muted/20')}>
                「调整」= 根据你的设定优化；「保留」= 与原攻略一致；「不调整」= 约束下无法改动
              </p>
            </GuideImportCard>

            <GuideImportSidebarPanel className="space-y-4">
              <GuideImportCard>
                <GuideImportSectionHeader title="决策视角" />
                {PERSONA_SIDEBAR.map((p) => (
                  <div key={p.id} className="flex gap-2 mt-3 first:mt-0">
                    <img src={p.logo} alt={p.name} className="w-8 h-8 rounded-lg flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium">
                        {p.name}
                        <span className="text-muted-foreground font-normal"> · {p.role}</span>
                      </p>
                      <p className={cn(guideImportUi.footnote, 'mt-0.5')}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </GuideImportCard>

              <GuideImportCard>
                <GuideImportSectionHeader title="信息来源可靠性分级" />
                <ul className="space-y-1">
                  {(['L1', 'L2', 'L3', 'L4', 'L5'] as SourceConfidenceLevel[]).map((level) => (
                    <li
                      key={level}
                      className={cn(
                        guideImportUi.footnote,
                        level === 'L5' && 'text-gate-allow-foreground font-medium',
                      )}
                    >
                      <strong>{level}</strong> {SOURCE_CONFIDENCE_LABELS[level]}
                    </li>
                  ))}
                </ul>
              </GuideImportCard>
            </GuideImportSidebarPanel>
          </div>
        </GuideImportScrollX>
      ) : null}

      <GuideImportFooterActions
        primary={
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                className={cn('flex-1 sm:flex-none min-h-11', guideImportPrimaryButtonClass())}
                disabled={accepting || acceptDisabled}
                onClick={onViewItems ?? onAcceptAll}
              >
                {acceptDisabled ? '草案未就绪' : '逐项查看并确认'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none min-h-11"
                disabled={accepting || acceptDisabled}
                onClick={onAcceptAll}
              >
                接受全部调整
              </Button>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline text-left min-h-11 py-2 disabled:opacity-50"
              disabled={accepting || acceptDisabled}
              onClick={onKeepOriginal}
            >
              尽量保留原攻略
            </button>
          </div>
        }
      />
    </div>
  );
}
