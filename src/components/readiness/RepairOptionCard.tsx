import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import type { RepairOption } from '@/types/readiness';

interface RepairOptionCardProps {
  option: RepairOption;
  isSelected?: boolean;
  onSelect: (optionId: string) => void;
  onApply: (optionId: string) => void;
  onPreview: (optionId: string) => void;
}

export default function RepairOptionCard({
  option,
  isSelected = false,
  onSelect,
  onApply,
  onPreview,
}: RepairOptionCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer',
        isSelected && 'border-primary border-2 bg-primary/5',
        !isSelected && 'hover:border-primary/50'
      )}
      onClick={() => onSelect(option.id)}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">{option.title}</h3>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            {isSelected && (
              <Badge className="bg-primary text-primary-foreground">推荐</Badge>
            )}
          </div>

          {/* Before/After 对比 */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {option.changes.time && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">时间</span>
                <span className={cn(
                  'font-medium',
                  option.changes.time.startsWith('+') ? 'text-orange-600' : 'text-green-600'
                )}>
                  {option.changes.time}
                </span>
              </div>
            )}
            {option.changes.distance && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">距离</span>
                <span className={cn(
                  'font-medium',
                  option.changes.distance.startsWith('+') ? 'text-orange-600' : 'text-green-600'
                )}>
                  {option.changes.distance}
                </span>
              </div>
            )}
            {option.changes.elevation && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">爬升</span>
                <span className={cn(
                  'font-medium',
                  option.changes.elevation.startsWith('+') ? 'text-orange-600' : 'text-green-600'
                )}>
                  {option.changes.elevation}
                </span>
              </div>
            )}
            {option.changes.risk && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-muted-foreground">风险</span>
                <span className={cn(
                  'font-medium',
                  option.changes.risk === '下降' ? 'text-green-600' : 'text-red-600'
                )}>
                  {option.changes.risk}
                </span>
              </div>
            )}
          </div>

          {/* Why this fix (可展开) */}
          {option.reasonCode && (
            <div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Why this fix
                {expanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {expanded && (
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  <div className="font-medium mb-1">Reason Code: {option.reasonCode}</div>
                  {option.evidenceLink && (
                    <a
                      href={option.evidenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      查看证据
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          {isSelected && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(option.id);
                }}
              >
                Apply Fix
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(option.id);
                }}
              >
                Preview
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

