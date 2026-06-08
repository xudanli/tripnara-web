import type { SelectedContext } from '@/contexts/PlanStudioContext';

/** 将左侧「问助手」上下文拼进用户问题（规划工作台 ↔ 右侧智能体） */
export function buildPlanStudioAssistantQuestion(
  question: string,
  context: SelectedContext
): string {
  let fullQuestion = question;

  if (context.placeName && !question.includes(context.placeName)) {
    const placeInfo: string[] = [];
    if (context.placeName) placeInfo.push(`关于"${context.placeName}"`);
    if (context.itemType) placeInfo.push(`（${context.itemType}）`);
    if (context.itemTime?.start) {
      const startTime = new Date(context.itemTime.start).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      placeInfo.push(`时间：${startTime}`);
    }
    if (placeInfo.length > 0) {
      fullQuestion = `${placeInfo.join('，')}，${question}`;
    }
  }

  if (context.prevItem || context.nextItem) {
    const contextInfo: string[] = [];
    if (context.prevItem) {
      contextInfo.push(`前一个行程项是"${context.prevItem.name}"`);
    }
    if (context.nextItem) {
      contextInfo.push(`后一个行程项是"${context.nextItem.name}"`);
    }
    if (contextInfo.length > 0) {
      fullQuestion = `${fullQuestion}（${contextInfo.join('，')}）`;
    }
  }

  return fullQuestion;
}
