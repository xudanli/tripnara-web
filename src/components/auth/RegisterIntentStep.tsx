import type { LucideIcon } from 'lucide-react';
import { Compass, Building2, Users, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  REGISTRATION_INTENT_OPTIONS,
  type RegistrationIntent,
} from '@/lib/registration-intent';

const INTENT_ICONS: Record<RegistrationIntent, LucideIcon> = {
  explore: Compass,
  organize: Users,
  professional: Map,
  agency: Building2,
};

interface RegisterIntentStepProps {
  selected: RegistrationIntent | null;
  onSelect: (intent: RegistrationIntent) => void;
  onContinue: () => void;
}

/** PRD §6.1 — 注册前意图选择（不暴露 Explorer / Organizer 等内部术语） */
export function RegisterIntentStep({ selected, onSelect, onContinue }: RegisterIntentStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">你今天想做什么？</h3>
        <p className="mt-1 text-sm text-gray-500">
          选择最接近的目标，注册后我们会带你进入对应路径。可随时在个人中心切换角色。
        </p>
      </div>

      <ul className="space-y-3" role="listbox" aria-label="注册意图">
        {REGISTRATION_INTENT_OPTIONS.map((option) => {
          const Icon = INTENT_ICONS[option.id];
          const active = selected === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(option.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                  active
                    ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium text-gray-900">{option.title}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{option.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        className="h-12 w-full bg-gray-700 text-base font-medium text-white hover:bg-gray-800"
        disabled={!selected}
        onClick={onContinue}
      >
        继续注册
      </Button>
    </div>
  );
}
