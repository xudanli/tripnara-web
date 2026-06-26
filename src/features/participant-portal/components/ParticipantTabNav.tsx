import { NavLink, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { participantProjectPath } from '../shell/participant-phase';

const TABS = [
  { key: 'dashboard', label: '首页', suffix: 'dashboard' },
  { key: 'preferences', label: '我的偏好', suffix: 'preferences' },
  { key: 'proposals', label: '团队方案', suffix: 'proposals', requiresCandidate: true },
  { key: 'trust-surface', label: '方案说明', suffix: 'trust-surface', requiresTrustSurface: true },
  { key: 'readiness', label: '准备', suffix: 'readiness' },
  { key: 'changes', label: '行中', suffix: 'changes' },
  { key: 'feedback', label: '反馈', suffix: 'feedback' },
] as const;

interface ParticipantTabNavProps {
  proposalCandidateId?: string;
  trustSurfaceCardCount?: number;
  showFullNav?: boolean;
  showMidNav?: boolean;
}

export function ParticipantTabNav({
  proposalCandidateId,
  trustSurfaceCardCount = 0,
  showFullNav = false,
  showMidNav = false,
}: ParticipantTabNavProps) {
  const { token = '' } = useParams<{ token: string }>();

  const visibleTabs = showFullNav
    ? TABS
    : showMidNav
      ? TABS.filter((t) => t.key === 'dashboard' || t.key === 'preferences')
      : TABS.filter((t) => t.key === 'dashboard');

  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto rounded-lg border bg-background p-1">
      {visibleTabs.map((tab) => {
        if ('requiresCandidate' in tab && tab.requiresCandidate && !proposalCandidateId) {
          return (
            <span
              key={tab.key}
              className="shrink-0 rounded-md px-3 py-1.5 text-xs text-muted-foreground/50"
            >
              {tab.label}
            </span>
          );
        }

        if (
          'requiresTrustSurface' in tab &&
          tab.requiresTrustSurface &&
          trustSurfaceCardCount <= 0
        ) {
          return null;
        }

        const href =
          tab.key === 'proposals' && proposalCandidateId
            ? participantProjectPath(token, `proposals/${proposalCandidateId}`)
            : participantProjectPath(token, tab.suffix);

        return (
          <NavLink
            key={tab.key}
            to={href}
            end={tab.key === 'dashboard'}
            className={({ isActive }) =>
              cn(
                'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )
            }
          >
            {tab.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
