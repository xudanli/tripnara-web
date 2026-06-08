import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OdysseyTripIntentOption } from '@/types/odyssey-intake';

interface TripStatusCTAProps {
  label: string;
  value?: string;
  options: OdysseyTripIntentOption[];
  onChange: (tagId: string) => void;
}

export function TripStatusCTA({ label, value, options, onChange }: TripStatusCTAProps) {
  const selected = options.find((o) => o.id === value) ?? options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 border-0 bg-white/10 text-white hover:bg-white/20"
        >
          {label}
          {selected && (
            <>
              <span className="mx-1 opacity-50">·</span>
              {selected.label}
            </>
          )}
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(opt.id === value && 'bg-accent/50')}
          >
            <Check className={cn('mr-2 h-4 w-4', opt.id === value ? 'opacity-100' : 'opacity-0')} />
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
