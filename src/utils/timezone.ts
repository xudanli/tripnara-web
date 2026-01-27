import { DateTime } from 'luxon';

/**
 * 国家代码到时区的映射
 * 对于有多个时区的国家，使用最常用的时区
 */
const COUNTRY_TIMEZONES: Record<string, string> = {
  // 欧洲
  IS: 'Atlantic/Reykjavik',    // 冰岛 UTC+0
  GB: 'Europe/London',         // 英国 UTC+0/+1
  FR: 'Europe/Paris',          // 法国 UTC+1/+2
  DE: 'Europe/Berlin',         // 德国 UTC+1/+2
  IT: 'Europe/Rome',           // 意大利 UTC+1/+2
  ES: 'Europe/Madrid',         // 西班牙 UTC+1/+2
  PT: 'Europe/Lisbon',         // 葡萄牙 UTC+0/+1
  NL: 'Europe/Amsterdam',      // 荷兰 UTC+1/+2
  BE: 'Europe/Brussels',       // 比利时 UTC+1/+2
  CH: 'Europe/Zurich',         // 瑞士 UTC+1/+2
  AT: 'Europe/Vienna',         // 奥地利 UTC+1/+2
  GR: 'Europe/Athens',         // 希腊 UTC+2/+3
  TR: 'Europe/Istanbul',       // 土耳其 UTC+3
  NO: 'Europe/Oslo',           // 挪威 UTC+1/+2
  SE: 'Europe/Stockholm',      // 瑞典 UTC+1/+2
  DK: 'Europe/Copenhagen',     // 丹麦 UTC+1/+2
  FI: 'Europe/Helsinki',       // 芬兰 UTC+2/+3
  PL: 'Europe/Warsaw',         // 波兰 UTC+1/+2
  CZ: 'Europe/Prague',         // 捷克 UTC+1/+2
  HU: 'Europe/Budapest',       // 匈牙利 UTC+1/+2
  RO: 'Europe/Bucharest',      // 罗马尼亚 UTC+2/+3
  BG: 'Europe/Sofia',          // 保加利亚 UTC+2/+3
  HR: 'Europe/Zagreb',         // 克罗地亚 UTC+1/+2
  SI: 'Europe/Ljubljana',      // 斯洛文尼亚 UTC+1/+2
  SK: 'Europe/Bratislava',     // 斯洛伐克 UTC+1/+2
  UA: 'Europe/Kiev',           // 乌克兰 UTC+2/+3
  RU: 'Europe/Moscow',         // 俄罗斯 UTC+3
  IE: 'Europe/Dublin',         // 爱尔兰 UTC+0/+1
  
  // 亚洲
  JP: 'Asia/Tokyo',            // 日本 UTC+9
  CN: 'Asia/Shanghai',         // 中国 UTC+8
  HK: 'Asia/Hong_Kong',        // 香港 UTC+8
  TW: 'Asia/Taipei',           // 台湾 UTC+8
  KR: 'Asia/Seoul',            // 韩国 UTC+9
  SG: 'Asia/Singapore',        // 新加坡 UTC+8
  TH: 'Asia/Bangkok',          // 泰国 UTC+7
  VN: 'Asia/Ho_Chi_Minh',      // 越南 UTC+7
  MY: 'Asia/Kuala_Lumpur',     // 马来西亚 UTC+8
  ID: 'Asia/Jakarta',          // 印度尼西亚 UTC+7
  PH: 'Asia/Manila',           // 菲律宾 UTC+8
  IN: 'Asia/Kolkata',          // 印度 UTC+5:30
  AE: 'Asia/Dubai',            // 阿联酋 UTC+4
  IL: 'Asia/Jerusalem',        // 以色列 UTC+2/+3
  SA: 'Asia/Riyadh',           // 沙特阿拉伯 UTC+3
  QA: 'Asia/Qatar',            // 卡塔尔 UTC+3
  KW: 'Asia/Kuwait',           // 科威特 UTC+3
  JO: 'Asia/Amman',            // 约旦 UTC+2/+3
  LB: 'Asia/Beirut',           // 黎巴嫩 UTC+2/+3
  NP: 'Asia/Kathmandu',        // 尼泊尔 UTC+5:45
  LK: 'Asia/Colombo',          // 斯里兰卡 UTC+5:30
  BD: 'Asia/Dhaka',            // 孟加拉国 UTC+6
  MM: 'Asia/Yangon',           // 缅甸 UTC+6:30
  KH: 'Asia/Phnom_Penh',       // 柬埔寨 UTC+7
  LA: 'Asia/Vientiane',        // 老挝 UTC+7
  MN: 'Asia/Ulaanbaatar',      // 蒙古 UTC+8
  
  // 北美
  US: 'America/New_York',      // 美国（东部）
  CA: 'America/Toronto',       // 加拿大（东部）
  MX: 'America/Mexico_City',   // 墨西哥
  
  // 南美
  BR: 'America/Sao_Paulo',     // 巴西
  AR: 'America/Buenos_Aires',  // 阿根廷
  CL: 'America/Santiago',      // 智利
  PE: 'America/Lima',          // 秘鲁
  CO: 'America/Bogota',        // 哥伦比亚
  
  // 大洋洲
  AU: 'Australia/Sydney',      // 澳大利亚（东部）
  NZ: 'Pacific/Auckland',      // 新西兰
  FJ: 'Pacific/Fiji',          // 斐济
  
  // 非洲
  ZA: 'Africa/Johannesburg',   // 南非
  EG: 'Africa/Cairo',          // 埃及
  MA: 'Africa/Casablanca',     // 摩洛哥
  KE: 'Africa/Nairobi',        // 肯尼亚
  TZ: 'Africa/Dar_es_Salaam',  // 坦桑尼亚
  NG: 'Africa/Lagos',          // 尼日利亚
};

/**
 * 获取国家的时区
 * @param countryCode ISO 3166-1 alpha-2 国家代码
 * @returns IANA 时区名称
 */
export function getTimezoneByCountry(countryCode: string): string {
  const code = countryCode?.toUpperCase();
  return COUNTRY_TIMEZONES[code] || 'UTC';
}

/**
 * 将本地时间转换为 UTC ISO 字符串
 * 用于提交行程项时间时，确保时间按目的地时区正确转换
 * 
 * @param date 日期部分 (如 "2026-01-26")
 * @param time 时间部分 (如 "09:00")
 * @param timezone IANA 时区名称 (如 "Atlantic/Reykjavik")
 * @returns UTC ISO 字符串 (如 "2026-01-26T09:00:00.000Z")
 */
export function localTimeToUTC(date: string, time: string, timezone: string): string {
  const dt = DateTime.fromFormat(
    `${date} ${time}`,
    'yyyy-MM-dd HH:mm',
    { zone: timezone }
  );
  
  if (!dt.isValid) {
    console.error('[localTimeToUTC] Invalid datetime:', { date, time, timezone, reason: dt.invalidReason });
    // 回退到简单拼接
    return `${date}T${time}:00.000Z`;
  }
  
  return dt.toUTC().toISO() || `${date}T${time}:00.000Z`;
}

/**
 * 将 UTC ISO 字符串转换为本地时间
 * 用于显示行程项时间时，转换为目的地本地时间
 * 
 * @param utcString UTC ISO 字符串 (如 "2026-01-26T09:00:00.000Z")
 * @param timezone IANA 时区名称 (如 "Atlantic/Reykjavik")
 * @returns { date: "2026-01-26", time: "09:00" }
 */
export function utcToLocalTime(utcString: string, timezone: string): { date: string; time: string } {
  const dt = DateTime.fromISO(utcString, { zone: 'UTC' }).setZone(timezone);
  
  if (!dt.isValid) {
    console.error('[utcToLocalTime] Invalid datetime:', { utcString, timezone, reason: dt.invalidReason });
    // 回退到简单解析
    const parts = utcString.split('T');
    return {
      date: parts[0] || '',
      time: parts[1]?.slice(0, 5) || '',
    };
  }
  
  return {
    date: dt.toFormat('yyyy-MM-dd'),
    time: dt.toFormat('HH:mm'),
  };
}

/**
 * 将 UTC ISO 字符串转换为 datetime-local 输入框格式
 * 
 * @param utcString UTC ISO 字符串 (如 "2026-01-26T09:00:00.000Z")
 * @param timezone IANA 时区名称
 * @returns datetime-local 格式字符串 (如 "2026-01-26T09:00")
 */
export function utcToDatetimeLocal(utcString: string, timezone: string): string {
  const { date, time } = utcToLocalTime(utcString, timezone);
  return `${date}T${time}`;
}

/**
 * 将 datetime-local 格式转换为 UTC ISO 字符串
 * 
 * @param datetimeLocal datetime-local 格式字符串 (如 "2026-01-26T09:00")
 * @param timezone IANA 时区名称
 * @returns UTC ISO 字符串
 */
export function datetimeLocalToUTC(datetimeLocal: string, timezone: string): string {
  const [date, time] = datetimeLocal.split('T');
  if (!date || !time) {
    console.error('[datetimeLocalToUTC] Invalid format:', datetimeLocal);
    return datetimeLocal;
  }
  return localTimeToUTC(date, time, timezone);
}

export { DateTime };
