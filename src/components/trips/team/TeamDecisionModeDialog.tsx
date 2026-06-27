import { cn } from '@/lib/utils';
import {
  GOVERNANCE_MODE_META,
  type TeamGovernanceMode,
} from '@/lib/team-tab-model';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TeamDecisionModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TeamGovernanceMode;
  onChange: (mode: TeamGovernanceMode) => void;
  disabled?: boolean;
}

const MODES: TeamGovernanceMode[] = ['leader', 'weighted', 'consensus'];

/** 治理规则 — 二级入口，不在主界面直接展示 */
export default function TeamDecisionModeDialog({
  open,
  onOpenChange,
  value,
  onChange,
  disabled = false,
}: TeamDecisionModeDialogProps) {
  const active = GOVERNANCE_MODE_META[value];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>谁来做决定？</DialogTitle>
          <DialogDescription>
            遇到分歧时的拍板方式。不影响谁能编辑行程。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid gap-2">
            {MODES.map((mode) => {
              const meta = GOVERNANCE_MODE_META[mode];
              const selected = value === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(mode);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    'hover:bg-accent/40 disabled:opacity-50 disabled:pointer-events-none',
                    selected && 'border-foreground/20 bg-muted/50',
                  )}
                >
                  <span className="text-base leading-none mt-0.5">{meta.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{meta.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {meta.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            当前生效：<span className="text-foreground">{active.label}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
