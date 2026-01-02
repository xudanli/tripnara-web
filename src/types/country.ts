// ==================== 国家档案类型定义 ====================

export type PaymentType = 'CASH_HEAVY' | 'BALANCED' | 'DIGITAL';

// ==================== 国家基本信息 ====================

export interface Country {
  isoCode: string;
  nameCN: string;
  nameEN: string;
  currencyCode: string;
  currencyName: string;
  paymentType: PaymentType;
  exchangeRateToCNY?: number; // 🇨🇳 中国特定
  exchangeRateToUSD?: number; // 🌍 国际化字段
}

// ==================== 货币策略 ====================

export interface CurrencyStrategy {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  paymentType: PaymentType;
  exchangeRateToCNY?: number; // 🇨🇳 中国特定
  exchangeRateToUSD?: number; // 🌍 国际化字段
  quickRule?: string; // 🇨🇳 中国特定
  quickTip?: string; // 🇨🇳 中国特定
  quickTable?: Array<{ local: number; home: number }>; // 🇨🇳 中国特定
  paymentAdvice?: {
    tipping?: string;
    atm_network?: string;
    wallet_apps?: string[];
    cash_preparation?: string;
  };
}

// ==================== 国家 Pack 配置（地形策略） ====================

export interface RiskThresholds {
  highAltitudeM?: number;
  rapidAscentM?: number;
  steepSlopePct?: number;
  bigAscentDayM?: number;
}

export interface EffortLevelMapping {
  relaxMax?: number;
  moderateMax?: number;
  challengeMax?: number;
  extremeMin?: number;
}

export interface TerrainConstraints {
  firstDayMaxElevationM?: number;
  maxDailyAscentM?: number;
  maxConsecutiveHighAscentDays?: number;
  highAltitudeBufferHours?: number;
}

export interface CountryPack {
  countryCode: string;
  countryName: string;
  riskThresholds?: RiskThresholds;
  effortLevelMapping?: EffortLevelMapping;
  terrainConstraints?: TerrainConstraints;
}

// ==================== 支付实用信息 ====================

export interface PaymentInfo {
  countryCode: string;
  countryName: string;
  currency: {
    code: string;
    name: string;
    exchangeRateToCNY?: number;
    exchangeRateToUSD?: number;
    quickRule?: string;
    quickTip?: string;
    quickTable?: Array<{ local: number; home: number }>;
  };
  paymentMethods: {
    type: PaymentType;
    advice?: {
      tipping?: string;
      atm_network?: string;
      wallet_apps?: string[];
      cash_preparation?: string;
    };
  };
  practicalTips: {
    tipping?: string;
    atmNetworks?: string;
    walletApps?: string[];
    cashPreparation?: string;
  };
  merchantInfo?: {
    unionPaySupported?: string;
    popularMerchantTypes?: string[];
  };
}

// ==================== 地形适配建议 ====================

export interface TerrainAdvice {
  countryCode: string;
  terrainConfig: {
    riskThresholds: {
      highAltitudeM: number;          // 高海拔阈值（米）
      steepSlopePct: number;          // 陡坡阈值（百分比）
      maxDailyAscentM?: number;        // 最大日爬升（米）
      maxConsecutiveHighAltitudeDays?: number;  // 最大连续高海拔天数
      // 向后兼容：旧格式字段
      rapidAscentM?: number;          // 快速上升阈值（旧格式）
      bigAscentDayM?: number;         // 大爬升日阈值（旧格式）
    };
    effortLevelMapping: {
      easy: { maxAscentM: number; maxSlopePct: number };
      moderate: { maxAscentM: number; maxSlopePct: number };
      hard: { maxAscentM: number; maxSlopePct: number };
      extreme: { maxAscentM: number; maxSlopePct: number };
      // 向后兼容：旧格式字段
      relaxMax?: number;             // 轻松等级最大值（旧格式）
      moderateMax?: number;           // 中等等级最大值（旧格式）
      challengeMax?: number;          // 挑战等级最大值（旧格式）
      extremeMin?: number;            // 极限等级最小值（旧格式）
    };
    terrainConstraints: {
      maxElevationM?: number;
      minElevationM?: number;
      allowedSlopeRange?: { min: number; max: number };
      // 向后兼容：旧格式字段
      firstDayMaxElevationM?: number;  // 第一天高海拔限制（旧格式）
      maxConsecutiveHighAscentDays?: number;  // 连续高爬升天数限制（旧格式）
      highAltitudeBufferHours?: number;  // 高海拔日缓冲时间（旧格式）
    };
  };
  adaptationStrategies: {
    highAltitude: string;              // 高海拔适应策略说明
    routeRisk: string;                 // 路线风险说明
  };
  equipmentRecommendations: {
    basedOnTerrain: string;
    trainingAdvice: string;
  };
  seasonalConstraints: {
    roadAccess: string;
    weatherImpact: string;
  };
}


