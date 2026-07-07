import { DecisionCheckerEmpty } from './decision-checker-ui';

export interface DecisionCheckerRecordsTabProps {
  loading?: boolean;
  unavailable?: boolean;
  error?: string | null;
}

/** 决策检查器 · 决策记录（占位，待 BFF 接入） */
export function DecisionCheckerRecordsTab({
  loading,
  unavailable,
  error,
}: DecisionCheckerRecordsTabProps) {
  if (loading) {
    return <DecisionCheckerEmpty>正在加载决策记录…</DecisionCheckerEmpty>;
  }

  if (error) {
    return <DecisionCheckerEmpty>{error}</DecisionCheckerEmpty>;
  }

  if (unavailable) {
    return <DecisionCheckerEmpty>决策记录接口尚未就绪。</DecisionCheckerEmpty>;
  }

  return (
    <DecisionCheckerEmpty>
      暂无已确认的决策记录。确认方案并生成草案后，执行历史将在此展示。
    </DecisionCheckerEmpty>
  );
}
