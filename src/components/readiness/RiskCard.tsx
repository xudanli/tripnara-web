import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Risk } from '@/api/readiness';

interface RiskCardProps {
  risk: Risk;
  className?: string;
}

export default function RiskCard({ risk, className }: RiskCardProps) {
  const severityConfig = {
    high: {
      label: 'High',
      className: 'bg-red-100 text-red-800 border-red-200',
      iconClassName: 'text-red-600',
    },
    medium: {
      label: 'Medium',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
      iconClassName: 'text-orange-600',
    },
    low: {
      label: 'Low',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      iconClassName: 'text-yellow-600',
    },
  };

  const { label, className: severityClassName, iconClassName } = severityConfig[risk.severity];
  // 根据后端文档，使用 message 和 mitigation（单数）
  const riskMessage = risk.message || risk.summary || '';
  const mitigations = risk.mitigation || risk.mitigations || [];

  return (
    <Card className={cn('border', className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <AlertTriangle className={cn('h-5 w-5 flex-shrink-0', iconClassName)} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{risk.type}</h3>
                  <Badge variant="outline" className={cn('text-xs', severityClassName)}>
                    {label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{riskMessage}</p>
              </div>
            </div>
          </div>
          
          {mitigations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">应对措施:</h4>
              <ul className="space-y-1">
                {mitigations.map((mitigation, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground/50 mt-1">•</span>
                    <span>{mitigation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

