/// <reference types="vite/client" />

import 'axios';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    /** 根据 URL 划分的 API 分层，供响应拦截器附加诊断信息 */
    tripnaraApiKind?: 'agent' | 'decision_engine' | 'default';
    /** TRIP_ORCHESTRATION_BUSY 指数退避重试计数 */
    __busyRetryCount?: number;
    _retry?: boolean;
  }
}

// Web Speech API (语音识别)
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}
declare var SpeechRecognition: { new (): SpeechRecognition };
declare var webkitSpeechRecognition: { new (): SpeechRecognition };

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MAPBOX_TOKEN: string;
  /** HikePlan: api | local | auto（默认 auto：登录走 API） */
  readonly VITE_HIKE_PLAN_STORAGE?: string;
  readonly VITE_FEATURE_MEMORY_CONSOLE?: string;
  readonly VITE_FEATURE_MEMORY_CONSTRAINT_SINK?: string;
  readonly VITE_MEMORY_CONSOLE_MOCK?: string;
  /** Match Square：开发环境默认 mock；设为 0 走真实后端 */
  readonly VITE_MATCH_SQUARE_MOCK?: string;
  /** Vibe LLM parse：1=规则引擎 · 0=后端 LLM · 未设置=跟随 VITE_MATCH_SQUARE_MOCK */
  readonly VITE_VIBE_LLM_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 图片文件类型声明
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

