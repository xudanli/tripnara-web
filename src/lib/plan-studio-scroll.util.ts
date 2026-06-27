export const PLAN_STUDIO_RELAXATION_BAR_ID = 'plan-studio-relaxation-bar';

export function scrollToPlanStudioRelaxationBar(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(PLAN_STUDIO_RELAXATION_BAR_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
}
