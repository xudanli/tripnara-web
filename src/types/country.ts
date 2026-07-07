// ==================== 国家档案类型定义 ====================

// 支付类型：根据文档，支持 'CASH_DOMINANT' | 'BALANCED' | 'DIGITAL_DOMINANT'
// 为了向后兼容，也支持旧格式 'CASH_HEAVY' | 'DIGITAL'
export type PaymentType = 
  | 'CASH_DOMINANT'  // 现金为主（新格式）
  | 'CASH_HEAVY'     // 现金为主（旧格式，向后兼容）
  | 'BALANCED'       // 混合支付
  | 'DIGITAL_DOMINANT' // 数字化支付为主（新格式）
  | 'DIGITAL';       // 数字化支付（旧格式，向后兼容）

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
  /** 目的地默认封面（档案 API / BFF 可选返回） */
  coverImageUrl?: string | null;
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

// ==================== 国家完整档案 ====================

/**
 * 电源信息
 */
export interface PowerInfo {
  voltage: number;              // 电压
  frequency: number;            // 频率
  plugTypes: string[];          // 插座类型数组，如 ["A", "B"]
  note?: string;                // 备注
}

/**
 * 紧急信息
 */
export interface EmergencyInfo {
  police?: string;              // 警察电话
  fire?: string;                // 火警电话
  medical?: string;             // 医疗电话
  ambulance?: string;           // 救护车电话
  note?: string;                // 备注
  embassy?: string;             // 大使馆联系方式
}

/**
 * 中国公民签证信息
 */
export interface VisaInfo {
  required?: boolean;           // 是否需要签证
  type?: string;                // 签证类型
  duration?: string;            // 停留期限
  requirements?: string;         // 申请要求
  notes?: string;               // 备注
}

/**
 * 合规信息
 */
export interface ComplianceInfo {
  visaPolicy?: string;          // 签证政策
  drivingRules?: string;        // 驾驶规则
  droneRules?: string;          // 无人机规则
  alcoholPolicy?: string;       // 酒精政策
  travelWarnings?: string;      // 旅行警告
  customs?: string;             // 海关规定
}

/**
 * 旅行文化
 */
export interface TravelCulture {
  tipping?: string;             // 小费文化
  taboos?: string[];            // 禁忌列表
  dressCode?: string;           // 着装提示
  festivals?: string;           // 节庆日历
  etiquette?: string;           // 礼仪提示
  customs?: string;             // 风俗习惯
}

/**
 * 国家完整档案
 * 包含所有字段，包括基础字段、货币支付字段和JSON字段
 */
export interface CountryProfile {
  // 基础字段
  isoCode: string;
  nameCN: string;
  nameEN: string;
  updatedAt: string;            // ISO 8601 格式的时间字符串

  // 货币和支付字段
  currencyCode: string;
  currencyName: string;
  exchangeRateToCNY?: number;
  exchangeRateToUSD?: number;
  paymentType: PaymentType;
  /** 目的地默认封面（列表 POI 图为空时使用） */
  coverImageUrl?: string | null;
  paymentInfo?: {
    tipping?: string;
    atm_network?: string;
    wallet_apps?: string[];
    notes?: string;
    [key: string]: any;         // 允许其他字段
  };

  // JSON字段（可能为 null）
  powerInfo?: PowerInfo | null;
  emergency?: EmergencyInfo | null;
  visaForCN?: VisaInfo | null;
  complianceInfo?: ComplianceInfo | null;
  travelCulture?: TravelCulture | null;
}


