/**
 * Planning Assistant V2 页面
 * 
 * 路径: /dashboard/planning-assistant-v2
 */

import { useMemo } from 'react';
import { PlanningAssistant } from '@/components/planning-assistant-v2';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';

export default function PlanningAssistantV2Page() {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const userCountryCode = useMemo(
    () => preferences?.residencyCountry || preferences?.nationality || undefined,
    [preferences?.residencyCountry, preferences?.nationality]
  );

  return (
    <div className="h-screen">
      <PlanningAssistant
        userId={user?.id}
        userCountryCode={userCountryCode}
      />
    </div>
  );
}
