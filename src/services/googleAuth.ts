// Google Identity Services (GIS) 类型定义
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: OneTapConfig) => void;
          prompt: (callback?: (notification: OneTapNotification) => void) => void;
          disableAutoSelect: () => void;
          renderButton: (
            element: HTMLElement,
            config: ButtonConfig
          ) => void;
        };
        oauth2: {
          initCodeClient: (config: CodeClientConfig) => CodeClient;
        };
      };
    };
  }
}

export interface OneTapConfig {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  cancel_on_tap_outside?: boolean;
  auto_select?: boolean;
  itp_support?: boolean;
}

export interface ButtonConfig {
  type: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: string | number;
  locale?: string;
  click_listener?: () => void;
}

export interface CodeClientConfig {
  client_id: string;
  scope: string;
  callback: (response: CodeResponse) => void;
  ux_mode?: 'popup' | 'redirect';
  redirect_uri?: string;
  select_account?: boolean;
}

export interface CredentialResponse {
  credential: string; // ID Token (JWT)
  select_by?: string;
}

export interface CodeResponse {
  code: string;
  scope?: string;
  authuser?: string;
  prompt?: string;
}

export interface OneTapNotification {
  isNotDisplayed: boolean;
  isSkippedMoment: boolean;
  isDismissedMoment: boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
}

export interface CodeClient {
  requestCode: () => void;
}

// Google 认证服务
class GoogleAuthService {
  private clientId: string;
  private isInitialized = false;

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (!this.clientId) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set');
    }
  }

  // 等待 Google 脚本加载完成
  private async waitForGoogleScript(): Promise<void> {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5秒超时

      const checkInterval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Google Identity Services script failed to load'));
        }
      }, 100);
    });
  }

  // 初始化 One Tap
  async initializeOneTap(
    callback: (credential: string) => void,
    options?: {
      autoSelect?: boolean;
      cancelOnTapOutside?: boolean;
    }
  ): Promise<void> {
    if (!this.clientId) {
      console.warn('Google Client ID not configured');
      return;
    }

    try {
      await this.waitForGoogleScript();

      window.google!.accounts.id.initialize({
        client_id: this.clientId,
        callback: (response: CredentialResponse) => {
          callback(response.credential);
        },
        auto_select: options?.autoSelect ?? true,
        cancel_on_tap_outside: options?.cancelOnTapOutside ?? true,
        itp_support: true,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google One Tap:', error);
    }
  }

  // 显示 One Tap
  async promptOneTap(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeOneTap(() => {});
    }

    try {
      await this.waitForGoogleScript();
      window.google!.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed) {
          console.log('One Tap not displayed:', notification.getNotDisplayedReason());
        }
        if (notification.isSkippedMoment) {
          console.log('One Tap skipped:', notification.getSkippedReason());
        }
        if (notification.isDismissedMoment) {
          console.log('One Tap dismissed:', notification.getDismissedReason());
        }
      });
    } catch (error) {
      console.error('Failed to prompt Google One Tap:', error);
    }
  }

  // 渲染 Google 登录按钮
  async renderButton(
    element: HTMLElement,
    _callback: (credential: string) => void,
    options?: Partial<ButtonConfig>
  ): Promise<void> {
    if (!this.clientId) {
      console.warn('Google Client ID not configured');
      return;
    }

    try {
      await this.waitForGoogleScript();

      window.google!.accounts.id.renderButton(element, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: '100%',
        ...options,
      });

      // 监听按钮点击（通过 callback 处理）
      // 注意：GIS 按钮会自动处理点击，我们需要通过 Code Client 来处理
    } catch (error) {
      console.error('Failed to render Google button:', error);
    }
  }

  // 初始化 Code Client（用于授权码模式）
  async initializeCodeClient(
    callback: (code: string) => void,
    options?: {
      uxMode?: 'popup' | 'redirect';
      redirectUri?: string;
      selectAccount?: boolean;
    }
  ): Promise<CodeClient | null> {
    if (!this.clientId) {
      console.warn('Google Client ID not configured');
      return null;
    }

    try {
      await this.waitForGoogleScript();

      const codeClient = window.google!.accounts.oauth2.initCodeClient({
        client_id: this.clientId,
        scope: 'openid email profile',
        callback: (response: CodeResponse) => {
          callback(response.code);
        },
        ux_mode: options?.uxMode ?? 'popup',
        redirect_uri: options?.redirectUri,
        select_account: options?.selectAccount ?? true,
      });

      return codeClient;
    } catch (error) {
      console.error('Failed to initialize Google Code Client:', error);
      return null;
    }
  }

  // 禁用自动选择（用于登出时）
  async disableAutoSelect(): Promise<void> {
    try {
      await this.waitForGoogleScript();
      window.google!.accounts.id.disableAutoSelect();
    } catch (error) {
      console.error('Failed to disable auto select:', error);
    }
  }
}

export const googleAuthService = new GoogleAuthService();

