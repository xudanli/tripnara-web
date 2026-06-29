import type { Collaborator } from '@/types/trip';
import type {
  PlanningDaySplitBranchDto,
  PlanningDaySplitMemberDto,
  PlanningDaySplitSegmentDto,
} from '@/types/planning-day-split';

export function parseGroupLabel(groupLabel: string): { memberSummary: string; trait?: string } {
  const parts = groupLabel.split(/[·•|]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { memberSummary: parts[0]!, trait: parts.slice(1).join(' · ') };
  }
  return { memberSummary: groupLabel.trim() };
}

export function groupShortLabel(groupLabel: string): string {
  const parsed = parseGroupLabel(groupLabel);
  return parsed.trait ?? parsed.memberSummary;
}

export function resolveSegmentPoiTitle(segment: PlanningDaySplitSegmentDto): string {
  return segmentLabel(segment);
}

/** BFF SSOT：POI 展示名（placeName 优先，不用 nameEN） */
export function segmentLabel(segment: PlanningDaySplitSegmentDto): string {
  return segment.placeName?.trim() || segment.title.trim();
}

/** 仅读 BFF subtitle，不把 title 当副标题拼装 */
export function segmentSubtitle(segment: PlanningDaySplitSegmentDto): string | null {
  return segment.subtitle?.trim() || null;
}

function normalizeSegmentComparableText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** subtitle 与 highlights 相同时只保留 subtitle；highlights 内部也去重 */
export function segmentHighlightsExcludingSubtitle(
  segment: PlanningDaySplitSegmentDto,
): string[] {
  const subtitle = segmentSubtitle(segment);
  const subtitleKey = subtitle ? normalizeSegmentComparableText(subtitle) : null;
  const seen = new Set<string>();
  const items: string[] = [];

  for (const raw of segment.highlights ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeSegmentComparableText(trimmed);
    if (subtitleKey && key === subtitleKey) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(trimmed);
  }

  return items;
}

/** @deprecated 使用 segmentSubtitle */
export function resolveSegmentPoiSubtitle(segment: PlanningDaySplitSegmentDto): string | null {
  return segmentSubtitle(segment);
}

export function resolveSegmentDurationLabel(segment: PlanningDaySplitSegmentDto): string | null {
  if (segment.endTime) return `${segment.startTime} – ${segment.endTime}`;
  if (segment.startTime) return segment.startTime;
  return null;
}

export function resolveBranchMembers(
  branch: PlanningDaySplitBranchDto,
  collaborators: Collaborator[] = [],
): PlanningDaySplitMemberDto[] {
  if (branch.members?.length) return branch.members;

  if (branch.memberIds?.length) {
    return branch.memberIds.map((memberId) => {
      const collaborator = collaborators.find(
        (item) => item.userId === memberId || item.id === memberId,
      );
      return {
        id: memberId,
        displayName:
          collaborator?.displayName?.trim() ||
          collaborator?.email?.trim() ||
          memberId,
        avatarUrl: undefined,
      };
    });
  }

  return [];
}

export function resolveBranchMemberCount(
  branch: PlanningDaySplitBranchDto,
  members: PlanningDaySplitMemberDto[],
): number {
  if (members.length > 0) return members.length;
  return branch.memberCount;
}

export function memberInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
  }
  return trimmed.slice(0, 1).toUpperCase();
}
