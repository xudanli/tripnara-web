import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Compass,
  Infinity,
  MessageCircle,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/** 与 AgentChat `options.intent_mode` 对齐 */
export type UserExplicitIntentMode = 'auto' | 'planning' | 'data_lookup' | 'generic_qa';

type ModeDef = {
  id: UserExplicitIntentMode;
  label: string;
  description: string;
  icon: LucideIcon;
};

/** 与原先「意图」按钮组文案一致 */
const INTENT_MODES: ModeDef[] = [
  {
    id: 'auto',
    label: '自动',
    description: '自动分流：改行程、检索与问答由后端判断（AUTO）',
    icon: Infinity,
  },
  {
    id: 'planning',
    label: '规划',
    description: '显式走行程规划 / 改稿（TRIP_PLANNING）',
    icon: Compass,
  },
  {
    id: 'data_lookup',
    label: '检索',
    description: '强制检索档：攻略、实况等（DATA_LOOKUP）',
    icon: Search,
  },
  {
    id: 'generic_qa',
    label: '泛问',
    description: '闲聊 / 总结 / 泛问答（GENERIC_QA）',
    icon: MessageCircle,
  },
];

function modeById(id: UserExplicitIntentMode): ModeDef {
  return INTENT_MODES.find((m) => m.id === id) ?? INTENT_MODES[0];
}

export interface AgentIntentModePickerProps {
  value: UserExplicitIntentMode;
  onChange: (mode: UserExplicitIntentMode) => void;
  disabled?: boolean;
  /** 嵌入输入框内：无外边框、与输入同高 */
  embedded?: boolean;
  className?: string;
}

/**
 * 底部意图模式选择：自动 / 规划 / 检索 / 泛问（下拉 + 选中勾）
 */
export function AgentIntentModePicker({
  value,
  onChange,
  disabled,
  embedded = false,
  className,
}: AgentIntentModePickerProps) {
  const current = modeById(value);
  const TriggerIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={embedded ? 'ghost' : 'outline'}
          size="sm"
          disabled={disabled}
          className={cn(
            embedded
              ? 'h-9 shrink-0 gap-1 rounded-none border-0 bg-transparent px-2 text-xs font-medium shadow-none hover:bg-muted/60'
              : 'h-8 gap-1.5 rounded-full border-border/80 bg-background px-3 text-xs font-medium shadow-none',
            className
          )}
          aria-label={`意图模式：${current.label}`}
        >
          <TriggerIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
          <span>{current.label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        className="min-w-[11rem] rounded-lg p-1"
      >
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as UserExplicitIntentMode)}
        >
          {INTENT_MODES.map((mode) => {
            const ItemIcon = mode.icon;
            return (
              <DropdownMenuRadioItem
                key={mode.id}
                value={mode.id}
                className="gap-2 rounded-md py-2 pl-2 pr-8 text-sm"
                title={mode.description}
              >
                <ItemIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="flex-1">{mode.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
