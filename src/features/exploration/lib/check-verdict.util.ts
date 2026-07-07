export type ExplorationCheckVerdictStatus =
  | 'NOT_EXECUTABLE'
  | 'EXECUTABLE'
  | 'EXECUTABLE_WITH_RISKS'
  | (string & {});

export function checkVerdictHeadline(status: ExplorationCheckVerdictStatus | undefined): string | null {
  switch (status) {
    case 'NOT_EXECUTABLE':
      return '当前路线无法按现有计划执行';
    case 'EXECUTABLE_WITH_RISKS':
      return '路线可执行，但仍有需关注的风险';
    case 'EXECUTABLE':
      return '路线检查通过';
    default:
      return status ? `检查结论：${status}` : null;
  }
}

export function checkVerdictIsBlocking(status: ExplorationCheckVerdictStatus | undefined): boolean {
  return status === 'NOT_EXECUTABLE';
}

export function shouldOfferRepairFlow(
  verdictStatus: ExplorationCheckVerdictStatus | undefined,
  issue: { decisionRequired?: boolean; severity?: string } | undefined,
): boolean {
  if (checkVerdictIsBlocking(verdictStatus)) return true;
  if (!issue) return false;
  return (
    issue.decisionRequired === true ||
    issue.severity === 'BLOCK' ||
    issue.severity === 'CONFLICT'
  );
}
