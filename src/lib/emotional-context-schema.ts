/** 出站 client 投影 schema（BFF / SSE / Journey API） */
export const EMOTIONAL_CONTEXT_CLIENT_SCHEMA = 'tripnara.emotional_context.client@v1' as const;

/** 编排内部 schema（assembler 回放时可能出现，客户端兼容解析） */
export const EMOTIONAL_CONTEXT_INTERNAL_SCHEMA = 'tripnara.emotional_context@v1' as const;

export type EmotionalContextSchema =
  | typeof EMOTIONAL_CONTEXT_CLIENT_SCHEMA
  | typeof EMOTIONAL_CONTEXT_INTERNAL_SCHEMA
  | (string & {});

/** 允许的入站 schema；缺省视为 legacy 兼容 */
export function isAcceptedEmotionalContextSchema(schema: unknown): boolean {
  if (schema == null || schema === '') return true;
  const s = String(schema).trim();
  return (
    s === EMOTIONAL_CONTEXT_CLIENT_SCHEMA ||
    s === EMOTIONAL_CONTEXT_INTERNAL_SCHEMA
  );
}

export function normalizeEmotionalContextSchema(
  schema: unknown
): EmotionalContextSchema | undefined {
  if (schema == null || schema === '') return undefined;
  const s = String(schema).trim();
  if (!isAcceptedEmotionalContextSchema(s)) return undefined;
  return s as EmotionalContextSchema;
}
