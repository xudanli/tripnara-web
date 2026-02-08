/**
 * Planning Assistant V2 页面
 * 
 * 路径: /dashboard/planning-assistant-v2
 */

import { PlanningAssistant } from '@/components/planning-assistant-v2';
import { useAuth } from '@/hooks/useAuth';

export default function PlanningAssistantV2Page() {
  const { user } = useAuth();

  return (
    <div className="h-screen">
      <PlanningAssistant userId={user?.id} />
    </div>
  );
}
