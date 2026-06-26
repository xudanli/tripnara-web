import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getGateStatusClasses } from '@/lib/gate-status';

export function DayAccommodationNotice({
  message,
  onAddAccommodation,
  className,
}: {
  message: string;
  onAddAccommodation?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm p-2 rounded',
        getGateStatusClasses('NEED_CONFIRM'),
        className,
      )}
    >
      <Building2 className="h-4 w-4 shrink-0" />
      <div className="flex-1 text-xs leading-relaxed">{message}</div>
      {onAddAccommodation ? (
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 text-xs shrink-0"
          onClick={onAddAccommodation}
        >
          添加住宿
        </Button>
      ) : null}
    </div>
  );
}
