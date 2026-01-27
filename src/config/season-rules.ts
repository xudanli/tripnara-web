/**
 * 季节规则配置
 * 用于根据行程日期和目的地推断季节
 */

export type Season = 'summer' | 'transition' | 'winter';

export interface SeasonRule {
  countryCode: string;
  rules: {
    summer: number[];      // 夏季月份（1-12）
    transition: number[];   // 过渡季月份
    winter: number[];       // 冬季月份
  };
}

/**
 * 季节规则配置表
 * 按国家维护不同的季节划分规则
 */
export const SEASON_RULES: Record<string, SeasonRule> = {
  // 冰岛季节规则
  IS: {
    countryCode: 'IS',
    rules: {
      summer: [6, 7, 8],           // 6-8月：夏季
      transition: [4, 5, 9, 10],   // 4-5月、9-10月：过渡季
      winter: [11, 12, 1, 2, 3],   // 11-3月：冬季
    },
  },
  // 后续可以添加其他国家的规则
  // US: {
  //   countryCode: 'US',
  //   rules: {
  //     summer: [6, 7, 8],
  //     transition: [4, 5, 9, 10],
  //     winter: [11, 12, 1, 2, 3],
  //   },
  // },
};

/**
 * 根据月份和目的地推断季节
 * @param month 月份（1-12）
 * @param countryCode 国家代码（如 'IS'）
 * @returns 季节枚举值
 */
export const inferSeasonFromMonth = (month: number, countryCode: string = 'IS'): Season => {
  const rule = SEASON_RULES[countryCode] || SEASON_RULES['IS']; // 默认使用冰岛规则
  
  if (rule.rules.summer.includes(month)) {
    return 'summer';
  }
  if (rule.rules.winter.includes(month)) {
    return 'winter';
  }
  // 默认返回过渡季
  return 'transition';
};
