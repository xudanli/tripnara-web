import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { experienceAtomLabel } from '@/lib/experience-fulfillment-display.util';
import type { TravelUnderstandingCard } from '@/types/experience-fulfillment';
import { Compass, Users, Shield, Sparkles } from 'lucide-react';

interface TravelUnderstandingCardProps {
  data: TravelUnderstandingCard;
  className?: string;
}

function Section({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={`${title}-${i}`} className="text-sm text-foreground leading-relaxed pl-1">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TravelUnderstandingCard({ data, className }: TravelUnderstandingCardProps) {
  const intents = data.experienceIntent?.experienceIntents ?? [];

  return (
    <Card className={cn('border-slate-200', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Compass className="h-4 w-4 text-slate-600" aria-hidden />
          旅行理解
        </CardTitle>
        <CardDescription>系统对你这次旅行目标的理解，请确认或补充</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Section title="旅行目标" icon={Sparkles} items={data.travelGoals} />
        <Section title="成员条件" icon={Users} items={data.memberConditions} />
        <Section title="核心约束" icon={Shield} items={data.coreConstraints} />
        <Section title="系统假设" icon={Compass} items={data.systemAssumptions} />

        {intents.length > 0 && (
          <div className="space-y-2 pt-1 border-t">
            <p className="text-xs font-medium text-muted-foreground">体验意图</p>
            <div className="flex flex-wrap gap-1.5">
              {intents.map((intent) => (
                <Badge
                  key={intent.atom}
                  variant={intent.priority === 'MUST_PRESERVE' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {experienceAtomLabel(intent.atom)}
                  {intent.priority === 'MUST_PRESERVE' ? ' · 必保留' : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
