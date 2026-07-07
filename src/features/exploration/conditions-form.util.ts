import type {
  CreateExplorationScenarioRequest,
  ExplorationInsuranceCoverageTier,
  ExplorationScenarioDetail,
  PatchScenarioConditionsRequest,
} from './api/types';
import { ICELAND_RESEARCH_CONDITIONS } from './data/mock-iceland';

export type VehicleTypeCode = '2WD_COMPACT_SUV' | '4WD_SUV' | '4WD_VAN';

export interface ExplorationConditionsFormState {
  destinationCode: string;
  startDate: string;
  endDate: string;
  adultCount: number;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  vehicleType: string;
  insuranceCoverageTier: ExplorationInsuranceCoverageTier;
  rentalPickupLocation: string;
  rentalPickupTimeLocal: string;
  afterHoursPickupConfirmed: boolean;
}

export type ConditionsFormFieldKey =
  | 'startDate'
  | 'endDate'
  | 'adultCount'
  | 'budgetMin'
  | 'budgetMax';

export type ConditionsFormFieldErrors = Partial<Record<ConditionsFormFieldKey, string>>;

const DESTINATION_LABELS: Record<string, string> = {
  IS: '冰岛',
};

export const VEHICLE_TYPE_OPTIONS: Array<{ code: VehicleTypeCode; label: string }> = [
  { code: '2WD_COMPACT_SUV', label: '2WD 紧凑型 SUV' },
  { code: '4WD_SUV', label: '四驱 SUV' },
  { code: '4WD_VAN', label: '四驱 Van' },
];

export const INSURANCE_TIER_OPTIONS: Array<{
  code: ExplorationInsuranceCoverageTier;
  label: string;
}> = [
  { code: 'BASIC', label: '基础' },
  { code: 'STANDARD', label: '标准' },
  { code: 'FULL', label: '全险' },
  { code: 'UNKNOWN', label: '未确认' },
];

export const DEFAULT_CONDITIONS_FORM: ExplorationConditionsFormState = {
  destinationCode: ICELAND_RESEARCH_CONDITIONS.destinationCode,
  startDate: '2026-09-10',
  endDate: '2026-09-18',
  adultCount: 2,
  budgetMin: 3000,
  budgetMax: 4000,
  currency: 'USD',
  vehicleType: '2WD_COMPACT_SUV',
  insuranceCoverageTier: 'STANDARD',
  rentalPickupLocation: 'KEF',
  rentalPickupTimeLocal: '10:00',
  afterHoursPickupConfirmed: false,
};

export function destinationLabelFromCode(code: string): string {
  return DESTINATION_LABELS[code] ?? code;
}

export function validateConditionsForm(
  form: ExplorationConditionsFormState,
  lockedFields: string[] = [],
): ConditionsFormFieldErrors {
  const errors: ConditionsFormFieldErrors = {};
  const locked = new Set(lockedFields);

  if (!locked.has('dateRange')) {
    if (!form.startDate?.trim()) {
      errors.startDate = '请选择出发日期';
    }
    if (!form.endDate?.trim()) {
      errors.endDate = '请选择返回日期';
    }
    if (form.startDate && form.endDate) {
      const startMs = Date.parse(form.startDate);
      const endMs = Date.parse(form.endDate);
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs < startMs) {
        errors.endDate = '返回日期不能早于出发日期';
      }
    }
  }

  if (!locked.has('travelers')) {
    if (!Number.isFinite(form.adultCount) || form.adultCount < 1 || form.adultCount > 8) {
      errors.adultCount = '成人人数须在 1–8 之间';
    }
  }

  if (!locked.has('budget')) {
    if (!Number.isFinite(form.budgetMin) || form.budgetMin < 0) {
      errors.budgetMin = '预算下限须为有效非负数字';
    }
    if (!Number.isFinite(form.budgetMax) || form.budgetMax < 0) {
      errors.budgetMax = '预算上限须为有效非负数字';
    }
    if (
      Number.isFinite(form.budgetMin) &&
      Number.isFinite(form.budgetMax) &&
      form.budgetMin > form.budgetMax
    ) {
      errors.budgetMax = '预算上限不能低于下限';
    }
  }

  return errors;
}

export function hasConditionsFormErrors(errors: ConditionsFormFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function formToCreateScenarioRequest(
  form: ExplorationConditionsFormState,
): CreateExplorationScenarioRequest {
  return {
    destinationCodes: [form.destinationCode],
    dateRange: { startDate: form.startDate, endDate: form.endDate },
    travelers: Array.from({ length: Math.max(1, form.adultCount) }, () => ({
      type: 'ADULT' as const,
    })),
    budget: {
      currency: form.currency,
      min: form.budgetMin,
      max: form.budgetMax,
    },
    mobilityContext: { vehicleType: form.vehicleType },
    insuranceContext: { coverageTier: form.insuranceCoverageTier },
    rentalContext: {
      pickupLocation: form.rentalPickupLocation || undefined,
      pickupTimeLocal: form.rentalPickupTimeLocal || undefined,
      afterHoursPickupConfirmed: form.afterHoursPickupConfirmed,
    },
  };
}

export function formToPatchScenarioConditions(
  form: ExplorationConditionsFormState,
): PatchScenarioConditionsRequest {
  return formToCreateScenarioRequest(form);
}

export function scenarioDetailToForm(
  detail: ExplorationScenarioDetail,
  fallback: ExplorationConditionsFormState = DEFAULT_CONDITIONS_FORM,
): ExplorationConditionsFormState {
  const s = detail.scenario ?? {};
  const adults = s.travelers?.filter((t) => t.type === 'ADULT').length ?? fallback.adultCount;
  return {
    destinationCode: s.destinationCodes?.[0] ?? fallback.destinationCode,
    startDate: s.dateRange?.startDate ?? fallback.startDate,
    endDate: s.dateRange?.endDate ?? fallback.endDate,
    adultCount: adults || 1,
    budgetMin: s.budget?.min ?? fallback.budgetMin,
    budgetMax: s.budget?.max ?? fallback.budgetMax,
    currency: s.budget?.currency ?? fallback.currency,
    vehicleType: s.mobilityContext?.vehicleType ?? fallback.vehicleType,
    insuranceCoverageTier:
      s.insuranceContext?.coverageTier ?? fallback.insuranceCoverageTier,
    rentalPickupLocation:
      s.rentalContext?.pickupLocation ?? fallback.rentalPickupLocation,
    rentalPickupTimeLocal:
      s.rentalContext?.pickupTimeLocal ?? fallback.rentalPickupTimeLocal,
    afterHoursPickupConfirmed:
      s.rentalContext?.afterHoursPickupConfirmed ?? fallback.afterHoursPickupConfirmed,
  };
}

export function durationDaysFromDateRange(startDate: string, endDate: string): number {
  const startMs = Date.parse(startDate);
  const endMs = Date.parse(endDate);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
}

export function durationDaysFromForm(form: ExplorationConditionsFormState): number {
  return durationDaysFromDateRange(form.startDate, form.endDate);
}

export function readStoredConditionsForm(): ExplorationConditionsFormState {
  try {
    const raw = sessionStorage.getItem('tripnara.exploration.conditions-form');
    if (!raw) return DEFAULT_CONDITIONS_FORM;
    return { ...DEFAULT_CONDITIONS_FORM, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONDITIONS_FORM;
  }
}

export function persistConditionsForm(form: ExplorationConditionsFormState): void {
  sessionStorage.setItem('tripnara.exploration.conditions-form', JSON.stringify(form));
}
