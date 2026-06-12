/** tripnara.delivery_artifacts@v1 — 规划完成后的默认交付入口 */
export type DeliveryArtifactKind =
  | 'map'
  | 'calendar'
  | 'dashboard'
  | 'pdf'
  | 'text_copy'
  | (string & {});

export interface DeliveryArtifactApiAction {
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE' | (string & {});
  path: string;
  body?: Record<string, unknown>;
}

export interface DeliveryArtifactLink {
  kind: DeliveryArtifactKind;
  label_zh: string;
  href?: string;
  api_action?: DeliveryArtifactApiAction;
  /** kind=text_copy 时后端可预填可复制正文 */
  text_content?: string;
}

export interface DeliveryArtifactsPayload {
  schema: 'tripnara.delivery_artifacts@v1';
  links: DeliveryArtifactLink[];
  headline_zh?: string;
  [key: string]: unknown;
}
