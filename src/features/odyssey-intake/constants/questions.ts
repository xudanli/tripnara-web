import type { OdysseyAnswerChoice, OdysseyQuestionId } from '@/types/odyssey-travel-persona';
import type { OdysseyCognitiveScores } from '@/types/odyssey-travel-persona';

export interface OdysseyQuestionOption {
  id: OdysseyAnswerChoice;
  label: string;
  deltas: Partial<OdysseyCognitiveScores>;
}

export interface OdysseyQuestion {
  id: OdysseyQuestionId;
  scene: string;
  prompt: string;
  wallpaperGradient: string;
  options: OdysseyQuestionOption[];
}

export const ODYSSEY_QUESTIONS: OdysseyQuestion[] = [
  {
    id: 'budget_tolerance',
    scene: '雪山景观餐厅 · 傍晚',
    prompt:
      '在长途公路旅行的第 4 天傍晚，你们偶然经过一家极其种草、推开窗就是雪山的黑珍珠景观餐厅。但它的人均消费高出你们原本单餐预算 400 元，你会？',
    wallpaperGradient: 'from-slate-900 via-gate-allow to-muted',
    options: [
      {
        id: 'A',
        label: '体验至上：出来玩开心最重要，果断进！预算后面几天的住宿上省出来。',
        deltas: { financial_flexibility: 2, planning_index: -1 },
      },
      {
        id: 'B',
        label: '预算至上：严格执行原计划。拍照打卡留念，然后去旁边吃原定的人均 50 元小吃。',
        deltas: { financial_flexibility: -2, mbti_j_score: 2 },
      },
      {
        id: 'C',
        label: '折中务实：和搭子商量，如果对方强烈想去，那就进去只点招牌，AA 后尽量不超支。',
        deltas: { mbti_f_score: 1, compromise_index: 2 },
      },
    ],
  },
  {
    id: 'ambiguity_tolerance',
    scene: '暴雪封路 · 公路',
    prompt:
      '由于强风暴雪，去往核心景区的道路被交警临时封闭，所有车辆禁止通行。你唯一的 Plan B 是原路返回酒店躺着，或者多花 3 小时绕行一条未知的泥泞山路，你会？',
    wallpaperGradient: 'from-zinc-950 via-muted to-nara-glacier-muted',
    options: [
      {
        id: 'A',
        label: '冒险探索：无所谓，未知才是旅行的意义！绕道走，说不定能看到不一样的风景。',
        deltas: { ambiguity_tolerance: 2, mbti_p_score: 2 },
      },
      {
        id: 'B',
        label: '安全保守：安全第一。回酒店躺着，或者在附近镇上喝咖啡，绝对不冒未知的风险。',
        deltas: { ambiguity_tolerance: -2, mbti_j_score: 2 },
      },
      {
        id: 'C',
        label: '焦虑折返：感到极其烦躁和遗憾，但没办法，只能原路返回，并一路上不断刷新路况希望它复通。',
        deltas: { ambiguity_tolerance: -2, stress_anxiety_index: 2 },
      },
    ],
  },
  {
    id: 'energy_pace',
    scene: '特种兵第三天 · 清晨',
    prompt:
      '已经连续特种兵式暴走和高频 social 了 3 天，今天还有 4 个打卡点。早上 8 点闹钟响起，你现在的真实状态和想法是？',
    wallpaperGradient: 'from-neutral-900 via-amber-950/40 to-neutral-900',
    options: [
      {
        id: 'A',
        label: '满血复活：特种兵从不认输！按时起床，高歌猛进，必须把所有景点打卡完。',
        deltas: { energy_capacity: 2, travel_pace_specialist: 2, mbti_e_score: 1 },
      },
      {
        id: 'B',
        label: '拒绝营业：放过我吧…和搭子商量今天取消 2 个景点，睡到中午再出门，找个咖啡馆发呆。',
        deltas: { energy_capacity: -2, travel_pace_relaxed: 2, mbti_i_score: 2 },
      },
    ],
  },
  {
    id: 'social_preference',
    scene: '青年旅舍 · 围炉夜话',
    prompt:
      '行程当晚入住了一家非常有氛围的青年旅舍/民宿，公共区域正在举办热闹的当地民谣弹唱会和围炉煮茶，此时你会？',
    wallpaperGradient: 'from-stone-900 via-orange-950/50 to-stone-900',
    options: [
      {
        id: 'A',
        label: '社交中心：太棒了！立刻拉上搭子过去拿瓶啤酒坐下，主动和来自各地的人聊天、组局。',
        deltas: { mbti_e_score: 2, social_drive: 2 },
      },
      {
        id: 'B',
        label: '边缘观察：拉着搭子在角落悄悄看会儿，不主动说话，只享受热闹的背景音。',
        deltas: { mbti_i_score: 1, social_drive: 0 },
      },
      {
        id: 'C',
        label: '物理逃离：对不起，太吵了。我只想拿上耳机回房间反锁房门，刷手机躺尸，这是我的回血时间。',
        deltas: { mbti_i_score: 2, social_drive: -2 },
      },
    ],
  },
  {
    id: 'aesthetic_meaning',
    scene: '古城遗址 · 烈日',
    prompt:
      '面对一座历史悠久但目前只剩残垣断壁、极其考验文化功底的古城遗址，你和搭子站在烈日下，你内心的真实独白是？',
    wallpaperGradient: 'from-amber-950/60 via-stone-900 to-amber-950/30',
    options: [
      {
        id: 'A',
        label: '符号共鸣：天呐，抚摸这些石块仿佛能听到千年前战马的嘶鸣。哪怕晒死我也要对着历史画册看三个小时。',
        deltas: { mbti_n_score: 2, aesthetic_meaning: 2 },
      },
      {
        id: 'B',
        label: '感官体验：看一堆石头确实有点无聊…拍照也不太出片，不如早点去市集吃烤肉。',
        deltas: { mbti_s_score: 2, aesthetic_sensory: 2 },
      },
    ],
  },
];

export const EMPTY_COGNITIVE_SCORES: OdysseyCognitiveScores = {
  financial_flexibility: 0,
  planning_index: 0,
  compromise_index: 0,
  ambiguity_tolerance: 0,
  stress_anxiety_index: 0,
  energy_capacity: 0,
  travel_pace_specialist: 0,
  travel_pace_relaxed: 0,
  social_drive: 0,
  aesthetic_meaning: 0,
  aesthetic_sensory: 0,
  mbti_e_score: 0,
  mbti_i_score: 0,
  mbti_t_score: 0,
  mbti_f_score: 0,
  mbti_s_score: 0,
  mbti_n_score: 0,
  mbti_j_score: 0,
  mbti_p_score: 0,
};
