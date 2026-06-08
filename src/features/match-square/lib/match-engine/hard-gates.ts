import type { MatchTripWindow } from './types';

function parseDate(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

/** 两行程窗口交集天数（含首尾） */
export function computeTripOverlapDays(
  a: MatchTripWindow | null | undefined,
  b: MatchTripWindow | null | undefined
): number | null {
  if (!a?.startDate || !a?.endDate || !b?.startDate || !b?.endDate) return null;

  const startA = parseDate(a.startDate);
  const endA = parseDate(a.endDate);
  const startB = parseDate(b.startDate);
  const endB = parseDate(b.endDate);

  const overlapStart = new Date(Math.max(startA.getTime(), startB.getTime()));
  const overlapEnd = new Date(Math.min(endA.getTime(), endB.getTime()));
  if (overlapEnd < overlapStart) return 0;

  const msPerDay = 86400000;
  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / msPerDay) + 1;
}

export function passesTimeLocationGate(
  leaderTrip: MatchTripWindow | null | undefined,
  memberTrip: MatchTripWindow | null | undefined,
  minOverlapDays = 3
): { pass: boolean; overlapDays: number | null; reason?: string } {
  if (!leaderTrip || !memberTrip) {
    return { pass: true, overlapDays: null };
  }

  if (
    leaderTrip.destination &&
    memberTrip.destination &&
    !destinationsCompatible(leaderTrip.destination, memberTrip.destination)
  ) {
    return {
      pass: false,
      overlapDays: 0,
      reason: '目的地不在同一出行半径，时空错位熔断',
    };
  }

  const overlapDays = computeTripOverlapDays(leaderTrip, memberTrip);
  if (overlapDays == null) return { pass: true, overlapDays: null };
  if (overlapDays < minOverlapDays) {
    return {
      pass: false,
      overlapDays,
      reason: `可同行窗口仅 ${overlapDays} 天，低于 ${minOverlapDays} 天阈值`,
    };
  }

  return { pass: true, overlapDays };
}

function destinationsCompatible(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return true;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return true;
}

export function passesSocialBandwidthGate(
  leaderTier: number,
  memberTier: number,
  maxTierGap = 3
): { pass: boolean; gap: number; reason?: string } {
  const gap = Math.abs(leaderTier - memberTier);
  if (gap > maxTierGap) {
    return {
      pass: false,
      gap,
      reason: '圈层沟通带宽错位 — 背书距离跨越 3 个层级，隐性不予推荐',
    };
  }
  return { pass: true, gap };
}
