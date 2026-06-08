import type { RecruitmentPostCard } from '@/types/match-square';
import { formatDateRangeLabel } from './mock-data';
import { truncateRecruitmentVisionPreview } from './recruitment-copy-guide';
import { resolveVibeChipLabels } from './vibe-llm/to-card-view';

/** 招募帖主标题：destination 优先 */
export function resolveRecruitmentTitle(
  post: Pick<RecruitmentPostCard, 'title' | 'destination' | 'vibeLlm' | 'vibeParse'>
): string {
  const destination = post.destination?.trim();
  if (destination) return destination;

  const apiTitle = post.title?.trim();
  if (apiTitle) return apiTitle;

  const firstVibe = resolveVibeChipLabels(post)[0]?.trim();
  if (firstVibe) return firstVibe;

  return '招募行程';
}

/** 招募愿景 hero 引言：recruitmentVision → vibeLlm.visionText */
export function resolveRecruitmentVision(
  post: Pick<
    RecruitmentPostCard,
    'recruitmentVision' | 'vibeLlm' | 'vibeFreeText' | 'vibeRawText'
  >
): string | null {
  const vision =
    post.recruitmentVision?.trim() ||
    post.vibeLlm?.visionText?.trim() ||
    post.vibeFreeText?.trim() ||
    post.vibeRawText?.trim();
  return vision || null;
}

/** 广场 Card · 愿景首行预览 */
export function resolveRecruitmentVisionPreview(
  post: Pick<
    RecruitmentPostCard,
    'recruitmentVision' | 'vibeLlm' | 'vibeFreeText' | 'vibeRawText'
  >
): string | null {
  const vision = resolveRecruitmentVision(post);
  if (!vision) return null;
  return truncateRecruitmentVisionPreview(vision);
}

/** 列表 Card · 队长寄语单行预览 */
export const RECRUITMENT_CAPTAIN_MESSAGE_PREVIEW_MAX = 72;

export function truncateCaptainMessagePreview(
  text: string,
  max = RECRUITMENT_CAPTAIN_MESSAGE_PREVIEW_MAX
): string {
  return truncateRecruitmentVisionPreview(text, max);
}

/** 广场列表 · captainMessage 预览（与愿景高度重复时不展示） */
export function resolveListCaptainMessagePreview(
  post: Pick<
    RecruitmentPostCard,
    'captainMessage' | 'recruitmentVision' | 'vibeLlm' | 'vibeFreeText' | 'vibeRawText'
  >
): string | null {
  const message = post.captainMessage?.trim();
  if (!message || message.length < 5) return null;

  const vision = resolveRecruitmentVision(post);
  if (vision) {
    const visionNorm = vision.replace(/\s+/g, '');
    const messageNorm = message.replace(/\s+/g, '');
    if (visionNorm.startsWith(messageNorm) || messageNorm.startsWith(visionNorm.slice(0, 48))) {
      return null;
    }
  }

  return truncateCaptainMessagePreview(message);
}

/** 目的地 / 路线标签（愿景作标题时下沉到 meta） */
export function resolveRecruitmentDestinationLabel(
  post: Pick<RecruitmentPostCard, 'title' | 'destination'>
): string | null {
  const destination = post.destination?.trim();
  if (destination) return destination;
  return post.title?.trim() || null;
}

/** 出发地展示（去掉「出发」后缀，便于与目的地拼接） */
function normalizeDepartureSegment(label: string | null | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/出发\s*$/u, '').trim();
  return stripped || trimmed;
}

/** 详情标题行：目的地 · 出发 · 日期 */
export function resolveRecruitmentRouteTitleLine(
  post: Pick<
    RecruitmentPostCard,
    'title' | 'destination' | 'departureLabel' | 'startDate' | 'endDate'
  >
): string {
  const destination = resolveRecruitmentDestinationLabel(post);
  const departure = normalizeDepartureSegment(post.departureLabel);
  const dateLabel = formatDateRangeLabel(post.startDate, post.endDate);
  return [destination, departure, dateLabel].filter(Boolean).join(' · ');
}

/** 详情 meta：目的地 · 出发 · 日期（愿景占主标题时使用） */
export function resolveRecruitmentDetailMetaLine(
  post: Pick<
    RecruitmentPostCard,
    'title' | 'destination' | 'departureLabel' | 'startDate' | 'endDate'
  >
): string {
  return resolveRecruitmentRouteTitleLine(post);
}

/** 副标题：出发地 · 日期（主标题已是目的地时不重复） */
export function resolveRecruitmentMetaLine(
  post: Pick<RecruitmentPostCard, 'departureLabel' | 'startDate' | 'endDate'>
): string {
  const dateLabel = formatDateRangeLabel(post.startDate, post.endDate);
  return [post.departureLabel?.trim(), dateLabel].filter(Boolean).join(' · ');
}
