import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Shield, Brain, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PersonaMode = 'abu' | 'dre' | 'neptune';

interface PersonaModeToggleProps {
  value?: PersonaMode;
  onChange?: (mode: PersonaMode) => void;
  className?: string;
}

export default function PersonaModeToggle({
  value,
  onChange,
  className,
}: PersonaModeToggleProps) {
  const { t } = useTranslation();
  // 如果传入了 value，使用受控模式；否则使用非受控模式
  const [internalMode, setInternalMode] = useState<PersonaMode>('abu');
  const mode = value !== undefined ? value : internalMode;

  const modes: { value: PersonaMode; icon: typeof Shield }[] = [
    { value: 'abu', icon: Shield },
    { value: 'dre', icon: Brain },
    { value: 'neptune', icon: Wrench },
  ];

  const currentMode = modes.find((m) => m.value === mode) || modes[0];
  const Icon = currentMode.icon;
  
  const getModeLabel = (modeValue: PersonaMode) => {
    return t(`personaModeToggle.${modeValue}.label`);
  };
  
  const getModeDesc = (modeValue: PersonaMode) => {
    return t(`personaModeToggle.${modeValue}.desc`);
  };

  const handleChange = (newMode: PersonaMode) => {
    // 如果是受控模式（传入了 value），只调用 onChange
    // 如果是非受控模式，更新内部状态并调用 onChange
    if (value !== undefined) {
      // 受控模式：只调用 onChange，由父组件管理状态
      if (onChange) {
        onChange(newMode);
      }
    } else {
      // 非受控模式：更新内部状态
      setInternalMode(newMode);
    if (onChange) {
      onChange(newMode);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{getModeLabel(mode)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('personaModeToggle.viewMode')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {modes.map((m) => {
          const ModeIcon = m.icon;
          return (
            <DropdownMenuItem
              key={m.value}
              onClick={() => handleChange(m.value)}
              className={cn('cursor-pointer', mode === m.value && 'bg-accent')}
            >
              <ModeIcon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{getModeLabel(m.value)}</span>
                <span className="text-xs text-muted-foreground">{getModeDesc(m.value)}</span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

