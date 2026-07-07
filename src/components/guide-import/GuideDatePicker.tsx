import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, toDateOnly } from '@/lib/utils';

interface GuideDatePickerProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: (date: Date) => boolean;
}

function parseDateValue(value?: string): Date | undefined {
  if (!value) return undefined;
  const normalized = toDateOnly(value);
  if (!normalized) return undefined;
  return parseISO(normalized);
}

export function GuideDatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  className,
  disabled,
}: GuideDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-empty={!value}
          className={cn(
            'w-full justify-start text-left font-normal text-xs px-2.5',
            'data-[empty=true]:text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">
            {selected ? format(selected, 'yyyy-MM-dd', { locale: zhCN }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : undefined);
            if (date) setOpen(false);
          }}
          disabled={disabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
