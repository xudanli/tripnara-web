import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PERSONA_FRICTION_DOMAIN_ORDER } from '@/lib/collab-friction-domains';
import { FRICTION_DOMAIN_LABELS } from '@/lib/decision-profiling-labels';
import { frictionLevelBarClass } from '@/components/decision-profiling/decision-profiling-ui';
import type {
  FrictionDomain,
  FrictionLevel,
  FrictionMatrixPair,
} from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';
import { personaFooterLinkClass } from '@/components/team-collaboration/persona-ui';

const HEATMAP_DOMAINS: FrictionDomain[] = PERSONA_FRICTION_DOMAIN_ORDER;

const LEVEL_RANK: Record<FrictionLevel, number> = { green: 0, yellow: 1, red: 2 };

interface MemberHeatmapRow {
  memberId: string;
  memberName: string;
  cells: Partial<Record<FrictionDomain, FrictionLevel>>;
}

function buildMemberHeatmap(pairs: FrictionMatrixPair[]): MemberHeatmapRow[] {
  const rows = new Map<string, MemberHeatmapRow>();

  for (const pair of pairs) {
    for (const member of [
      { id: pair.memberAId, name: pair.memberAName },
      { id: pair.memberBId, name: pair.memberBName },
    ]) {
      if (!rows.has(member.id)) {
        rows.set(member.id, { memberId: member.id, memberName: member.name, cells: {} });
      }
      const row = rows.get(member.id)!;
      for (const cell of pair.cells) {
        if (!HEATMAP_DOMAINS.includes(cell.domain)) continue;
        const prev = row.cells[cell.domain];
        if (!prev || LEVEL_RANK[cell.level] > LEVEL_RANK[prev]) {
          row.cells[cell.domain] = cell.level;
        }
      }
    }
  }

  return [...rows.values()].sort((a, b) => a.memberName.localeCompare(b.memberName, 'zh-CN'));
}

interface PersonaFrictionHeatmapWidgetProps {
  pairs: FrictionMatrixPair[];
  onViewDetail?: () => void;
  className?: string;
}

export function PersonaFrictionHeatmapWidget({
  pairs,
  onViewDetail,
  className,
}: PersonaFrictionHeatmapWidgetProps) {
  const rows = useMemo(() => buildMemberHeatmap(pairs), [pairs]);

  return (
    <CollabWidgetCard
      title="团队摩擦矩阵"
      compact
      className={className}
      footer={
        onViewDetail ? (
          <Button type="button" variant="link" className={cn(personaFooterLinkClass, 'h-auto p-0')} onClick={onViewDetail}>
            查看详情
            <ChevronRight className="ml-0.5 h-3 w-3" />
          </Button>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">完成团队调查后生成摩擦矩阵。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-[10px]">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-2 pr-2 text-left font-medium">成员</th>
                {HEATMAP_DOMAINS.map((domain) => (
                  <th key={domain} className="px-1 pb-2 text-center font-medium">
                    {FRICTION_DOMAIN_LABELS[domain]?.slice(0, 4) ?? domain}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.memberId} className="border-b border-border/40 last:border-0">
                  <td className="py-1.5 pr-2 font-medium text-foreground">{row.memberName}</td>
                  {HEATMAP_DOMAINS.map((domain) => {
                    const level = row.cells[domain] ?? 'green';
                    return (
                      <td key={domain} className="px-1 py-1.5 text-center">
                        <span
                          className={cn(
                            'inline-block h-5 w-5 rounded-sm',
                            frictionLevelBarClass(level),
                          )}
                          title={FRICTION_DOMAIN_LABELS[domain]}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-sm', frictionLevelBarClass('green'))} />
              低
            </span>
            <span className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-sm', frictionLevelBarClass('yellow'))} />
              中
            </span>
            <span className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-sm', frictionLevelBarClass('red'))} />
              高
            </span>
          </div>
        </div>
      )}
    </CollabWidgetCard>
  );
}
