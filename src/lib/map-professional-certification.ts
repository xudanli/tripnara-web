import type { SubmitProfessionalCertificationPayload } from '@/types/professional-certification';
import type { ProfessionalDraftBody } from '@/types/identity-governance';

/** 前端多步表单 → POST /identity/professional/draft */
export function mapProfessionalPayloadToDraftBody(
  payload: SubmitProfessionalCertificationPayload
): ProfessionalDraftBody {
  const years = Number.parseInt(payload.experience.yearsOfExperience, 10);
  const destinations = payload.experience.destinationExperience
    .split(/[,，、\s/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const experienceSummary = [
    payload.experience.completedTripCount &&
      `完成行程 ${payload.experience.completedTripCount} 次`,
    payload.experience.destinationExperience,
    payload.experience.activityTypes,
  ]
    .filter(Boolean)
    .join('；');

  return {
    bio: payload.experience.activityTypes || payload.experience.destinationExperience || undefined,
    destinations: destinations.length ? destinations : undefined,
    yearsOfExperience: Number.isFinite(years) ? years : undefined,
    experienceSummary: experienceSummary || undefined,
    applicationMaterials: payload as unknown as Record<string, unknown>,
  };
}
