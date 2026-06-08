import type { OdysseyQuestion } from '@/types/odyssey-intake';

const WALLPAPER_BASE =
  import.meta.env.VITE_ODYSSEY_WALLPAPER_BASE_URL ??
  'https://cdn.tripnara.com/odyssey/wallpapers';

function wp(key: string): OdysseyQuestion['wallpaper'] {
  return { key, url: `${WALLPAPER_BASE}/${key}.jpg` };
}

/** API 不可用时的本地题库（scenarioId 与后端一致） */
export const FALLBACK_ODYSSEY_QUESTIONS: OdysseyQuestion[] = [
  {
    id: 'budget_financial_tolerance',
    order: 1,
    title: '预算与财务容忍度',
    scenario:
      '在长途公路旅行的第 4 天傍晚，你们偶然经过一家极其种草、推开窗就是雪山的黑珍珠景观餐厅。但它的人均消费高出你们原本单餐预算 400 元，你会？',
    wallpaperKey: 'snow_restaurant',
    wallpaper: wp('snow_restaurant'),
    options: [
      { id: 'A', label: '体验至上：出来玩开心最重要，果断进！预算后面几天的住宿上省出来。' },
      { id: 'B', label: '预算至上：严格执行原计划。拍照打卡留念，然后去旁边吃原定的人均 50 元小吃。' },
      { id: 'C', label: '折中务实：和搭子商量，如果对方强烈想去，那就进去只点招牌，AA 后尽量不超支。' },
    ],
  },
  {
    id: 'ambiguity_tolerance',
    order: 2,
    title: '不确定性容忍度',
    scenario:
      '由于强风暴雪，去往核心景区的道路被交警临时封闭。你唯一的 Plan B 是原路返回酒店，或者多花 3 小时绕行未知泥泞山路，你会？',
    wallpaperKey: 'blizzard_road',
    wallpaper: wp('blizzard_road'),
    options: [
      { id: 'A', label: '冒险探索：无所谓，未知才是旅行的意义！绕道走，说不定能看到不一样的风景。' },
      { id: 'B', label: '安全保守：安全第一。回酒店躺着，绝对不冒未知的风险。' },
      { id: 'C', label: '焦虑折返：感到极其烦躁和遗憾，只能原路返回，并一路上不断刷新路况。' },
    ],
  },
  {
    id: 'energy_pace',
    order: 3,
    title: '精力密度曲线',
    scenario:
      '已经连续特种兵式暴走 3 天，今天还有 4 个打卡点。早上 8 点闹钟响起，你现在的真实状态是？',
    wallpaperKey: 'dawn_alarm',
    wallpaper: wp('dawn_alarm'),
    options: [
      { id: 'A', label: '满血复活：特种兵从不认输！按时起床，必须把所有景点打卡完。' },
      { id: 'B', label: '拒绝营业：和搭子商量取消 2 个景点，睡到中午再出门，找个咖啡馆发呆。' },
    ],
  },
  {
    id: 'social_recharge',
    order: 4,
    title: '社交与独处回血',
    scenario:
      '当晚入住青年旅舍，公共区域正在举办热闹的民谣弹唱会和围炉煮茶，此时你会？',
    wallpaperKey: 'hostel_gathering',
    wallpaper: wp('hostel_gathering'),
    options: [
      { id: 'A', label: '社交中心：立刻拉上搭子过去，主动和来自各地的人聊天、组局。' },
      { id: 'B', label: '边缘观察：在角落悄悄看会儿，只享受热闹的背景音。' },
      { id: 'C', label: '物理逃离：拿上耳机回房间反锁房门，这是我的回血时间。' },
    ],
  },
  {
    id: 'aesthetic_meaning',
    order: 5,
    title: '内容审美与意义感',
    scenario:
      '面对一座只剩残垣断壁、极其考验文化功底的古城遗址，你和搭子站在烈日下，你内心的独白是？',
    wallpaperKey: 'ancient_ruins',
    wallpaper: wp('ancient_ruins'),
    options: [
      { id: 'A', label: '符号共鸣：抚摸石块仿佛能听到千年前的战马嘶鸣，哪怕晒死也要看三个小时。' },
      { id: 'B', label: '感官体验：看一堆石头有点无聊，不如早点去市集吃烤肉。' },
    ],
  },
];
