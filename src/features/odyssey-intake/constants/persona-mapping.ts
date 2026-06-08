import type { MbtiType } from '@/types/odyssey-travel-persona';

export interface PersonaMappingEntry {
  mbtiType: MbtiType;
  /** 附加条件描述，供 resolver 匹配 */
  condition: PersonaCondition;
  title: string;
  description: string;
}

export type PersonaCondition =
  | { kind: 'j_high'; threshold: number }
  | { kind: 'p_high'; threshold: number }
  | { kind: 'experience_first' }
  | { kind: 'adventure' }
  | { kind: 'aesthetic_sensory' }
  | { kind: 'energy_high' }
  | { kind: 'financial_flex_high' }
  | { kind: 'social_high' }
  | { kind: 'control_high' }
  | { kind: 'collaborative_high' }
  | { kind: 'default' };

/** PRD 模块二：文案映射矩阵（穷举 16 型） */
export const PERSONA_MAPPING_TABLE: PersonaMappingEntry[] = [
  // NT
  { mbtiType: 'INTJ', condition: { kind: 'control_high' }, title: '车队航行的冷酷舰长', description: '高压下你本能接管决策权。行程表是你的武器，低效与混乱在你的车队里没有生存空间。' },
  { mbtiType: 'INTJ', condition: { kind: 'collaborative_high' }, title: '精密协同的战略参谋', description: '你尊重专业边界，但更擅长用 5 分钟短会重新分配后勤，让团队在突发状况下仍保持秩序。' },
  { mbtiType: 'INTJ', condition: { kind: 'j_high', threshold: 75 }, title: '冰岛荒原的冷酷指挥官', description: '行程表精确到分钟，Excel 是你的底层武器。与其说是旅行，不如说是你在对地球进行一场高效的无情收割。' },
  { mbtiType: 'INTP', condition: { kind: 'p_high', threshold: 75 }, title: '遗世独立的数字流浪汉', description: '对打卡毫无兴趣，对人类文明的发展充满好奇。你会在异国街头盯着一个排水沟研究两小时哲学问题。' },
  { mbtiType: 'ENTJ', condition: { kind: 'experience_first' }, title: '高空跳伞的风险投资人', description: '永远在决策，永远不走回头路。哪怕遇到暴雪封山，你也能在一秒钟内买下直升机头等舱票的硬核狠人。' },
  { mbtiType: 'ENTP', condition: { kind: 'adventure' }, title: '特立独行的无证导游', description: "Plan B 才是你的 Plan A。专门带搭子走无人区和没有路标的荒野，嘴里永远挂着：『别慌，抄近道』。" },
  // NF
  { mbtiType: 'INFP', condition: { kind: 'p_high', threshold: 75 }, title: '大理古城的发呆行为艺术家', description: '旅行的本质是流浪。你可能在清晨的咖啡馆因为一朵云的形状看出了神，进而决定今天就在这里躺一天。' },
  { mbtiType: 'INFJ', condition: { kind: 'j_high', threshold: 75 }, title: '神隐于世的宿命论朝圣者', description: '默默做好了全套攻略，却在旅途中极度敏感于周遭的氛围。你总能一眼看出搭子的疲惫并递上一张纸巾。' },
  { mbtiType: 'ENFP', condition: { kind: 'experience_first' }, title: '流动的盛宴·人形种草机', description: '你不是在旅行，你是在给地球注入活力。街边的流浪狗、酒馆的酒保都能瞬间变成你失散多年的异国挚友。' },
  { mbtiType: 'ENFJ', condition: { kind: 'social_high' }, title: '篝火晚会的精神领袖', description: '团队里的绝对黏合剂。有你在的地方永远不会冷场，你甚至能把一个完全自闭的 I 人带上舞台一起跳锅庄。' },
  // SP
  { mbtiType: 'ISTP', condition: { kind: 'adventure' }, title: '荒野生存的孤狼机械师', description: '话极少，手极稳。在新疆爆胎能自己换，在无人区迷路能看北极星。只要给你足够的食物，你就能征服任何硬核路线。' },
  { mbtiType: 'ISFP', condition: { kind: 'aesthetic_sensory' }, title: '落日收集者的私人美术馆', description: '对宏大叙事无感，但对光影、色彩极度挑剔。为了等西藏阿里的一场粉色日落，你可以端着相机保持一个姿势两小时。' },
  { mbtiType: 'ESTP', condition: { kind: 'energy_high' }, title: '多巴胺超标的特种兵先锋', description: '凌晨 3 点爬泰山，早上 8 点吃烧烤，下午 2 点去冲浪。你的身体里没有疲惫这个词，只有无限燃烧的卡路里。' },
  { mbtiType: 'ESFP', condition: { kind: 'financial_flex_high' }, title: '人间值得的即兴狂欢家', description: '今朝有酒今朝醉。发现好玩的项目立刻就冲，预算超支了就回酒店吃泡面，你的旅行永远充满了尖叫和快乐。' },
  // SJ
  { mbtiType: 'ISTJ', condition: { kind: 'j_high', threshold: 85 }, title: '行走的国家地理活字典', description: '不容许任何意外的质感旅行者。出行前必看三本纪录片，订的酒店永远在安全系数最高的街区，安全感直接拉满。' },
  { mbtiType: 'ISFJ', condition: { kind: 'default' }, title: '旅行团队的温柔后勤保障', description: '你的背包是个百宝箱：藿香正气水、充电宝、湿纸巾、甚至还有一次性雨衣。永远默默打理好一切的无私搭子。' },
  { mbtiType: 'ESTJ', condition: { kind: 'j_high', threshold: 75 }, title: '没有感情的打卡打桩机', description: '『既然来了，就必须去』。你会严格监督整个团队的作息，谁要是敢赖床，会迎接你极具压迫感的敲门声。' },
  { mbtiType: 'ESFJ', condition: { kind: 'social_high' }, title: '高级定制的合影气氛组长', description: '精心协调每一个人的喜好，确保合照时每个人都在笑。你让一趟未知的旅程变得像家族聚会一样温馨有保障。' },
];
