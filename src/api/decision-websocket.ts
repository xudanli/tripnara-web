import type {
  WebSocketMessage,
  WebSocketProgressMessage,
  WebSocketCompletedMessage,
  WebSocketErrorMessage,
} from '@/types/decision-engine';

type MessageHandler = (message: WebSocketMessage) => void;
type ProgressHandler = (message: WebSocketProgressMessage) => void;
type CompletedHandler = (message: WebSocketCompletedMessage) => void;
type ErrorHandler = (message: WebSocketErrorMessage) => void;
type ConnectionHandler = () => void;

interface DecisionWebSocketOptions {
  token: string;
  baseUrl?: string;
  onProgress?: ProgressHandler;
  onCompleted?: CompletedHandler;
  onError?: ErrorHandler;
  onOpen?: ConnectionHandler;
  onClose?: ConnectionHandler;
  onMessage?: MessageHandler;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class DecisionWebSocketClient {
  private ws: WebSocket | null = null;
  private token: string;
  private baseUrl: string;
  private options: DecisionWebSocketOptions;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribedDecisionIds: Set<string> = new Set();
  private isManualClose = false;

  constructor(options: DecisionWebSocketOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl || this.getDefaultBaseUrl();
    this.options = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      ...options,
    };
  }

  private getDefaultBaseUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/user`;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualClose = false;
    const url = `${this.baseUrl}?token=${encodeURIComponent(this.token)}`;
    
    try {
      this.ws = new WebSocket(url);
      this.setupEventListeners();
    } catch (error) {
      console.error('[DecisionWS] Connection failed:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onOpen?.();
      
      this.subscribedDecisionIds.forEach(decisionId => {
        this.sendSubscribe(decisionId);
      });
    };

    this.ws.onclose = () => {
      this.options.onClose?.();
      
      if (!this.isManualClose && this.options.reconnect) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      console.error('[DecisionWS] Error:', event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('[DecisionWS] Failed to parse message:', error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    this.options.onMessage?.(message);

    switch (message.type) {
      case 'progress':
        this.options.onProgress?.(message);
        break;
      case 'completed':
        this.options.onCompleted?.(message);
        break;
      case 'error':
        this.options.onError?.(message);
        break;
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 5)) {
      console.error('[DecisionWS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval || 3000;
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private sendSubscribe(decisionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'decision_progress',
        decisionId,
      }));
    }
  }

  subscribeToDecision(decisionId: string): void {
    this.subscribedDecisionIds.add(decisionId);
    this.sendSubscribe(decisionId);
  }

  unsubscribeFromDecision(decisionId: string): void {
    this.subscribedDecisionIds.delete(decisionId);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        channel: 'decision_progress',
        decisionId,
      }));
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscribedDecisionIds.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  updateToken(token: string): void {
    this.token = token;
    if (this.isConnected()) {
      this.disconnect();
      this.connect();
    }
  }
}

let globalClient: DecisionWebSocketClient | null = null;

export function getDecisionWebSocket(
  options?: Partial<DecisionWebSocketOptions>
): DecisionWebSocketClient {
  const token = sessionStorage.getItem('accessToken') || '';
  
  if (!globalClient) {
    globalClient = new DecisionWebSocketClient({
      token,
      ...options,
    });
  } else if (options) {
    Object.assign(globalClient, options);
  }
  
  return globalClient;
}

export function disconnectDecisionWebSocket(): void {
  if (globalClient) {
    globalClient.disconnect();
    globalClient = null;
  }
}
