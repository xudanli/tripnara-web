import type {
  OdysseyCognitiveScores,
  PremiumStressAnswerChoice,
  PremiumStressQuestionId,
} from '@/types/odyssey-travel-persona';

export interface PremiumStressOption {
  id: PremiumStressAnswerChoice;
  label: string;
  tag: string;
  deltas: Partial<OdysseyCognitiveScores>;
}

export interface PremiumStressQuestion {
  id: PremiumStressQuestionId;
  order: number;
  title: string;
  scenario: string;
  wallpaperGradient: string;
  options: PremiumStressOption[];
}

/** Premium v2 · 面向高端圈层的行中博弈抗压题（A/B 二选一） */
export const PREMIUM_STRESS_QUESTIONS: PremiumStressQuestion[] = [
  {
    id: 'resource_crunch',
    order: 1,
    title: '资源挤兑与替代决策',
    scenario:
      '你预订的黑沙滩奢华设计酒店因当地极端天气导致供电系统瘫痪，无法入住。此时是深夜 11 点，你唯一的两个 Plan B 是：入住人均 200 元、卫生条件普通的当地民居；或者临时冒雪连夜驱车 3 小时，前往下一个城市的五星级酒店。你会？',
    wallpaperGradient: 'from-slate-950 via-nara-glacier-muted to-muted',
    options: [
      {
        id: 'A',
        tag: '体验底线型',
        label:
          '连夜驱车。我对住宿品质有硬性底线，无法接受低质低效的妥协，宁愿承受行中风险去换取确定的质感。',
        deltas: {
          planning_index: 2,
          financial_flexibility: 2,
          mbti_j_score: 2,
          aesthetic_meaning: 1,
        },
      },
      {
        id: 'B',
        tag: '随遇而安型',
        label:
          '就近入住。高压环境下盲目深夜长途驱车风险过大，我愿意降低物欲标准来换取身体的休息和绝对的安全。',
        deltas: {
          ambiguity_tolerance: 2,
          stress_anxiety_index: 2,
          mbti_p_score: 1,
          compromise_index: 1,
        },
      },
    ],
  },
  {
    id: 'team_division',
    order: 2,
    title: '行中共事分工与协同',
    scenario:
      '在长途自驾车队中，原定负责 Day 3 导航和订餐的队员因为突发工作会议需要在线处理，导致整个下午的行程安排陷入完全混乱和低效等待。面对这种突发状况，你的真实本能反应是？',
    wallpaperGradient: 'from-neutral-950 via-stone-900 to-neutral-950',
    options: [
      {
        id: 'A',
        tag: '强力接管型',
        label:
          '极为不耐烦。我无法忍受任何低效，会立刻拿过对方的权限强力接管，全权决策接下来的路线，让队伍重回正轨。',
        deltas: {
          planning_index: 3,
          mbti_j_score: 3,
          social_drive: 1,
        },
      },
      {
        id: 'B',
        tag: '边界清晰型',
        label:
          '明确分工。理解职场突发，但他不该影响团队。要求大家立刻在路边开个 5 分钟的微型短会，重新 democratic 分配今天的后勤任务。',
        deltas: {
          compromise_index: 2,
          social_drive: 2,
          mbti_f_score: 1,
        },
      },
    ],
  },
  {
    id: 'premium_spend',
    order: 3,
    title: '溢价消费与附加值认同',
    scenario:
      '行程中发现原本包含在路线内的一个极赞的私家直升机看冰川项目，因临时政策变动需要自费增补 3000 元/人。搭子中有人觉得溢价过高强烈反对，而你非常想去，此时你会？',
    wallpaperGradient: 'from-nara-glacier-muted via-nara-glacier-muted to-slate-950',
    options: [
      {
        id: 'A',
        tag: '自我悦己型',
        label:
          '各玩各的。时间成本和体验溢价最宝贵，我不会因为他人的预算上限委屈自己，各付各的，我自己去参加，结束再汇合。',
        deltas: {
          financial_flexibility: 3,
          mbti_i_score: 1,
          social_drive: -1,
        },
      },
      {
        id: 'B',
        tag: '团队妥协型',
        label:
          '放弃或寻找替代。出来拼车组队是一场契约，我更看重团队整体氛围的齐整，愿意为了团队和谐放弃部分个人高光体验。',
        deltas: {
          compromise_index: 2,
          mbti_f_score: 2,
          social_drive: 1,
        },
      },
    ],
  },
];

export const MBTI_TYPE_OPTIONS: Array<{ type: string; nickname: string; quadrant: string }> = [
  { type: 'INTJ', nickname: '建筑师', quadrant: 'NT' },
  { type: 'INTP', nickname: '逻辑学家', quadrant: 'NT' },
  { type: 'ENTJ', nickname: '指挥官', quadrant: 'NT' },
  { type: 'ENTP', nickname: '辩论家', quadrant: 'NT' },
  { type: 'INFJ', nickname: '提倡者', quadrant: 'NF' },
  { type: 'INFP', nickname: '调停者', quadrant: 'NF' },
  { type: 'ENFJ', nickname: '主人公', quadrant: 'NF' },
  { type: 'ENFP', nickname: '竞选者', quadrant: 'NF' },
  { type: 'ISTJ', nickname: '物流师', quadrant: 'SJ' },
  { type: 'ISFJ', nickname: '守卫者', quadrant: 'SJ' },
  { type: 'ESTJ', nickname: '总经理', quadrant: 'SJ' },
  { type: 'ESFJ', nickname: '执政官', quadrant: 'SJ' },
  { type: 'ISTP', nickname: '鉴赏家', quadrant: 'SP' },
  { type: 'ISFP', nickname: '探险家', quadrant: 'SP' },
  { type: 'ESTP', nickname: '企业家', quadrant: 'SP' },
  { type: 'ESFP', nickname: '表演者', quadrant: 'SP' },
];
