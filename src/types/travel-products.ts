/**
 * Travel Products Catalog（体验产品库）— C 端读模型
 * Base: /api/travel-products（@Public）
 */

export interface TravelProductTaxonomyCategory {
  code: string;
  productType: string;
  displayNameZh?: string;
  displayNameEn?: string;
  version?: number;
}

export interface TravelProductTaxonomySubtype {
  code: string;
  categoryCode: string;
  productType: string;
  displayNameZh?: string;
  displayNameEn?: string;
  phasePriority?: string;
  countryCodes?: string[];
}

export interface TravelProductTaxonomy {
  schemaId: string;
  productTypes: string[];
  categories: TravelProductTaxonomyCategory[];
  subtypes: TravelProductTaxonomySubtype[];
}

export interface TravelProductExperienceDefinition {
  id: string;
  code?: string;
  productType?: string;
  categoryCode?: string;
  subtypeCode?: string;
  displayNameZh?: string | null;
  displayNameEn?: string | null;
  typicalDurationMin?: number | null;
  fitnessLevel?: string | null;
  riskLevel?: string | null;
  weatherDependency?: string | null;
  equipmentTypical?: string[];
  countryCodes?: string[];
}

export interface TravelProductOperator {
  id: string;
  brandName?: string | null;
  trustLevel?: string | null;
  website?: string | null;
  countryCode?: string | null;
}

export interface TravelProductPlaceRef {
  id: number;
  nameEN?: string | null;
  nameCN?: string | null;
  category?: string | null;
}

export interface TravelProductPlaceLink {
  id?: string;
  offeringId?: string;
  placeId: number;
  role: string;
  sortOrder?: number;
  label?: string | null;
  place?: TravelProductPlaceRef | null;
}

export interface TravelProductOffering {
  id: string;
  experienceDefinitionId: string;
  operatorId?: string;
  nameEN?: string | null;
  nameCN?: string | null;
  description?: string | null;
  productType?: string;
  categoryCode?: string;
  subtypeCode?: string;
  defaultDurationMin?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  fitnessRequirement?: string | null;
  equipmentRequired?: string[];
  status?: string;
  countryCode?: string;
  operator?: TravelProductOperator | null;
  experienceDefinition?: TravelProductExperienceDefinition | null;
  /** 仅详情接口 */
  placeLinks?: TravelProductPlaceLink[];
}

export interface TravelProductRatePlan {
  id: string;
  code?: string;
  nameEN?: string | null;
  nameCN?: string | null;
  currency?: string | null;
  amount?: string | number | null;
  travelerType?: string | null;
}

export interface TravelProductSession {
  id: string;
  offeringId: string;
  /** ISO date，常为 …T00:00:00.000Z */
  localDate: string;
  startTimeLocal?: string | null;
  endTimeLocal?: string | null;
  meetTimeLocal?: string | null;
  latestCheckInLocal?: string | null;
  timezone?: string | null;
  capacityTotal?: number | null;
  capacityRemaining?: number | null;
  /** SCHEDULED | CANCELLED | WEATHER_HOLD | … */
  status?: string | null;
  weatherStatus?: string | null;
  ratePlans?: TravelProductRatePlan[];
}

export interface TravelProductPlaceExperienceItem {
  /** 部分响应可能只嵌套在 experience.id */
  experienceDefinitionId?: string;
  displayNameZh?: string | null;
  displayNameEn?: string | null;
  isFeatured?: boolean;
  role?: string | null;
  sortOrder?: number;
  experience?: TravelProductExperienceDefinition | null;
}

export interface TravelProductPlaceExperiencesPayload {
  place: TravelProductPlaceRef;
  items: TravelProductPlaceExperienceItem[];
}

export interface ListTravelProductOfferingsParams {
  countryCode?: string;
  productType?: string;
  categoryCode?: string;
  subtypeCode?: string;
  /** 按体验定义筛供应商产品 */
  experienceDefinitionId?: string;
  q?: string;
  limit?: number;
}

export interface ListTravelProductExperiencesParams {
  countryCode?: string;
  productType?: string;
  q?: string;
  limit?: number;
}

export interface ListTravelProductSessionsParams {
  date?: string;
  from?: string;
  to?: string;
}
