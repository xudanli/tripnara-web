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
  terrainConfig?: {
    riskThresholds?: RiskThresholds;
    effortLevelMapping?: EffortLevelMapping;
    terrainConstraints?: TerrainConstraints;
  };
  adaptationStrategies?: {
    highAltitude?: string;
    routeRisk?: string;
    [key: string]: any;
  };
  equipmentRecommendations?: {
    basedOnTerrain?: string;
    trainingAdvice?: string;
    [key: string]: any;
  };
  seasonalConstraints?: {
    roadAccess?: string;
    weatherImpact?: string;
    [key: string]: any;
  };
}


