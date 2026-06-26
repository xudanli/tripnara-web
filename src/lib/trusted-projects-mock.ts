import type { TrustedProjectListing } from '@/types/trusted-projects';

const MOCK_LISTINGS: TrustedProjectListing[] = [
  {
    id: 'tp-iceland-highlands',
    title: '冰岛高地徒步 · 8 日',
    destination: 'Iceland',
    startDate: '2026-08-01',
    endDate: '2026-08-08',
    summary: '兰德曼纳劳卡至索斯莫克经典穿越，强调体能门槛与天气变化预案。',
    commercialType: 'NON_COMMERCIAL',
    slotsTotal: 6,
    slotsRemaining: 3,
    budgetMinCents: 500000,
    budgetMaxCents: 800000,
    riskDisclosure: '高地天气多变，需具备多日徒步经验与防水装备。',
    listingStatus: 'published',
    publisherSubjectType: 'USER',
    publisherSubjectId: 'mock-leader-iceland',
    publisherDisplayName: '路鉴 · 认证领队',
    publishedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'tp-dolomites-via-ferrata',
    title: '多洛米蒂 Via Ferrata 入门周',
    destination: 'Italy',
    startDate: '2026-09-10',
    endDate: '2026-09-16',
    summary: '由认证向导带队，含装备检查与每日体能评估。',
    commercialType: 'COMMERCIAL',
    slotsTotal: 8,
    slotsRemaining: 2,
    budgetMinCents: 1200000,
    budgetMaxCents: 1500000,
    riskDisclosure: '铁索攀岩存在坠落风险，需完成向导行前评估。',
    refundPolicy: '出发前 14 天全额退款；7 天内按合同条款处理。',
    listingStatus: 'published',
    publisherSubjectType: 'ORGANIZATION',
    publisherSubjectId: 'mock-org-dolomites',
    publisherDisplayName: '多洛米蒂户外学院',
    responsibleUserId: 'mock-leader-dolomites',
    responsibleUserDisplayName: 'Marco G.',
    publishedAt: '2026-05-10T00:00:00.000Z',
  },
];

export function buildMockTrustedProjectListings(
  query?: { destination?: string }
): TrustedProjectListing[] {
  const dest = query?.destination?.trim().toLowerCase();
  if (!dest) return MOCK_LISTINGS;
  return MOCK_LISTINGS.filter((item) =>
    item.destination.toLowerCase().includes(dest)
  );
}

export function getMockTrustedProjectById(id: string): TrustedProjectListing | null {
  return MOCK_LISTINGS.find((item) => item.id === id) ?? null;
}
