import type { PoiType } from '@/api/readiness';
import type { JourneyActivity, JourneyLayerKind, JourneyMarkerIcon } from '../types';

/** 地图标记 icon 类型（对齐高保真 · 彩色圆底 + 白色 pictogram） */
export type { JourneyMarkerIcon } from '../types';

export interface JourneyMarkerVisual {
  icon: JourneyMarkerIcon;
  bg: string;
  size: number;
  label?: string;
}

const ICON_SIZE = 18;

/** coverage POI 类型 → icon + 背景色（全程地图标记） */
export const POI_TYPE_MARKER_VISUAL: Record<
  PoiType,
  { icon: JourneyMarkerIcon; bg: string; size: number; label: string }
> = {
  city: { icon: 'city', bg: '#475569', size: 36, label: '城市' },
  attraction: { icon: 'sightseeing', bg: '#0d9488', size: 38, label: '景点' },
  hotel: { icon: 'accommodation', bg: '#475569', size: 34, label: '住宿' },
  restaurant: { icon: 'dining', bg: '#ea580c', size: 34, label: '餐饮' },
  transport: { icon: 'transport', bg: '#0284c7', size: 32, label: '交通' },
  other: { icon: 'default', bg: '#64748b', size: 32, label: '其他' },
};

const POI_TYPES = new Set<PoiType>([
  'city',
  'attraction',
  'hotel',
  'restaurant',
  'transport',
  'other',
]);

export function normalizePoiType(type?: string | null): PoiType {
  const key = type?.trim().toLowerCase() as PoiType;
  return POI_TYPES.has(key) ? key : 'other';
}

export function resolvePoiTypeMarkerVisual(
  poiType?: PoiType | string | null,
): (typeof POI_TYPE_MARKER_VISUAL)[PoiType] {
  return POI_TYPE_MARKER_VISUAL[normalizePoiType(poiType)];
}

/** 活动 / 分流等扩展标记（非 coverage POI 类型） */
const MARKER_PALETTE: Record<JourneyMarkerIcon, { bg: string; size: number }> = {
  hiking: { bg: '#0f766e', size: 40 },
  dining: { bg: '#ea580c', size: 34 },
  coffee: { bg: '#f97316', size: 36 },
  accommodation: { bg: '#475569', size: 34 },
  camera: { bg: '#16a34a', size: 34 },
  parking: { bg: '#78716c', size: 30 },
  sightseeing: { bg: '#0d9488', size: 38 },
  waterfall: { bg: '#0ea5e9', size: 36 },
  transport: { bg: '#0284c7', size: 32 },
  meeting: { bg: '#0f766e', size: 32 },
  city: { bg: '#475569', size: 36 },
  warning: { bg: '#dc2626', size: 30 },
  default: { bg: '#64748b', size: 32 },
};

const KIND_FALLBACK: Record<JourneyLayerKind, JourneyMarkerIcon> = {
  activity: 'hiking',
  diversion: 'coffee',
  accommodation: 'accommodation',
  transport: 'transport',
  meeting: 'meeting',
  risk: 'warning',
};

function svgWrap(paths: string, opts?: { fill?: string }): string {
  const fill = opts?.fill ?? 'none';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="${fill}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

/** Lucide 风格白色线性 icon */
export function markerIconSvg(icon: JourneyMarkerIcon): string {
  switch (icon) {
    case 'hiking':
      return svgWrap(
        '<circle cx="12" cy="5.5" r="2.5"/><path d="m9 20-1-5 2-2.5V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3.5l2 2.5-1 5"/>',
      );
    case 'dining':
      return svgWrap(
        '<path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5Z"/>',
      );
    case 'coffee':
      return svgWrap(
        '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a4 4 0 0 1-8 0V6h8v2Z"/><path d="M6 8v6a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4V8"/>',
      );
    case 'accommodation':
      return svgWrap(
        '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
      );
    case 'camera':
      return svgWrap(
        '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>',
      );
    case 'parking':
      return svgWrap(
        '<text x="12" y="17" text-anchor="middle" fill="white" stroke="none" font-size="14" font-weight="700" font-family="system-ui,sans-serif">P</text>',
        { fill: 'white' },
      );
    case 'sightseeing':
      return svgWrap(
        '<path d="m8 3 4 8 5-5 5 15H2L8 3Z"/>',
      );
    case 'waterfall':
      return svgWrap(
        '<path d="M4 22h16"/><path d="M6 18V8"/><path d="M10 18V4"/><path d="M14 18v-6"/><path d="M18 18V10"/>',
      );
    case 'transport':
      return svgWrap(
        '<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2L19 8H5L3.4 12.8c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>',
      );
    case 'meeting':
      return svgWrap(
        '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
      );
    case 'city':
      return svgWrap(
        '<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
      );
    case 'warning':
      return svgWrap(
        '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
      );
    default:
      return svgWrap('<circle cx="12" cy="12" r="4"/>');
  }
}

export function inferMarkerIcon(activity: Pick<JourneyActivity, 'kind' | 'title' | 'markerIcon'>): JourneyMarkerIcon {
  if (activity.markerIcon && activity.markerIcon in MARKER_PALETTE) {
    return activity.markerIcon;
  }
  const title = activity.title.toLowerCase();
  if (activity.kind === 'diversion' || title.includes('咖啡')) return 'coffee';
  if (title.includes('停车') || title.includes('parking')) return 'parking';
  if (title.includes('瀑布')) return 'waterfall';
  if (title.includes('冰河') || title.includes('摄影') || title.includes('photo')) return 'camera';
  if (title.includes('晚餐') || title.includes('餐')) return 'dining';
  if (title.includes('汇合')) return 'meeting';
  return KIND_FALLBACK[activity.kind] ?? 'default';
}

export function resolveMarkerLabel(activity: JourneyActivity): string | undefined {
  if (activity.markerLabel?.trim()) return activity.markerLabel.trim();
  if (activity.diversionLabel?.trim()) {
    return activity.diversionLabel
      .replace(/^Group\s+[AB]:\s*/i, (m) => `${m.includes('A') ? 'A' : 'B'}组·`)
      .replace('Group A:', 'A组·')
      .replace('Group B:', 'B组·');
  }
  if (activity.kind === 'meeting' && activity.startTime) {
    return `${activity.startTime} 汇合${activity.title ? `: ${activity.title}` : ''}`;
  }
  return undefined;
}

export function resolveMarkerVisual(activity: JourneyActivity): JourneyMarkerVisual {
  if (activity.kind === 'diversion') {
    const palette = MARKER_PALETTE.coffee;
    return {
      icon: 'coffee',
      bg: palette.bg,
      size: palette.size,
      label: resolveMarkerLabel(activity),
    };
  }

  if (activity.poiType) {
    const poiVisual = resolvePoiTypeMarkerVisual(activity.poiType);
    return {
      icon: poiVisual.icon,
      bg: poiVisual.bg,
      size: poiVisual.size,
      label: resolveMarkerLabel(activity),
    };
  }

  const icon = inferMarkerIcon(activity);
  const palette = MARKER_PALETTE[icon] ?? MARKER_PALETTE.default;
  return {
    icon,
    bg: palette.bg,
    size: palette.size,
    label: resolveMarkerLabel(activity),
  };
}

export function createMarkerIconElement(
  visual: JourneyMarkerVisual,
  opts: { selected: boolean; dimmed: boolean; asButton?: boolean },
): HTMLElement {
  const el = document.createElement(opts.asButton === false ? 'div' : 'button');
  if (el instanceof HTMLButtonElement) el.type = 'button';
  el.className =
    'flex shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const size = opts.selected ? visual.size + 4 : visual.size;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.backgroundColor = visual.bg;
  if (opts.selected) {
    el.style.transform = 'scale(1.08)';
    el.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.95), 0 4px 14px rgba(15,23,42,0.18)';
    el.style.zIndex = '10';
  }
  if (opts.dimmed) {
    el.style.opacity = '0.35';
    el.style.filter = 'grayscale(1)';
  }
  el.innerHTML = markerIconSvg(visual.icon);
  return el;
}

export function createMapMarkerElement(
  activity: JourneyActivity,
  opts: { selected: boolean; dimmed: boolean; onClick: () => void },
): HTMLElement {
  const visual = resolveMarkerVisual(activity);
  const size = opts.selected ? visual.size + 4 : visual.size;

  const root = document.createElement('button');
  root.type = 'button';
  root.className =
    'relative inline-flex shrink-0 items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  root.style.width = `${size}px`;
  root.style.height = `${size}px`;
  root.title = activity.title;
  root.setAttribute('aria-label', activity.title);

  const iconBtn = createMarkerIconElement(visual, {
    selected: opts.selected,
    dimmed: opts.dimmed,
    asButton: false,
  });
  iconBtn.className += ' absolute inset-0';
  root.appendChild(iconBtn);

  if (visual.label) {
    const pill = document.createElement('span');
    pill.className =
      'pointer-events-none absolute left-full top-1/2 z-10 ml-1 max-w-[148px] -translate-y-1/2 truncate rounded-md px-2 py-0.5 text-[10px] font-medium leading-tight text-white shadow-sm';
    pill.style.backgroundColor = visual.bg;
    pill.style.opacity = opts.dimmed ? '0.45' : '0.92';
    pill.textContent = visual.label;
    root.appendChild(pill);
  }

  root.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onClick();
  });

  return root;
}

export function createRiskMarkerElement(
  risk: { title: string },
  opts: { onClick: () => void },
): HTMLElement {
  const visual: JourneyMarkerVisual = {
    icon: 'warning',
    bg: MARKER_PALETTE.warning.bg,
    size: MARKER_PALETTE.warning.size,
  };
  const root = document.createElement('button');
  root.type = 'button';
  root.className =
    'flex items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  root.title = risk.title;
  root.setAttribute('aria-label', risk.title);
  const icon = createMarkerIconElement(visual, { selected: false, dimmed: false });
  root.appendChild(icon);
  root.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onClick();
  });
  return root;
}
