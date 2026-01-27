/**
 * 路线特征配置
 * 用于根据行程数据推断路线类型
 */

export type RouteType = 
  | 'golden_circle'      // 黄金圈
  | 'south_coast'        // 南海岸
  | 'snaefellsnes'       // 斯奈山半岛
  | 'full_ring_road'     // 环岛公路
  | 'westfjords'         // 西峡湾
  | 'highlands'          // 高地
  | 'custom';            // 自定义

export interface RouteSignature {
  routeType: RouteType;
  countryCode: string;
  keywords: string[];              // 关键词（地点名称、路线名称等）
  typicalDays: number[];           // 典型行程天数
  regions?: string[];              // 典型区域
  keyPlaces?: string[];           // 关键地点ID或名称（可选）
  priority: number;                // 优先级（数字越大优先级越高）
}

/**
 * 路线特征库
 * 按国家维护不同的路线特征
 */
export const ROUTE_SIGNATURES: RouteSignature[] = [
  // 冰岛路线特征
  {
    routeType: 'golden_circle',
    countryCode: 'IS',
    keywords: [
      '黄金圈', 'Golden Circle',
      'Þingvellir', 'Thingvellir', '辛格韦德利',
      'Geysir', '盖歇尔',
      'Gullfoss', '古佛斯瀑布', '黄金瀑布',
    ],
    typicalDays: [1, 2],
    regions: ['Reykjavik', 'Þingvellir'],
    priority: 10,
  },
  {
    routeType: 'south_coast',
    countryCode: 'IS',
    keywords: [
      '南海岸', 'South Coast',
      'Vik', '维克',
      'Jökulsárlón', '杰古沙龙冰河湖',
      'Skaftafell', '斯卡夫塔山',
      'Reynisfjara', '黑沙滩',
    ],
    typicalDays: [2, 3, 4],
    regions: ['Vik', 'Höfn'],
    priority: 9,
  },
  {
    routeType: 'full_ring_road',
    countryCode: 'IS',
    keywords: [
      '环岛', 'Ring Road', 'Route 1',
      '环岛公路', '一号公路',
    ],
    typicalDays: [7, 8, 9, 10, 11, 12, 13, 14],
    regions: ['Reykjavik', 'Akureyri', 'Egilsstaðir'],
    priority: 8,
  },
  {
    routeType: 'snaefellsnes',
    countryCode: 'IS',
    keywords: [
      '斯奈山', 'Snaefellsnes',
      'Snæfellsnes', '斯奈山半岛',
    ],
    typicalDays: [1, 2, 3],
    regions: ['Snaefellsnes'],
    priority: 7,
  },
  {
    routeType: 'westfjords',
    countryCode: 'IS',
    keywords: [
      '西峡湾', 'Westfjords',
      'West Fjords',
    ],
    typicalDays: [3, 4, 5],
    regions: ['Ísafjörður'],
    priority: 6,
  },
  {
    routeType: 'highlands',
    countryCode: 'IS',
    keywords: [
      '高地', 'Highlands',
      '内陆高地',
    ],
    typicalDays: [3, 4, 5, 6],
    regions: [],
    priority: 5,
  },
  // 后续可以添加其他国家的路线特征
];

/**
 * 获取指定国家的路线特征
 */
export const getRouteSignaturesByCountry = (countryCode: string): RouteSignature[] => {
  return ROUTE_SIGNATURES.filter(sig => sig.countryCode === countryCode);
};
