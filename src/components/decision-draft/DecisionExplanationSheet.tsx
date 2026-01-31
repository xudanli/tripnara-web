/**
 * 决策解释抽屉组件（ToC Lite）
 * 用于预览阶段展示决策详细解释
 */

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { GateStatusBanner } from '@/components/ui/gate-status-banner';
import { normalizeGateStatus } from '@/lib/gate-status';
import { decisionDraftApi } from '@/api/decision-draft';
import type { DecisionExplanation, UserMode } from '@/types/decision-draft';
import { AlertCircle } from 'lucide-react';

export interface DecisionExplanationSheetProps {
  draftId: string;
  stepId: string;
  userMode: UserMode;
  open: boolean;
  onClose: () => void;
}

export default function DecisionExplanationSheet({
  draftId,
  stepId,
  userMode,
  open,
  onClose,
}: DecisionExplanationSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);

  useEffect(() => {
    if (open && draftId && stepId) {
      loadExplanation();
    } else {
      setExplanation(null);
      setError(null);
    }
  }, [open, draftId, stepId]);

  const loadExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await decisionDraftApi.getExplanation(draftId, userMode, stepId);
      setExplanation(data);
    } catch (err: any) {
      setError(err.message || '加载解释失败');
      console.error('Failed to load explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  const gateStatus = explanation?.status ? normalizeGateStatus(explanation.status) : null;
  const confidence = explanation?.confidence ? `${Math.round(explanation.confidence * 100)}%` : null;
  const conclusion = explanation?.conclusion || explanation?.summary || '暂无结论';

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-full sm:max-w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{explanation?.title || '决策解释'}</SheetTitle>
          <SheetDescription>
            查看系统如何做出这个决策
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-6 h-6" />
              <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
            </div>
          )}

          {error && (
            <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && explanation && (
            <>
              {/* 基本信息 */}
              <div>
                <h3 className="text-sm font-medium mb-3">基本信息</h3>
                <div className="space-y-2">
                  {conclusion && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">决策结论：</span>
                      <span className="font-medium ml-1">{conclusion}</span>
                    </div>
                  )}
                  {confidence && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">置信度：</span>
                      <span className="font-medium ml-1">{confidence}</span>
                    </div>
                  )}
                  {gateStatus && (
                    <GateStatusBanner status={gateStatus} size="sm" />
                  )}
                </div>
              </div>

              {/* 自然语言解释 */}
              {(explanation.explanation || explanation.summary) && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium mb-3">解释</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {explanation.explanation || explanation.summary}
                  </p>
                </div>
              )}

              {/* 关键证据 */}
              {explanation.evidence && explanation.evidence.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium mb-3">关键证据</h3>
                  <ul className="space-y-2">
                    {explanation.evidence.map((evidence, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className="flex-1">
                          {typeof evidence === 'string' ? evidence : evidence.title || evidence.source_title || '证据'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 推理过程（Expert 模式） */}
              {userMode !== 'toc' && explanation.reasoning && (
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium mb-3">推理过程</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {explanation.reasoning}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
