import type { PhysicalSurvivalQuizQuestion } from '@/types/match-square';

/** Mock / 联调 fallback — 后端 apply-preview 应返回同结构 */
export const DEFAULT_PHYSICAL_SURVIVAL_QUIZ: PhysicalSurvivalQuizQuestion[] = [
  {
    id: 'river_ford_gear_order',
    prompt: '强涉水过河时，下列哪项装备应最后收纳进防水袋？',
    options: [
      { value: 'a', label: '备用保暖层与干衣' },
      { value: 'b', label: '已拆开的 GPS 与卫星信标' },
      { value: 'c', label: '队医急救包外层' },
    ],
  },
  {
    id: 'hypothermia_first_response',
    prompt: '队友出现失温初期症状，优先采取哪项行动？',
    options: [
      { value: 'a', label: '立即让其继续行进以保持体温' },
      { value: 'b', label: '避风换干衣、热饮与结伴监测' },
      { value: 'c', label: '单独让其休息，队伍继续前进' },
    ],
  },
];

export function isPhysicalSurvivalQuizComplete(
  questions: PhysicalSurvivalQuizQuestion[] | null | undefined,
  answers: Record<string, string> | undefined
): boolean {
  if (!questions?.length) return true;
  return questions.every((q) => Boolean(answers?.[q.id]?.trim()));
}
