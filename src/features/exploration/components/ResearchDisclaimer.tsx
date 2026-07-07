import { exploreUi } from '../explore-ui';
import { cn } from '@/lib/utils';

interface ResearchDisclaimerProps {
  text?: string;
  className?: string;
}

export function ResearchDisclaimer({
  text = '本产品尚在开发中。研究期间收集的偏好与价格区间不构成购买义务；订金（如启用）可在规定期限内全额退还。',
  className,
}: ResearchDisclaimerProps) {
  return (
    <p className={cn(exploreUi.tipBox, 'text-xs text-muted-foreground leading-relaxed', className)}>
      {text}
    </p>
  );
}
