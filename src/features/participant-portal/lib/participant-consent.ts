import type {
  ConsentCatalogType,
  ParticipantConsentCatalog,
  ParticipantConsentCatalogItem,
  ParticipantInviteLanding,
} from '@/types/participant-portal';

const DEFAULT_CATALOG_ITEMS: ParticipantConsentCatalogItem[] = [
  {
    type: 'BASE_SERVICE',
    required: true,
    label: '加入项目与基础数据处理',
    description: '用于项目协作与服务交付。',
  },
  {
    type: 'HUMAN_ASSISTED',
    required: true,
    label: '人工协助分析',
    description: 'Gate 1 验证版中部分步骤由 TripNARA 团队人工完成。',
  },
  {
    type: 'RESEARCH',
    required: false,
    label: '研究与产品改进',
    description: '可选，用于匿名化改进产品体验。',
  },
  {
    type: 'ANONYMIZED_CASE',
    required: false,
    label: '匿名化案例使用',
    description: '可选，用于内部培训或研究。',
  },
];

export function resolveConsentCatalog(landing: ParticipantInviteLanding): ParticipantConsentCatalog {
  if (landing.consentCatalog?.items?.length) {
    return landing.consentCatalog;
  }

  const legacyText = landing.consent?.text;
  return {
    version: landing.consent?.version ?? 'gate1-legacy',
    items: DEFAULT_CATALOG_ITEMS.map((item) =>
      item.type === 'BASE_SERVICE' && legacyText
        ? { ...item, text: legacyText }
        : item,
    ),
  };
}

export function buildConsentsPayload(
  selected: Partial<Record<ConsentCatalogType, boolean>>,
): Record<ConsentCatalogType, boolean> {
  return {
    BASE_SERVICE: selected.BASE_SERVICE ?? false,
    HUMAN_ASSISTED: selected.HUMAN_ASSISTED ?? false,
    RESEARCH: selected.RESEARCH ?? false,
    ANONYMIZED_CASE: selected.ANONYMIZED_CASE ?? false,
  };
}

export function canSubmitPreferencesFromConsents(
  consents: Partial<Record<ConsentCatalogType, boolean>>,
): boolean {
  return Boolean(consents.BASE_SERVICE && consents.HUMAN_ASSISTED);
}

export function participationSteps(landing: ParticipantInviteLanding): string[] {
  if (landing.participationGuide?.steps?.length) {
    return landing.participationGuide.steps;
  }
  return ['接受邀请', '完成知情同意', '填写偏好与约束', '查看方案并反馈'];
}

export function estimatedMinutes(landing: ParticipantInviteLanding): string {
  return landing.participationGuide?.estimatedMinutes ?? '3-5';
}
