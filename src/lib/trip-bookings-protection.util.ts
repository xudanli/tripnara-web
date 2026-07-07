import type { DecisionQueueItem, TravelStatusResponse } from '@/api/travel-status.types';
import type { TripDetail } from '@/types/trip';
import { resolveTravelerCount } from '@/lib/planning-constraints.util';

export type InsuranceCoverageStatus = 'confirmed' | 'partial' | 'excluded' | 'unknown';

export interface DriverEligibilityView {
  primaryDriverLabel: string;
  ageRequirement: string;
  licenseRequirement: string;
  licenseLanguage: string;
  winterExperience: string;
}

export interface RouteCompatibilityRow {
  id: string;
  label: string;
  status: 'suitable' | 'caution' | 'unsuitable' | 'forbidden';
  statusLabel: string;
}

export interface InsuranceCoverageRow {
  id: string;
  risk: string;
  status: InsuranceCoverageStatus;
  statusLabel: string;
}

export interface TripBookingsProtectionView {
  driver: DriverEligibilityView;
  vehicleLabel: string;
  routeRows: RouteCompatibilityRow[];
  routeIssue?: string;
  insuranceRows: InsuranceCoverageRow[];
  hasAmbiguity: boolean;
}

function textBlob(parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function vehicleDecisions(decisions: DecisionQueueItem[]): DecisionQueueItem[] {
  return decisions.filter((d) =>
    /车辆|2wd|4wd|f208|f路|租车|road|涉水/i.test(textBlob([d.headline, d.impact])),
  );
}

function insuranceDecisions(decisions: DecisionQueueItem[]): DecisionQueueItem[] {
  return decisions.filter((d) =>
    /保险|insurance|涉水|底盘|轮胎|挡风玻璃|碎石/i.test(textBlob([d.headline, d.impact])),
  );
}

const INSURANCE_TEMPLATE: Array<{ id: string; risk: string; keywords: string[] }> = [
  { id: 'collision', risk: '碰撞损伤', keywords: ['碰撞', 'collision'] },
  { id: 'gravel', risk: '碎石损伤', keywords: ['碎石', 'gravel'] },
  { id: 'ash', risk: '沙尘与火山灰', keywords: ['火山', 'ash', '沙尘'] },
  { id: 'windshield', risk: '挡风玻璃', keywords: ['玻璃', 'windshield'] },
  { id: 'tire', risk: '轮胎', keywords: ['轮胎', 'tire'] },
  { id: 'undercarriage', risk: '底盘损伤', keywords: ['底盘', 'undercarriage'] },
  { id: 'water', risk: '涉水损伤', keywords: ['涉水', 'water'] },
  { id: 'wind-door', risk: '风吹车门损伤', keywords: ['风', 'door'] },
];

export function buildTripBookingsProtectionView(
  trip: TripDetail,
  status: TravelStatusResponse | null | undefined,
): TripBookingsProtectionView {
  const decisions = status?.openDecisions ?? [];
  const vehicle = vehicleDecisions(decisions);
  const insurance = insuranceDecisions(decisions);
  const travelerCount = resolveTravelerCount(trip);

  const has2wdIssue = vehicle.some((d) => /2wd|2wd/i.test(textBlob([d.headline, d.impact])));
  const hasFrRoadIssue = vehicle.some((d) => /f208|f路|高地/i.test(textBlob([d.headline, d.impact])));
  const hasWaterIssue = insurance.some((d) => /涉水/i.test(textBlob([d.headline, d.impact])));

  const routeRows: RouteCompatibilityRow[] = [
    {
      id: 'paved',
      label: '普通公路',
      status: 'suitable',
      statusLabel: '适合',
    },
    {
      id: 'gravel-road',
      label: '碎石道路',
      status: has2wdIssue ? 'caution' : 'suitable',
      statusLabel: has2wdIssue ? '谨慎' : '适合',
    },
    {
      id: 'f-road',
      label: 'F 路',
      status: hasFrRoadIssue ? 'unsuitable' : has2wdIssue ? 'forbidden' : 'caution',
      statusLabel: hasFrRoadIssue || has2wdIssue ? '不适合' : '谨慎',
    },
    {
      id: 'water',
      label: '涉水路段',
      status: hasWaterIssue ? 'forbidden' : 'unsuitable',
      statusLabel: hasWaterIssue ? '不允许' : '未确认',
    },
  ];

  const insuranceRows: InsuranceCoverageRow[] = INSURANCE_TEMPLATE.map((row) => {
    const matched = insurance.find((d) =>
      row.keywords.some((k) => textBlob([d.headline, d.impact]).includes(k)),
    );
    let coverageStatus: InsuranceCoverageStatus = 'unknown';
    if (matched) {
      if (matched.severity === 'BLOCK') coverageStatus = 'excluded';
      else if (matched.severity === 'CONFLICT' || matched.severity === 'VERIFY') coverageStatus = 'partial';
      else coverageStatus = 'confirmed';
    }
    const statusLabels: Record<InsuranceCoverageStatus, string> = {
      confirmed: '已确认',
      partial: '部分覆盖',
      excluded: '不保障',
      unknown: '未确认',
    };
    return {
      id: row.id,
      risk: row.risk,
      status: coverageStatus,
      statusLabel: statusLabels[coverageStatus],
    };
  });

  return {
    driver: {
      primaryDriverLabel: travelerCount > 1 ? `${travelerCount} 位出行人` : '主驾驶人',
      ageRequirement: '满足',
      licenseRequirement: '满足',
      licenseLanguage: '需要确认',
      winterExperience: '未填写',
    },
    vehicleLabel: has2wdIssue ? '当前计划车辆 · 2WD' : '当前计划车辆',
    routeRows,
    routeIssue: vehicle[0]?.headline,
    insuranceRows,
    hasAmbiguity: insuranceRows.some((r) => r.status === 'unknown' || r.status === 'partial'),
  };
}

export function insuranceCoverageTone(status: InsuranceCoverageStatus): string {
  switch (status) {
    case 'confirmed':
      return 'text-gate-allow-foreground';
    case 'partial':
      return 'text-gate-confirm-foreground';
    case 'excluded':
      return 'text-gate-reject-foreground';
    default:
      return 'text-muted-foreground';
  }
}

export function routeCompatibilityTone(
  status: RouteCompatibilityRow['status'],
): string {
  switch (status) {
    case 'suitable':
      return 'text-gate-allow-foreground';
    case 'caution':
      return 'text-gate-confirm-foreground';
    case 'unsuitable':
    case 'forbidden':
      return 'text-gate-reject-foreground';
  }
}
