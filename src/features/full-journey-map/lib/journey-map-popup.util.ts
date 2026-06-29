import type { JourneyActivity, JourneyMember } from '../types';
import type { JourneyMarkerVisual } from './journey-map-marker-icons';
import { safeHttpImageUrl } from './journey-map-place.util';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

function formatDuration(activity: JourneyActivity): string {
  if (!activity.startTime) return '';
  const end = activity.endTime ? ` – ${activity.endTime}` : '';
  let suffix = '';
  if (activity.durationHours != null) {
    const whole = Math.floor(activity.durationHours);
    const mins = Math.round((activity.durationHours - whole) * 60);
    suffix = mins > 0 ? ` (${whole}h ${mins}m)` : ` (${whole}h)`;
  }
  return `${activity.startTime}${end}${suffix}`;
}

const META_CLOCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
const META_PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

function intensityDots(score: number): string {
  const clamped = Math.max(0, Math.min(5, Math.round(score)));
  return Array.from({ length: 5 }, (_, i) => {
    const filled = i < clamped;
    return `<span class="journey-map-popup-intensity-dot${filled ? ' is-filled' : ''}"></span>`;
  }).join('');
}

function participantAvatarsHtml(activity: JourneyActivity, members: JourneyMember[]): string {
  if (activity.participantIds.length === 0) return '';

  const resolved = activity.participantIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is JourneyMember => Boolean(m));

  const shown = resolved.slice(0, 4);
  const extra = activity.participantIds.length - shown.length;

  const avatars = shown
    .map(
      (m) =>
        `<span class="journey-map-popup-avatar" style="background:${m.avatarColor ?? '#64748b'}" title="${escapeHtml(m.name)}">${escapeHtml(m.initials.slice(0, 2))}</span>`,
    )
    .join('');

  const overflow =
    extra > 0
      ? `<span class="journey-map-popup-avatar journey-map-popup-avatar-more">+${extra}</span>`
      : '';

  return `<div class="journey-map-popup-participants">${avatars}${overflow}</div>`;
}

function resolveAddress(activity: JourneyActivity): string | undefined {
  return activity.address?.trim() || activity.location?.trim() || undefined;
}

function resolveDetail(activity: JourneyActivity): string | undefined {
  const raw = activity.placeDetail?.trim() || activity.summary?.trim() || undefined;
  if (!raw) return undefined;
  if (/^\[timelineDisplayRole:/i.test(raw)) return undefined;
  return raw;
}

function hasActivityStats(activity: JourneyActivity): boolean {
  return Boolean(
    activity.intensityScore ||
    activity.elevationRange ||
    activity.distanceKm != null ||
    activity.ageRange,
  );
}

/** 仅标题、无任何 POI 字段 → 紧凑卡片 */
export function shouldUseCompactPopup(activity: JourneyActivity): boolean {
  return (
    !activity.startTime &&
    !resolveAddress(activity) &&
    !safeHttpImageUrl(activity.imageUrl) &&
    !resolveDetail(activity) &&
    !hasActivityStats(activity) &&
    activity.intensity !== 'high' &&
    activity.participantIds.length === 0
  );
}

/** @deprecated 使用 shouldUseCompactPopup */
export function isRichActivityPopup(activity: JourneyActivity): boolean {
  return !shouldUseCompactPopup(activity);
}

function coverImageHtml(activity: JourneyActivity): string {
  const url = safeHttpImageUrl(activity.imageUrl);
  if (!url) return '';
  return `<div class="journey-map-popup-cover"><img src="${escapeAttr(url)}" alt="" loading="lazy" decoding="async" /></div>`;
}

function metaRow(iconSvg: string, text: string): string {
  return `<p class="journey-map-popup-meta"><span class="journey-map-popup-meta-icon" aria-hidden="true">${iconSvg}</span><span>${escapeHtml(text)}</span></p>`;
}

function detailBlock(activity: JourneyActivity): string {
  const detail = resolveDetail(activity);
  if (!detail) return '';
  return `<p class="journey-map-popup-detail">${escapeHtml(detail)}</p>`;
}

function activityStatsBlock(activity: JourneyActivity): string {
  if (!hasActivityStats(activity) && activity.intensity !== 'high') return '';

  const intensityTag =
    activity.intensity === 'high'
      ? '<span class="journey-map-popup-tag">高强度</span>'
      : '';

  const intensityRow =
    activity.intensityScore != null
      ? `<div class="journey-map-popup-stat"><span class="journey-map-popup-stat-label">强度</span><span class="journey-map-popup-intensity">${intensityDots(activity.intensityScore)}</span></div>`
      : '';

  const elevationRow =
    activity.elevationRange || activity.distanceKm != null
      ? `<div class="journey-map-popup-stat"><span class="journey-map-popup-stat-label">海拔 / 距离</span><span class="journey-map-popup-stat-value">${escapeHtml(activity.elevationRange ?? '')}${activity.elevationRange && activity.distanceKm != null ? ' / ' : ''}${activity.distanceKm != null ? `${activity.distanceKm} km` : ''}</span></div>`
      : '';

  const ageRow = activity.ageRange
    ? `<div class="journey-map-popup-stat"><span class="journey-map-popup-stat-label">适合人群</span><span class="journey-map-popup-stat-value">${escapeHtml(activity.ageRange)}</span></div>`
    : '';

  if (!intensityRow && !elevationRow && !ageRow && !intensityTag) return '';

  return `
    <div class="journey-map-popup-stats-wrap">
      ${intensityTag ? `<div class="journey-map-popup-tags">${intensityTag}</div>` : ''}
      ${intensityRow || elevationRow || ageRow ? `<div class="journey-map-popup-stats">${intensityRow}${elevationRow}${ageRow}</div>` : ''}
    </div>
  `;
}

export function buildJourneyMapPopupHtml(
  activity: JourneyActivity,
  _visual: JourneyMarkerVisual,
  members: JourneyMember[],
): string {
  const title = escapeHtml(activity.title);
  const cover = coverImageHtml(activity);

  if (shouldUseCompactPopup(activity)) {
    return `
      <div class="journey-map-popup-body journey-map-popup-body--compact">
        <p class="journey-map-popup-title">${title}</p>
        <button type="button" data-action="details" class="journey-map-popup-cta journey-map-popup-cta--primary">
          查看详情
        </button>
      </div>
    `;
  }

  const timeText = activity.startTime ? formatDuration(activity) : '';
  const addressText = resolveAddress(activity);
  const timeRow = timeText ? metaRow(META_CLOCK_SVG, timeText) : '';
  const addressRow = addressText ? metaRow(META_PIN_SVG, addressText) : '';
  const detail = detailBlock(activity);
  const stats = activityStatsBlock(activity);
  const participants = participantAvatarsHtml(activity, members);
  const ctaClass = stats || participants ? 'journey-map-popup-cta--secondary' : 'journey-map-popup-cta--primary';
  const ctaWrapClass =
    ctaClass === 'journey-map-popup-cta--secondary'
      ? 'journey-map-popup-footer'
      : 'journey-map-popup-footer journey-map-popup-footer--stacked';

  return `
    <div class="journey-map-popup-body journey-map-popup-body--poi${cover ? ' journey-map-popup-body--with-cover' : ''}">
      ${cover}
      <div class="journey-map-popup-inner">
        <div class="journey-map-popup-heading">
          <p class="journey-map-popup-title">${title}</p>
          ${timeRow}
          ${addressRow}
        </div>
        ${detail}
        ${stats}
        ${participants}
        <div class="${ctaWrapClass}">
          <button type="button" data-action="details" class="journey-map-popup-cta ${ctaClass}">
            查看详情
          </button>
        </div>
      </div>
    </div>
  `;
}
