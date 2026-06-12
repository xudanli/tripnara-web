import { useApplicationDecisionNotifications } from '../hooks/useApplicationDecisionNotifications';
import { useTeamFormationNotifications } from '../hooks/useTeamFormationNotifications';

interface ApplicationDecisionGlobalNotifierProps {
  enabled?: boolean;
}

/** 搭子广场全局通知 — 入队审批 + 招募结束（满员才报组队成功） */
export function ApplicationDecisionGlobalNotifier({
  enabled = true,
}: ApplicationDecisionGlobalNotifierProps) {
  useApplicationDecisionNotifications(enabled);
  useTeamFormationNotifications(enabled);
  return null;
}
