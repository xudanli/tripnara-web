export interface ExploreDayMarkerOptions {
  day: number;
  theme: string;
  experience: string;
  route?: string;
  stay?: string;
  highlight?: boolean;
  selected?: boolean;
}

function resolveExploreDayMarkerLabels(opts: ExploreDayMarkerOptions): { en?: string; zh: string } {
  const stay = opts.stay?.trim();
  const theme = opts.theme?.trim() || '';
  const routeTail = opts.route?.split('→').pop()?.trim();

  const zh =
    stay && /[\u4e00-\u9fff]/.test(stay)
      ? stay
      : theme || stay || `Day ${opts.day}`;

  let en: string | undefined;
  if (routeTail && /[A-Za-z]/.test(routeTail)) en = routeTail;
  else if (stay && /[A-Za-z]/.test(stay) && !/[\u4e00-\u9fff]/.test(stay)) en = stay;

  if (en === zh) en = undefined;
  return { en, zh };
}

/** 探索路线详情 · Day 地图标记（D{n} 圆点 + 双语地名） */
export function createExploreDayMarkerElement(opts: ExploreDayMarkerOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = 'explore-day-map-marker';
  if (opts.selected) root.classList.add('explore-day-map-marker--selected');
  if (opts.highlight) root.classList.add('explore-day-map-marker--highlight');

  const pin = document.createElement('div');
  pin.className = 'explore-day-map-marker__pin';

  const badge = document.createElement('span');
  badge.className = 'explore-day-map-marker__badge';
  badge.textContent = `D${opts.day}`;
  pin.appendChild(badge);

  const labels = document.createElement('div');
  labels.className = 'explore-day-map-marker__labels';

  const { en, zh } = resolveExploreDayMarkerLabels(opts);
  if (en) {
    const enEl = document.createElement('div');
    enEl.className = 'explore-day-map-marker__label-en';
    enEl.textContent = en;
    labels.appendChild(enEl);
  }

  const zhEl = document.createElement('div');
  zhEl.className = 'explore-day-map-marker__label-zh';
  zhEl.textContent = zh;
  labels.appendChild(zhEl);

  root.title = `${opts.theme} · ${opts.experience}`;
  root.appendChild(pin);
  root.appendChild(labels);

  return root;
}
