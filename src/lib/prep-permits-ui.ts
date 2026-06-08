import type { PrepPermit } from '@/types/trail';
import { prepPermitLabel } from '@/lib/prep-display';

/** 所有「必需」许可均已勾选 obtained */
export function clientPermitsComplete(permits: PrepPermit[]): boolean {
  if (!permits.length) return true;
  const required = permits.filter((p) => p.required);
  if (!required.length) return permits.every((p) => p.obtained);
  return required.every((p) => p.obtained);
}

/** 避免后端重复 id 导致点一项 React 复用错乱 */
export function ensureUniquePermitIds(permits: PrepPermit[]): PrepPermit[] {
  const seen = new Set<string>();
  return permits.map((p, index) => {
    let id = p.id || `permit-${index}`;
    if (seen.has(id)) id = `${id}-${index}`;
    seen.add(id);
    return id === p.id ? p : { ...p, id };
  });
}

/** 后端只给了空 name /「许可」、无预约链接等，属于模板未配全 */
export function permitsLookLikePlaceholders(permits: PrepPermit[]): boolean {
  if (!permits.length) return false;
  return permits.every((p) => {
    const label = prepPermitLabel(p);
    return (!label || label === '许可') && !p.bookingUrl && !p.deadline && p.cost == null;
  });
}

export function prepPermitDisplayLabel(permit: PrepPermit, index: number): string {
  const base = prepPermitLabel(permit);
  if (base && base !== '许可') return base;
  if (permit.bookingUrl) {
    try {
      return `许可 · ${new URL(permit.bookingUrl).hostname}`;
    } catch {
      /* ignore */
    }
  }
  return base ? `${base} ${index + 1}` : `许可 ${index + 1}`;
}
