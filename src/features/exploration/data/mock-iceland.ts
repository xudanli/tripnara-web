import type {
  ConsumerPrinciple,
  ExplorationConditions,
  RouteCandidateMock,
  RouteStyleOption,
} from '../types';

export const ICELAND_RESEARCH_CONDITIONS: ExplorationConditions = {
  destinationLabel: '冰岛',
  destinationCode: 'IS',
  monthLabel: '9 月 · 秋季',
  durationDays: 9,
  travelersLabel: '2 位成人',
  budgetLabel: '3,000–4,000 美元',
  mobilityLabel: '自驾',
  vehicleLabel: '2WD 紧凑型 SUV',
};

export const CONSUMER_PRINCIPLES: ConsumerPrinciple[] = [
  {
    id: 'pace',
    title: '少赶路',
    description: '每个地方多停留，减少频繁移动带来的奔波感',
    icon: 'mountain',
  },
  {
    id: 'safety',
    title: '不夜驾',
    description: '尽量避免天黑后驾驶，确保行车安全',
    icon: 'car',
  },
  {
    id: 'experience',
    title: '核心体验优先',
    description: '不只打卡热门景点，把预算和时间留给关键体验',
    icon: 'camera',
  },
  {
    id: 'coverage',
    title: '更想探索小众区域',
    description: '不追求著名景点，想去人少的地方发现不同风景',
    icon: 'map-pin',
  },
  {
    id: 'budget',
    title: '预算可以适度增加',
    description: '若带来更好体验或更高效率，愿意适度增加预算',
    icon: 'wallet',
  },
  {
    id: 'lodging',
    title: '住宿稳定优先',
    description: '希望尽量少换酒店，减少打包搬运行李，旅行更轻松',
    icon: 'bed',
  },
];

export const ROUTE_STYLE_OPTIONS: RouteStyleOption[] = [
  {
    id: 'relaxed',
    title: '轻松看经典',
    description: '少走路、慢节奏，看精华景点',
    icon: 'mountain',
    recommendedRouteId: 'south-depth',
    recommendationLabel: '南岸深度路线',
    traits: ['更少游客', '探索感适中', '车辆与路线要求较低'],
  },
  {
    id: 'coverage',
    title: '尽可能多看',
    description: '尽可能多的打卡景点，覆盖更多区域',
    icon: 'car',
    recommendedRouteId: 'ring-compressed',
    recommendationLabel: '环岛压缩路线',
    traits: ['覆盖更广', '驾驶强度更高', '换宿更频繁'],
  },
  {
    id: 'remote',
    title: '深入未知地区',
    description: '更少游客与公路里程，探索更多不确定性',
    icon: 'flag',
    recommendedRouteId: 'highland-south',
    recommendationLabel: '高地探索 + 南岸路线',
    traits: ['更少游客', '探索感更强', '需要更高车辆与路线条件'],
  },
];

export const ROUTE_CANDIDATES: RouteCandidateMock[] = [
  {
    id: 'south-depth',
    title: '南岸深度路线',
    tagline: '少赶路，把时间留给冰川、瀑布与南岸体验',
    badge: { label: '推荐', tone: 'recommended' },
    imageGradient: 'from-muted/70 via-background to-muted/50',
    audience: '喜欢自然风景、摄影、节奏偏慢、不想开太多路的旅行者',
    gains: ['南岸核心自然景点停留更充分', '每日驾驶时间相对可控', '更容易避免夜驾', '住宿安排更稳定'],
    sacrifices: ['覆盖范围有限', '西部与北部区域会较赶或无法纳入', '高地小众体验较少'],
    metrics: {
      drivingHoursPerDay: 2.6,
      drivingLevel: '低',
      explorationLevel: '中',
      uncertainty: '南岸天气影响',
    },
    compare: {
      exploration: { level: '中高', note: '深入小镇与冰川' },
      drivingIntensity: { level: '2.6h/天', note: '节奏偏慢' },
      experienceDensity: { level: '高 · 4.2项/天', note: '自然/小众' },
      stayStability: { level: '高 · 1次换宿', note: '节奏稳定' },
      flexibility: { level: '高', note: '2个半天缓冲' },
      uncertainty: { level: '低', note: '多数风险可控' },
    },
    matchScore: 92,
    matchSummary: '少赶路、深度体验、住宿稳定、弹性较高',
    detail: {
      summary: '适合第一次来冰岛、希望少赶路并沉浸核心自然景观的旅行者',
      totalKm: 720,
      avgDrivingHours: 2.6,
      stayChanges: 3,
      regions: ['南岸', '黄金圈'],
      days: [
        { day: 1, theme: '抵达雷克雅未克', route: '机场 → 雷克雅未克', driving: '0.8h', experience: '市区休整', stay: '雷克雅未克', mapPoint: { lng: -21.9426, lat: 64.1466 } },
        { day: 2, theme: '黄金圈精华', route: '雷克雅未克 → 黄金圈 → 南岸', driving: '2.4h', experience: '间歇泉、黄金瀑布', stay: 'Hella 区域', mapPoint: { lng: -20.3, lat: 64.25 } },
        { day: 3, theme: '南岸瀑布带', route: 'Seljalandsfoss → Skógafoss → Vík', driving: '2.2h', experience: '瀑布群、黑沙滩', stay: 'Vík', mapPoint: { lng: -19.0083, lat: 63.4186 } },
        { day: 4, theme: '冰川与冰湖', route: 'Vík → 杰古沙龙冰河湖', driving: '2.8h', experience: '冰河湖、钻石沙滩', stay: 'Höfn 区域', mapPoint: { lng: -16.1781, lat: 64.0477 } },
        { day: 5, theme: '返程南岸', route: 'Höfn → 南岸 → 雷克雅未克', driving: '3.1h', experience: '补充南岸体验', stay: '雷克雅未克', mapPoint: { lng: -21.9426, lat: 64.1466 } },
      ],
      highlights: ['南岸核心自然景点停留更充分', '每日驾驶时间相对可控', '住宿安排更稳定'],
      preparations: ['关注南岸天气变化', '部分路段为砂石路，注意限速'],
    },
  },
  {
    id: 'ring-compressed',
    title: '环岛压缩路线',
    tagline: '用更高驾驶强度换更广的冰岛覆盖',
    imageGradient: 'from-muted/60 via-background to-muted/40',
    audience: '希望在有限天数内环岛、能接受较长驾驶时间的旅行者',
    gains: ['覆盖经典环岛景点', '区域多样性更高', '适合「尽可能多看」'],
    sacrifices: ['每日驾驶时间长', '停留时间有限', '行程节奏偏紧'],
    metrics: {
      drivingHoursPerDay: 4.8,
      drivingLevel: '高',
      explorationLevel: '高',
      uncertainty: '北部天气影响',
    },
    compare: {
      exploration: { level: '中', note: '打卡点多、停留短' },
      drivingIntensity: { level: '4.8h/天', note: '长距离转移' },
      experienceDensity: { level: '中 · 7.2项/天', note: '节奏快' },
      stayStability: { level: '中 · 6次换宿', note: '频繁换宿' },
      flexibility: { level: '中', note: '1个半天缓冲' },
      uncertainty: { level: '中', note: '天气影响较大' },
    },
    matchScore: 58,
    matchSummary: '覆盖广，但强度高、节奏紧',
    detail: {
      summary: '用驾驶强度换覆盖，适合想尽可能多看冰岛的旅行者',
      totalKm: 1380,
      avgDrivingHours: 4.8,
      stayChanges: 6,
      regions: ['南岸', '东部', '北部', '西部'],
      days: [
        { day: 1, theme: '南岸启动', route: '雷克雅未克 → 南岸', driving: '3.5h', experience: '瀑布与黑沙滩', stay: 'Vík', mapPoint: { lng: -21.9426, lat: 64.1466 } },
        { day: 2, theme: '东岸推进', route: 'Vík → 东部峡湾', driving: '5.2h', experience: '峡湾风光', stay: 'Egilsstaðir', mapPoint: { lng: -14.4014, lat: 65.2637 } },
        { day: 3, theme: '北部压缩', route: '东部 → 米湖 → 阿克雷里', driving: '4.6h', experience: '地热与火山', stay: 'Akureyri', mapPoint: { lng: -18.1059, lat: 65.6835 } },
      ],
      highlights: ['覆盖经典环岛景点', '区域多样性更高'],
      preparations: ['需接受长距离驾驶', '北部天气变化大，需预留缓冲'],
    },
  },
  {
    id: 'highland-south',
    title: '高地探索 + 南岸',
    tagline: '进入小众区域，但需更好车辆与路线条件',
    badge: { label: '小众路线', tone: 'niche' },
    imageGradient: 'from-muted/80 via-muted/30 to-background',
    audience: '希望避开人流、有一定越野信心、追求独特体验的冒险型旅行者',
    gains: ['高地独特地貌', '游客密度更低', '探索感最强'],
    sacrifices: ['车辆与道路要求高', '天气影响更大', '需要更高计划弹性'],
    metrics: {
      drivingHoursPerDay: 3.6,
      drivingLevel: '中高',
      explorationLevel: '很高',
      uncertainty: '道路状况与天气',
    },
    compare: {
      exploration: { level: '很高', note: '深入内陆体验' },
      drivingIntensity: { level: '3.6h/天', note: '高地道路为主' },
      experienceDensity: { level: '很高 · 5.8项/天', note: '冒险型' },
      stayStability: { level: '中 · 4次换宿', note: '分布较散' },
      flexibility: { level: '低', note: '缓冲较少' },
      uncertainty: { level: '高', note: 'F 路/天气风险' },
    },
    matchScore: 78,
    matchSummary: '深度体验、探索感强，但不确定性高',
    detail: {
      summary: '门槛更高，换来更少游客与更强荒野体验',
      totalKm: 960,
      avgDrivingHours: 3.6,
      stayChanges: 4,
      regions: ['南岸', '高地'],
      days: [
        { day: 1, theme: '南岸热身', route: '雷克雅未克 → 南岸', driving: '2.8h', experience: '瀑布与黑沙滩', stay: 'Vík', mapPoint: { lng: -21.9426, lat: 64.1466 } },
        { day: 2, theme: '高地前置', route: '南岸 → 高地入口', driving: '3.2h', experience: '高地景观初探', stay: 'Landmannalaugar 区域', tip: '部分道路有车辆要求', mapPoint: { lng: -19.0083, lat: 63.4186 } },
        { day: 3, theme: 'F 路核心段', route: 'Landmannalaugar → 内陆', driving: '4.0h', experience: '彩色火山与地热', stay: '高地 hut/露营', tip: 'F 路需合规四驱', mapPoint: { lng: -19.0618, lat: 63.9839 } },
        { day: 4, theme: '返回南岸', route: '内陆 → 南岸', driving: '3.5h', experience: '补充南岸体验', stay: 'Höfn 区域', mapPoint: { lng: -15.2083, lat: 64.2539 } },
        {
          day: 5,
          theme: '进入高地区域',
          route: '米湖 → Askja 高地',
          driving: '4.2h',
          experience: '高地 F 路、地热景观',
          stay: '高地 hut/露营',
          tip: '部分道路有车辆要求',
          highlight: true,
          mapPoint: { lng: -16.7283, lat: 65.0467 },
        },
      ],
      highlights: ['高地独特地貌与低游客密度', '探索感最强', '节奏相对灵活'],
      preparations: ['需合规四驱并有涉水能力', '部分区域无信号/服务', '需提前规划燃油与补给'],
    },
  },
];

export function getRouteById(id: string): RouteCandidateMock | undefined {
  const aliases: Record<string, string> = {
    'route_remote-highlands-south': 'highland-south',
    'route_south-depth': 'south-depth',
    'route_ring-compressed': 'ring-compressed',
  };
  const normalized = aliases[id] ?? id;
  const exact = ROUTE_CANDIDATES.find((r) => r.id === normalized || r.id === id);
  if (exact) return exact;
  return ROUTE_CANDIDATES.find(
    (r) => id.includes(r.id) || r.id.includes(id.replace(/^route_/, '')),
  );
}

export const COMPARE_DIMENSIONS = [
  { key: 'exploration', label: '探索感' },
  { key: 'drivingIntensity', label: '驾驶强度' },
  { key: 'experienceDensity', label: '体验密度' },
  { key: 'stayStability', label: '住宿稳定性' },
  { key: 'flexibility', label: '路线弹性' },
  { key: 'uncertainty', label: '不确定性' },
] as const;

export const CHECK_PROGRESS_ITEMS = [
  { id: 'connections', title: '每日路线衔接', description: '确认每一天的行程没有时间冲突且可执行', durationMs: 1200 },
  { id: 'rules', title: '目的地道路规则', description: '核对目的地道路通行、限行与季节限制', durationMs: 1400 },
  { id: 'vehicle', title: '车辆与道路条件', description: '评估车辆是否适合路况、天气与道路类型', durationMs: 1800 },
  { id: 'mandatory', title: '必须处理的问题', description: '识别潜在风险或必须处理的限制', durationMs: 1600 },
  { id: 'options', title: '可选解决方案', description: '准备替代路线或调整建议', durationMs: 1200 },
] as const;
