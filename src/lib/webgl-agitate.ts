/** WebGL 粒子画布 agitate 自定义事件 */
export const WEBGL_AGITATE_EVENT = 'webgl-agitate';

export interface WebGLAgitateDetail {
  speed: number;
}

export function dispatchWebGLAgitate(speed: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<WebGLAgitateDetail>(WEBGL_AGITATE_EVENT, { detail: { speed } })
  );
}
