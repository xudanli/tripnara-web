import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { TripDetail } from '@/types/trip';
import { useCreateTeam } from '@/hooks/useOptimizationV2';
import {
  buildCreateTeamRequestFromRoster,
  buildRosterFromPostAndApplications,
  resolveMatchSquareRosterFromContext,
  resolveRecruitmentPostIdFromTrip,
  type MatchSquareRoster,
} from '@/lib/match-square-trip-roster';
import { cacheMatchSquarePartySource } from '@/lib/match-square-route-and-run';
import { usePostApplications, usePostDetail } from './useMatchSquare';

type ImportState = 'idle' | 'importing' | 'done' | 'error';

export function useMatchSquareTeamBridge({
  tripId,
  trip,
  effectiveTeamId,
  onTeamImported,
}: {
  tripId: string;
  trip: TripDetail;
  effectiveTeamId: string | null | undefined;
  onTeamImported: (teamId: string) => void | Promise<void>;
}) {
  const createTeamMutation = useCreateTeam();
  const importAttemptRef = useRef(false);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [importError, setImportError] = useState<string | null>(null);

  const recruitmentPostId = useMemo(() => resolveRecruitmentPostIdFromTrip(trip), [trip]);
  const contextRoster = useMemo(() => resolveMatchSquareRosterFromContext(tripId), [tripId]);
  const needsFetch = Boolean(recruitmentPostId) && !contextRoster;

  const { data: post, isLoading: postLoading } = usePostDetail(
    needsFetch ? recruitmentPostId! : undefined
  );
  const { data: applications, isLoading: appsLoading } = usePostApplications(
    needsFetch ? recruitmentPostId! : undefined
  );

  const roster: MatchSquareRoster | null = useMemo(() => {
    if (contextRoster) return contextRoster;
    if (post) {
      const approved = (applications ?? []).filter((app) => app.status === 'approved');
      return buildRosterFromPostAndApplications(post, approved);
    }
    return null;
  }, [contextRoster, post, applications]);

  useEffect(() => {
    if (!roster?.members.length) return;
    cacheMatchSquarePartySource(tripId, {
      roster,
      post: post ?? undefined,
      applications: post
        ? (applications ?? []).filter((app) => app.status === 'approved')
        : undefined,
    });
  }, [tripId, roster, post, applications]);

  const isMatchSquareTrip = Boolean(recruitmentPostId) || Boolean(contextRoster);
  const rosterLoading = needsFetch && (postLoading || appsLoading);

  const runImport = useCallback(async () => {
    if (!roster || roster.members.length === 0 || effectiveTeamId) return;
    setImportState('importing');
    setImportError(null);
    try {
      const request = buildCreateTeamRequestFromRoster(roster);
      const newTeam = await createTeamMutation.mutateAsync(request);
      setImportState('done');
      await onTeamImported(newTeam.teamId);
      toast.success(`已从搭子车队导入 ${roster.members.length} 名成员`);
    } catch (err: unknown) {
      setImportState('error');
      const message = err instanceof Error ? err.message : '导入失败';
      setImportError(message);
      importAttemptRef.current = false;
    }
  }, [roster, effectiveTeamId, createTeamMutation, onTeamImported]);

  useEffect(() => {
    if (effectiveTeamId || !isMatchSquareTrip || rosterLoading || !roster) return;
    if (roster.members.length === 0) return;
    if (importAttemptRef.current || importState === 'importing' || importState === 'done') return;
    importAttemptRef.current = true;
    void runImport();
  }, [effectiveTeamId, isMatchSquareTrip, rosterLoading, roster, importState, runImport]);

  const retryImport = useCallback(() => {
    importAttemptRef.current = true;
    void runImport();
  }, [runImport]);

  return {
    isMatchSquareTrip,
    recruitmentPostId,
    roster,
    rosterLoading,
    isImporting: importState === 'importing' || createTeamMutation.isPending,
    importError,
    retryImport,
  };
}
