/** 发布页 · 三字段分工示例（避免 recruitmentVision / itinerarySummary / captainMessage 混写） */

export const RECRUITMENT_COPY_GUIDE = {
  vision: {
    label: '招募愿景',
    field: 'vibeFreeText → recruitmentVision',
    hint: '怎么玩、要什么人 — 会出现在详情页 hero 与广场 Card 预览',
    example:
      '自驾环游青甘，路上一起做饭均摊、露营，晚上有空 vibe coding。希望搭子大厂靠谱、能轮值厨事。',
    avoid: '不要写 Day1 路线细节，也不要写「我是怎样的人」情感独白',
  },
  itinerary: {
    label: '行程概述',
    field: 'itinerarySummary',
    hint: '结构化 facts — 分日路线、打卡点、交通方式',
    example:
      'D1 兰州集结 → D2–3 青海湖环湖 → D4 敦煌莫高窟 → D5 嘉峪关 → D6 张掖丹霞 → D7 西宁解散。全程自驾，日均 300km 以内。',
    avoid: '不要重复上方愿景里的「想要什么人」',
  },
  captainMessage: {
    label: '队长寄语',
    field: 'captainMessage',
    hint: '情感化短信 — 详情页底部，面向潜在队友',
    example:
      '我是习惯把行程排清楚的 INTJ，不是控制狂，只是希望路上少点不确定性。如果你也认同「先对齐再出发」，欢迎聊聊。',
    avoid: '不要复制愿景或行程，这里写「为什么想组队、期待怎样的相处」',
  },
} as const;

export const VISION_COMPOSER_PLACEHOLDER = RECRUITMENT_COPY_GUIDE.vision.example;

export const ITINERARY_SUMMARY_PLACEHOLDER = RECRUITMENT_COPY_GUIDE.itinerary.example;

export const CAPTAIN_MESSAGE_PLACEHOLDER = RECRUITMENT_COPY_GUIDE.captainMessage.example;

/** 列表 Card · 愿景预览最大字数 */
export const RECRUITMENT_VISION_PREVIEW_MAX = 44;

export function truncateRecruitmentVisionPreview(text: string, max = RECRUITMENT_VISION_PREVIEW_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}
