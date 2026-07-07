import { cn } from '@/lib/utils';

export function profilingPanelShell(className?: string) {
  return cn('rounded-lg border bg-card text-card-foreground shadow-sm', className);
}

export function profilingPanelHeader() {
  return 'flex items-center justify-between gap-2 border-b px-5 py-4';
}

export function frictionLevelBarClass(level: 'green' | 'yellow' | 'red') {
  if (level === 'green') return 'bg-gate-allow-foreground';
  if (level === 'yellow') return 'bg-amber-400';
  return 'bg-gate-reject-foreground';
}
