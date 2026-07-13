import { useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoLoading } from '@/components/common/LogoLoading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isMemoryConsoleEnabled } from '@/lib/memory-feature';
import { MEMORY_CONSOLE_UI_DEFAULT_ZH } from '@/contracts/memory-console-ui-state.v1';
import { useMemoryConsole } from '@/features/memory/hooks/useMemoryConsole';
import { L1PreferencesSection } from '@/features/memory/components/L1PreferencesSection';
import { L0ProfileSection } from '@/features/memory/components/L0ProfileSection';
import { L2DecisionsSection } from '@/features/memory/components/L2DecisionsSection';
import { TripConstraintPatchesSection } from '@/features/memory/components/TripConstraintPatchesSection';
import { DecisionLedgerDecisionLinks } from '@/components/decision-problems/DecisionLedgerDecisionLinks';
import { useOpenDecisionRecordNavigation } from '@/hooks/useOpenDecisionRecordNavigation';
import { parseMemoryConsoleDecisionLedgerCausality } from '@/lib/decision-ledger-causality.util';
import { MemoryExportSection } from '@/features/memory/components/MemoryExportSection';
import { resolveMemoryConsoleErrorUi } from '@/lib/memory-console-errors';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { isSelfEvolutionEnabled } from '@/lib/self-evolution-feature';
import { LifeEventModal, MemoryTimeline } from '@/features/self-evolution';

export default function MemoryConsolePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const tripId = searchParams.get('trip_id') ?? undefined;
  const { openByLedgerNode } = useOpenDecisionRecordNavigation(tripId);
  const [lifeEventOpen, setLifeEventOpen] = useState(false);
  const selfEvolutionEnabled = isSelfEvolutionEnabled();

  const enabled = isMemoryConsoleEnabled();
  const {
    data,
    ui,
    isLoading,
    error,
    patchL1,
    clearL1,
    deleteL0Field,
    deleteTripPatch,
    deleteL2Decision,
    exportGdpr,
  } = useMemoryConsole(tripId);

  const sectionOrder = useMemo(
    () => new Map(ui.sections.map((s, i) => [s.id, i])),
    [ui.sections]
  );

  const decisionLedgerCausality = useMemo(
    () => parseMemoryConsoleDecisionLedgerCausality(data?.decision_ledger_causality),
    [data?.decision_ledger_causality],
  );

  const handleMemoryError = (err: unknown) => {
    const { message, action } = resolveMemoryConsoleErrorUi(err);
    toast.error(message);
    if (action === 'login') {
      navigate('/login');
    } else if (action === 'hide_console') {
      navigate('/dashboard/settings');
    }
    throw err;
  };

  if (!enabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <Brain className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">旅行记忆 Console 未启用（FEATURE_MEMORY_CONSOLE=1）</p>
        <Button variant="outline" asChild>
          <Link to="/dashboard/settings">返回设置</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{MEMORY_CONSOLE_UI_DEFAULT_ZH.page_title}</h1>
            <p className="text-sm text-muted-foreground">
              管理 AI 记住的 L0/L1/L2 与行程偏好更新
              {tripId ? ` · 行程 ${tripId.slice(0, 8)}…` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {resolveMemoryConsoleErrorUi(error).message}
              </AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LogoLoading size={40} />
            </div>
          ) : (
            <>
              {sectionOrder.has('l1') ? (
                <L1PreferencesSection
                  l1={data?.l1}
                  patching={patchL1.isPending}
                  clearing={clearL1.isPending}
                  onPatch={async (body) => {
                    try {
                      await patchL1.mutateAsync(body);
                      toast.success('长期偏好已更新');
                    } catch (e) {
                      handleMemoryError(e);
                    }
                  }}
                  onClear={async () => {
                    try {
                      await clearL1.mutateAsync();
                      toast.success('长期偏好已清空');
                    } catch (e) {
                      handleMemoryError(e);
                    }
                  }}
                />
              ) : null}

              {sectionOrder.has('l0') ? (
                <L0ProfileSection
                  l0={data?.l0}
                  deleting={deleteL0Field.isPending}
                  onDeleteField={async (key) => {
                    try {
                      await deleteL0Field.mutateAsync(key);
                      toast.success('字段已删除');
                    } catch (e) {
                      handleMemoryError(e);
                    }
                  }}
                />
              ) : null}

              {sectionOrder.has('l2') ? (
                <L2DecisionsSection
                  entries={data?.l2}
                  deleting={deleteL2Decision.isPending}
                  onDelete={async (decisionId) => {
                    try {
                      const before = data?.l2?.length ?? 0;
                      await deleteL2Decision.mutateAsync(decisionId);
                      toast.success(
                        before <= 1
                          ? MEMORY_CONSOLE_UI_DEFAULT_ZH.section_l2_deleted_toast
                          : '路线决策记录已删除'
                      );
                    } catch (e) {
                      handleMemoryError(e);
                    }
                  }}
                />
              ) : null}

              {sectionOrder.has('trip_patches') && data?.trip?.trip_id ? (
                <TripConstraintPatchesSection
                  tripId={data.trip.trip_id}
                  patches={data.trip.constraint_patches}
                  deleting={deleteTripPatch.isPending}
                  onDeletePatch={async (patchId) => {
                    try {
                      await deleteTripPatch.mutateAsync({
                        tripId: data.trip!.trip_id,
                        patchId,
                      });
                      toast.success('偏好更新已删除');
                    } catch (e) {
                      handleMemoryError(e);
                    }
                  }}
                />
              ) : null}

              {sectionOrder.has('decision_ledger_causality') && decisionLedgerCausality ? (
                <DecisionLedgerDecisionLinks
                  causality={decisionLedgerCausality}
                  title={MEMORY_CONSOLE_UI_DEFAULT_ZH.section_decision_ledger_causality_title}
                  onOpenDecision={(decisionId, ledgerNodeId) => {
                    void openByLedgerNode(ledgerNodeId, decisionLedgerCausality, decisionId);
                  }}
                />
              ) : null}

              {sectionOrder.has('export') ? (
                <MemoryExportSection
                  exporting={exportGdpr.isPending}
                  onExport={() => exportGdpr.mutateAsync()}
                />
              ) : null}

              {selfEvolutionEnabled && user?.id ? (
                <section className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <MemoryTimeline userId={user.id} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setLifeEventOpen(true)}
                  >
                    <HeartHandshake className="h-4 w-4" />
                    生活事件调整偏好
                  </Button>
                  <LifeEventModal
                    userId={user.id}
                    open={lifeEventOpen}
                    onOpenChange={setLifeEventOpen}
                  />
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
