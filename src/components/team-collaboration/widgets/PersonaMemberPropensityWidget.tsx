import { ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import {
  personaFooterLinkClass,
  personaSectionMinHeight,
} from '@/components/team-collaboration/persona-ui';
import { MONEY_DNA_AXIS_LABELS, pct } from '@/lib/decision-profiling-labels';
import {
  MEMBER_CHART_COLORS,
  MONEY_DNA_AXIS_KEYS,
} from '@/lib/persona-money-dna';
import type { MoneyDnaVector, TeamMoneyDnaItem } from '@/types/trip-decision-profiling';
import { cn } from '@/lib/utils';
import { CollabWidgetCard } from './CollabWidgetCard';

interface PersonaMemberPropensityWidgetProps {
  teamMoneyDna?: TeamMoneyDnaItem[];
}

const AXIS_SHORT_LABELS: Record<keyof MoneyDnaVector, string> = {
  experienceTendency: '体验',
  qualityTendency: '品质',
  timeValueTendency: '时间',
  socialScarcityTendency: '社交',
};

function buildChartData(members: TeamMoneyDnaItem[]) {
  return MONEY_DNA_AXIS_KEYS.map((key) => {
    const row: Record<string, string | number> = {
      dimension: AXIS_SHORT_LABELS[key],
      fullLabel: MONEY_DNA_AXIS_LABELS[key] ?? key,
    };
    for (const member of members) {
      if (member.vector) {
        row[member.displayName] = pct(member.vector[key]);
      }
    }
    return row;
  });
}

export function PersonaMemberPropensityWidget({
  teamMoneyDna = [],
}: PersonaMemberPropensityWidgetProps) {
  const membersWithVector = teamMoneyDna.filter((member) => member.vector).slice(0, 4);

  return (
    <CollabWidgetCard
      title="个人倾向对比"
      className={cn('h-full', personaSectionMinHeight)}
      footer={
        <Button type="button" variant="link" className={cn(personaFooterLinkClass, 'h-auto p-0')}>
          查看 Money DNA 详情
          <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      }
    >
      {membersWithVector.length === 0 ? (
        <p className="text-xs text-muted-foreground">成员完成 Money DNA 调查后显示对比图。</p>
      ) : (
        <div className="h-[168px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={buildChartData(membersWithVector)}
              margin={{ top: 0, right: 4, left: -22, bottom: 0 }}
              barGap={1}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={26}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 8,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.fullLabel ? String(payload[0].payload.fullLabel) : ''
                }
              />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: 10, paddingTop: 2 }}
              />
              {membersWithVector.map((member, index) => (
                <Bar
                  key={member.userId}
                  dataKey={member.displayName}
                  fill={MEMBER_CHART_COLORS[index % MEMBER_CHART_COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={8}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CollabWidgetCard>
  );
}
