import type { EducationDegreeLevel, EducationTierTag, IndustryCluster } from '@/types/match-square';

/** PRD 3.1.3 · 学历外显 — 仅阶层，不含校名 */
export function formatEducationVerifiedLabel(
  degreeLevel: EducationDegreeLevel,
  tierTags: EducationTierTag[] = []
): string {
  const degree =
    degreeLevel === 'doctorate' ? '博士' : degreeLevel === 'master' ? '硕士' : '本科';
  const overseas = tierTags.includes('overseas_returnee');
  const tier985 = tierTags.includes('985_211');
  const tierQs = tierTags.includes('qs_top50');

  if (overseas) return `🎓 ${degree}(海归)(已认证)`;
  if (tier985) return `🎓 985/211(已认证)`;
  if (tierQs) return `🎓 QS Top 50(已认证)`;
  return `🎓 ${degree}(已认证)`;
}

const INDUSTRY_BLUR_PREFIX: Record<IndustryCluster, string> = {
  tech_internet: '👨‍💻 泛科技',
  finance_consulting: '💼 金融咨询',
  manufacturing: '🏭 知名制造集团',
  education_research: '📚 教育科研',
  creative_media: '🎨 创意媒体',
  other_white_collar: '💼 白领职场',
};

function fuzzRoleTitle(raw: string): string {
  const title = raw.trim();
  if (!title) return '职场人';
  if (/总监|VP|Head|负责人|总经理/.test(title)) return '资深专家';
  if (/经理|主管|Lead/.test(title)) return '中层骨干';
  if (/工程师|开发|研发|算法|产品|设计|运营|分析师/.test(title)) return title.replace(/^.*?(工程师|开发|研发|算法|产品|设计|运营|分析师).*$/, '$1');
  return title.length > 12 ? `${title.slice(0, 8)}…` : title;
}

/** PRD 3.1.3 · 职业脱敏 — 去公司名，只留圈层 + 职能 */
export function blurProfessionVerifiedLabel(
  industryCluster: IndustryCluster,
  roleHint?: string
): string {
  const prefix = INDUSTRY_BLUR_PREFIX[industryCluster] ?? '💼 职场';
  const role = fuzzRoleTitle(roleHint ?? '');
  if (industryCluster === 'tech_internet' && /总监|专家|架构/.test(roleHint ?? '')) {
    return `${prefix}·${role}(已认证)`;
  }
  if (industryCluster === 'manufacturing') {
    return `${prefix}·${role || '解决方案专家'}(已认证)`;
  }
  return `${prefix}·${role}(已认证)`;
}

/** 从企业邮箱域名推断行业（mock / 前端占位，生产由后端字典完成） */
export function inferIndustryFromEmailDomain(email: string): IndustryCluster {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (/tencent|alibaba|bytedance|baidu|meituan|xiaomi|huawei|apple|microsoft|google/.test(domain)) {
    return 'tech_internet';
  }
  if (/bank|capital|fund|securities|consult/.test(domain)) return 'finance_consulting';
  if (/deli|guangbo|huazheng|material|group|mfg|ind/.test(domain)) return 'manufacturing';
  if (/media|studio|film|design/.test(domain)) return 'creative_media';
  return 'other_white_collar';
}
