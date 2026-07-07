import type {
  AttractionExploreCandidatesResponse,
  AttractionExploreContextResponse,
  AttractionExploreRecommendationsResponse,
} from '@/types/attraction-explore';

const BLUE_LAGOON =
  'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80';
const GULLFOSS =
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80';
const GEYSIR =
  'https://images.unsplash.com/photo-1529963185644-21a8876b4c7d?auto=format&fit=crop&w=800&q=80';
const GLACIER =
  'https://images.unsplash.com/photo-1483348728421-e68fd3281a26?auto=format&fit=crop&w=800&q=80';
const CANYON =
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80';
const MUSEUM =
  'https://images.unsplash.com/photo-1518176258769-f227c798151e?auto=format&fit=crop&w=800&q=80';

export const MOCK_ATTRACTION_EXPLORE_CONTEXT: AttractionExploreContextResponse = {
  themes: [
    { id: 'natural_wonders', label: '自然奇观' },
    { id: 'hot_springs', label: '温泉体验' },
    { id: 'glaciers', label: '冰川体验' },
    { id: 'volcanoes', label: '火山地貌' },
    { id: 'hidden_gems', label: '小众私藏' },
    { id: 'city_food', label: '城市与美食' },
  ],
  suitability: [
    { id: 'elderly_friendly', label: '适合老人' },
    { id: 'child_friendly', label: '适合儿童' },
    { id: 'light_physical', label: '体力要求低' },
    { id: 'couples', label: '情侣体验' },
    { id: 'barrier_free', label: '无障碍友好' },
  ],
  selectedThemeIds: ['natural_wonders', 'hot_springs'],
  selectedSuitabilityIds: ['elderly_friendly', 'light_physical'],
  tripContext: {
    departureLabel: '雷克雅未克',
    transportLabel: '自驾',
    paceLabel: '舒适/悠闲',
    weatherLabel: '6–12°C · 多云/有雨',
  },
  memberPreferences: {
    memberCount: 2,
    memberInitials: ['我', '伴'],
    summary: '我们希望… 少走路、停车方便、多看自然风光、少购物、体验温泉、吃当地美食',
  },
};

export const MOCK_ATTRACTION_EXPLORE_RECOMMENDATIONS: AttractionExploreRecommendationsResponse = {
  sections: [
    {
      id: 'first_time',
      title: '第一次来最值得去',
      items: [
        {
          id: 'blue-lagoon',
          placeId: 1001,
          name: '蓝湖温泉',
          nameEN: 'Blue Lagoon',
          categoryLabel: '温泉体验',
          regionLabel: '雷克雅内斯半岛',
          description: '冰岛最 iconic 的地热温泉，乳蓝色湖水适合放松，建议提前预约。',
          imageUrl: BLUE_LAGOON,
          badge: '人气 No.1',
          metadata: {
            stayMinutes: 120,
            detourMinutes: 25,
            physicalLevel: 'low',
            bookingRequired: true,
          },
        },
        {
          id: 'gullfoss',
          placeId: 1002,
          name: '黄金瀑布',
          nameEN: 'Gullfoss',
          categoryLabel: '自然奇观',
          regionLabel: '黄金圈',
          description: '双层瀑布气势磅礴，观景台步行短，适合首次来冰岛的经典打卡。',
          imageUrl: GULLFOSS,
          metadata: {
            stayMinutes: 60,
            detourMinutes: 8,
            physicalLevel: 'low',
          },
        },
        {
          id: 'geysir',
          placeId: 1003,
          name: '盖歇尔间歇泉',
          nameEN: 'Geysir',
          categoryLabel: '自然奇观',
          regionLabel: '黄金圈',
          description: '每隔数分钟喷发一次，周边地热景观密集，停车方便。',
          imageUrl: GEYSIR,
          metadata: {
            stayMinutes: 45,
            detourMinutes: 5,
            physicalLevel: 'low',
          },
        },
      ],
    },
    {
      id: 'near_route',
      title: '刚好在你的路线附近',
      subtitle: '基于当前自驾路线，绕路时间可控',
      items: [
        {
          id: 'jokulsarlon',
          placeId: 1004,
          name: '杰古沙龙冰河湖',
          nameEN: 'Jökulsárlón',
          categoryLabel: '冰川体验',
          regionLabel: '南岸',
          description: '浮冰与黑色沙滩相映，可安排 1–2 小时步行观景。',
          imageUrl: GLACIER,
          metadata: {
            stayMinutes: 90,
            detourMinutes: 12,
            physicalLevel: 'medium',
            distanceFromRouteKm: 12,
          },
        },
        {
          id: 'diamond-beach',
          placeId: 1005,
          name: '钻石沙滩',
          nameEN: 'Diamond Beach',
          categoryLabel: '自然奇观',
          regionLabel: '南岸',
          description: '与冰河湖相邻，冰块搁浅在黑色沙滩上，适合拍照。',
          imageUrl: GLACIER,
          metadata: {
            stayMinutes: 45,
            detourMinutes: 0,
            physicalLevel: 'low',
            distanceFromRouteKm: 0.5,
          },
        },
        {
          id: 'fjaðrargljufur',
          placeId: 1006,
          name: '羽毛峡谷',
          nameEN: 'Fjaðrárgljúfur',
          categoryLabel: '小众私藏',
          regionLabel: '南岸',
          description: '蜿蜒峡谷步道，体力要求低，雨天也可安全游览。',
          imageUrl: CANYON,
          metadata: {
            stayMinutes: 60,
            detourMinutes: 18,
            physicalLevel: 'low',
            distanceFromRouteKm: 18,
          },
        },
      ],
    },
    {
      id: 'rainy_day',
      title: '下雨天也能玩',
      items: [
        {
          id: 'perlan',
          placeId: 1007,
          name: '珍珠楼博物馆',
          nameEN: 'Perlan',
          categoryLabel: '城市与美食',
          regionLabel: '雷克雅未克',
          description: '室内天文馆与全景餐厅，雨天备选，适合老人与儿童。',
          imageUrl: MUSEUM,
          metadata: {
            stayMinutes: 120,
            detourMinutes: 10,
            physicalLevel: 'low',
            bookingRequired: false,
          },
        },
      ],
    },
  ],
};

export const MOCK_ATTRACTION_EXPLORE_CANDIDATES: AttractionExploreCandidatesResponse = {
  candidates: [
    {
      id: 'c1',
      placeId: 1001,
      name: '蓝湖温泉',
      imageUrl: BLUE_LAGOON,
      priority: 'must_go',
      sortOrder: 0,
    },
    {
      id: 'c2',
      placeId: 1002,
      name: '黄金瀑布',
      imageUrl: GULLFOSS,
      priority: 'must_go',
      sortOrder: 1,
    },
    {
      id: 'c3',
      placeId: 1003,
      name: '盖歇尔间歇泉',
      imageUrl: GEYSIR,
      priority: 'must_go',
      sortOrder: 2,
    },
    {
      id: 'c4',
      placeId: 1004,
      name: '杰古沙龙冰河湖',
      imageUrl: GLACIER,
      priority: 'very_interested',
      sortOrder: 0,
    },
    {
      id: 'c5',
      placeId: 1005,
      name: '钻石沙滩',
      imageUrl: GLACIER,
      priority: 'very_interested',
      sortOrder: 1,
    },
    {
      id: 'c6',
      placeId: 1006,
      name: '羽毛峡谷',
      imageUrl: CANYON,
      priority: 'very_interested',
      sortOrder: 2,
    },
    {
      id: 'c7',
      placeId: 1007,
      name: '珍珠楼博物馆',
      imageUrl: MUSEUM,
      priority: 'alternative',
      sortOrder: 0,
    },
    {
      id: 'c8',
      placeId: 1008,
      name: '塞里雅兰瀑布',
      imageUrl: GULLFOSS,
      priority: 'alternative',
      sortOrder: 1,
    },
  ],
  summary: {
    attractionCount: 8,
    estimatedDays: 3.5,
    routeSpanKm: 680,
  },
};
