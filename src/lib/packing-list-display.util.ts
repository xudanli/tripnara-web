/** 打包清单 C 端展示：分类 / 优先级 / 单位 / 物品名中文优先 */

export type PackingListLang = 'zh' | 'en';

export type PackingListItemLike = {
  name: string;
  nameCN?: string;
  nameZh?: string;
  name_zh?: string;
  labelZh?: string;
  titleZh?: string;
  category: string;
  categoryZh?: string;
  category_zh?: string;
  priority: 'must' | 'should' | 'optional' | string;
  unit?: string;
  reason?: string;
  reasonZh?: string;
  reason_zh?: string;
};

const CATEGORY_ZH: Record<string, string> = {
  clothing: '衣物',
  electronics: '电子设备',
  toiletries: '洗漱用品',
  documents: '证件文件',
  food: '食品',
  safety: '安全装备',
  gear: '装备',
  medication: '药品',
  medicine: '药品',
  accessories: '配件',
  navigation: '导航',
  shelter: '庇护',
  essential: '必需品',
  other: '其他',
};

const PRIORITY_ZH: Record<string, string> = {
  must: '必需',
  should: '建议',
  optional: '可选',
};

const UNIT_ZH: Record<string, string> = {
  piece: '件',
  pieces: '件',
  pcs: '件',
  pair: '双',
  pairs: '双',
  set: '套',
  sets: '套',
  bottle: '瓶',
  bottles: '瓶',
  pack: '包',
  packs: '包',
  box: '盒',
  boxes: '盒',
};

/** 常见英文物品名 → 中文（后端未返回 nameCN 时的兜底） */
const ITEM_NAME_ZH: Record<string, string> = {
  passport: '护照',
  'travel insurance': '旅行保险',
  'driver license': '驾驶证',
  'driving license': '驾驶证',
  'credit card': '信用卡',
  'cash / card': '现金 / 银行卡',
  'power adapter': '电源转换插头',
  'power bank': '移动电源',
  'phone charger': '手机充电器',
  'phone cable': '手机数据线',
  'waterproof jacket': '防水外套',
  'rain jacket': '雨衣',
  'thermal underwear': '保暖内衣',
  'wool sweater': '羊毛毛衣',
  'hiking boots': '徒步靴',
  'warm hat': '保暖帽',
  'wool socks': '羊毛袜',
  'gloves': '手套',
  'sunglasses': '太阳镜',
  'swimsuit': '泳衣',
  'toothbrush': '牙刷',
  'toothpaste': '牙膏',
  'shampoo': '洗发水',
  'sunscreen': '防晒霜',
  'first aid kit': '急救包',
  'reusable water bottle': '可重复使用的水瓶',
  'snacks': '零食',
  'camera': '相机',
  'tripod': '三脚架',
  'headlamp': '头灯',
  'flashlight': '手电筒',
  'emergency blanket': '应急毯',
  'towel': '毛巾',
  'umbrella': '雨伞',
  'backpack': '背包',
  'daypack': '日间背包',
  'sleeping bag': '睡袋',
  'insect repellent': '驱虫剂',
  'lip balm': '润唇膏',
  'moisturizer': '保湿霜',
  'visa': '签证',
  'flight tickets': '机票',
  'hotel confirmation': '酒店确认单',
  'rental car confirmation': '租车确认单',
  'icelandic wool sweater': '冰岛羊毛衫',
  'windproof pants': '防风裤',
  'base layer': '打底层',
  'mid layer': '中间层',
  'outer layer': '外层',
  'windbreaker': '防风外套',
  'fleece jacket': '抓绒外套',
  'hiking pants': '徒步裤',
  'warm layers': '保暖层',
  'waterproof hiking boots': '防水徒步靴',
  'neck gaiter': '脖套',
  'balaclava': '头套面罩',
  'microspikes': '冰爪',
  'rental car documents': '租车文件',
  'international driving permit': '国际驾照',
  'euro adapter': '欧标转换插头',
  'icelandic krona': '冰岛克朗',
  'mobile phone': '手机',
  'sim card': 'SIM 卡',
  'portable wifi': '便携 WiFi',
  'travel pillow': '旅行枕',
  'eye mask': '眼罩',
  'ear plugs': '耳塞',
  'hand sanitizer': '免洗洗手液',
  'wet wipes': '湿巾',
  'tissues': '纸巾',
  'protein bars': '蛋白棒',
  'instant noodles': '方便面',
  'thermos': '保温杯',
  'binoculars': '望远镜',
  'action camera': '运动相机',
  'memory cards': '存储卡',
  'portable charger': '便携充电器',
  'car phone mount': '车载手机支架',
  'ice scraper': '除冰铲',
  'reflective vest': '反光背心',
  'warning triangle': '三角警示牌',
  'jump starter': '应急启动电源',
  'tire repair kit': '补胎工具',
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isPackingListZhLang(language?: string): boolean {
  return (language || 'en').startsWith('zh');
}

export function packingListCategoryLabel(category: string, lang: PackingListLang): string {
  if (lang !== 'zh') return category;
  const key = normalizeKey(category);
  return CATEGORY_ZH[key] ?? category;
}

export function packingListCategoryLabelFromItem(
  item: Pick<PackingListItemLike, 'category' | 'categoryZh' | 'category_zh'>,
  lang: PackingListLang,
): string {
  if (lang === 'zh') {
    const zh = item.categoryZh?.trim() || item.category_zh?.trim();
    if (zh) return zh;
  }
  return packingListCategoryLabel(item.category, lang);
}

export function packingListPriorityLabel(priority: string, lang: PackingListLang): string {
  if (lang !== 'zh') return priority;
  return PRIORITY_ZH[normalizeKey(priority)] ?? priority;
}

export function packingListUnitLabel(unit: string | undefined, lang: PackingListLang): string | undefined {
  if (!unit?.trim()) return unit;
  if (lang !== 'zh') return unit;
  const key = normalizeKey(unit);
  return UNIT_ZH[key] ?? unit;
}

export function packingListItemName(item: PackingListItemLike, lang: PackingListLang): string {
  if (lang === 'zh') {
    const zh =
      item.nameCN?.trim() ||
      item.nameZh?.trim() ||
      item.name_zh?.trim() ||
      item.labelZh?.trim() ||
      item.titleZh?.trim();
    if (zh) return zh;
    const mapped = ITEM_NAME_ZH[normalizeKey(item.name)];
    if (mapped) return mapped;
  }
  return item.name;
}

export function packingListItemReason(item: PackingListItemLike, lang: PackingListLang): string | undefined {
  const reason = item.reason?.trim();
  if (!reason) return undefined;
  if (lang === 'zh') {
    const zh = item.reasonZh?.trim() || item.reason_zh?.trim();
    if (zh) return zh;
  }
  return reason;
}

export function packingListStepTitle(
  step: { title?: string; titleZh?: string; title_zh?: string },
  lang: PackingListLang,
): string {
  if (lang === 'zh') {
    const zh = step.titleZh?.trim() || step.title_zh?.trim();
    if (zh) return zh;
  }
  return step.title?.trim() || '';
}

export function packingListStepDescription(
  step: { description?: string; descriptionZh?: string; description_zh?: string },
  lang: PackingListLang,
): string {
  if (lang === 'zh') {
    const zh = step.descriptionZh?.trim() || step.description_zh?.trim();
    if (zh) return zh;
  }
  return step.description?.trim() || '';
}

export function packingListChecklistTitle(
  item: { title?: string; titleZh?: string; title_zh?: string },
  lang: PackingListLang,
): string {
  if (lang === 'zh') {
    const zh = item.titleZh?.trim() || item.title_zh?.trim();
    if (zh) return zh;
  }
  return item.title?.trim() || '';
}

/** 纯文本物品名（如打包顺序步骤里的 items 列表） */
export function packingListKnownName(text: string, lang: PackingListLang): string {
  const trimmed = text?.trim();
  if (!trimmed) return text;
  if (lang !== 'zh') return trimmed;
  return ITEM_NAME_ZH[normalizeKey(trimmed)] ?? trimmed;
}
