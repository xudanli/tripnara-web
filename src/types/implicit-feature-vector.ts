/**
 * TripNARA v1.1 — 12 维隐式特征向量
 * 与后端 LangGraph Tool Call 输出字段名对齐；全量组件传参基石。
 * @see FED-PRD v1.1 § Wave 1
 */

/** 12 维向量各轴 Key（写死，勿随意改名） */
export const IMPLICIT_FEATURE_KEYS = [
  'burnout_index', // I 轴 · 疗愈内省
  'exploration_index', // E 轴 · 高能探索
  'social_energy',
  'solitude_preference',
  'rhythm_flexibility',
  'risk_tolerance',
  'sensory_openness',
  'nature_affinity',
  'cultural_curiosity',
  'pace_preference',
  'reflection_depth',
  'novelty_seeking',
] as const;

export type ImplicitFeatureKey = (typeof IMPLICIT_FEATURE_KEYS)[number];

export const IMPLICIT_FEATURE_VECTOR_DIM = 12 as const;

/** 命名维度映射（0–1 归一化） */
export type ImplicitFeatureVector = Record<ImplicitFeatureKey, number>;

/** 后端 SSE 首包特征字段名（触发底部看板展开） */
export const FIRST_FEATURE_TRIGGER_KEY: ImplicitFeatureKey = 'burnout_index';

export type ImplicitFeaturePartial = Partial<ImplicitFeatureVector>;

/** 由数组还原为命名向量（长度必须为 12） */
export function arrayToImplicitFeatureVector(values: number[]): ImplicitFeatureVector {
  if (values.length !== IMPLICIT_FEATURE_VECTOR_DIM) {
    throw new Error(
      `Expected ${IMPLICIT_FEATURE_VECTOR_DIM} dimensions, got ${values.length}`
    );
  }
  const out = {} as ImplicitFeatureVector;
  IMPLICIT_FEATURE_KEYS.forEach((key, i) => {
    out[key] = values[i] ?? 0;
  });
  return out;
}

/** 命名向量 → 数组（listing / shader 频率计算用） */
export function implicitFeatureVectorToArray(v: ImplicitFeatureVector): number[] {
  return IMPLICIT_FEATURE_KEYS.map((k) => v[k]);
}

/** 从 SSE partial 判断是否已收到首层特征（Burnout_Index） */
export function hasFirstFeatureTrigger(partial: ImplicitFeaturePartial): boolean {
  return typeof partial[FIRST_FEATURE_TRIGGER_KEY] === 'number';
}

/** 由 12 维向量推导 Shader 固有频率 (Hz 视觉映射) */
export function deriveWaveFrequency(v: ImplicitFeatureVector): number {
  const i = v.burnout_index;
  const e = v.exploration_index;
  return 0.8 + i * 0.6 + e * 1.2;
}

/** 两向量夹角余弦 → 契合度标量 0–1 */
export function computeCompatibility(a: ImplicitFeatureVector, b: ImplicitFeatureVector): number {
  const va = implicitFeatureVectorToArray(a);
  const vb = implicitFeatureVectorToArray(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < IMPLICIT_FEATURE_VECTOR_DIM; i++) {
    dot += va[i]! * vb[i]!;
    na += va[i]! * va[i]!;
    nb += vb[i]! * vb[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, (dot / denom + 1) / 2));
}

export const EMPTY_IMPLICIT_FEATURE_VECTOR: ImplicitFeatureVector = Object.fromEntries(
  IMPLICIT_FEATURE_KEYS.map((k) => [k, 0])
) as ImplicitFeatureVector;
