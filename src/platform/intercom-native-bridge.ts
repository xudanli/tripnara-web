import { getAppRuntime } from './native-runtime';
import type { IntercomNativeBridge } from './intercom-native-bridge.types';
import { createWebIntercomBridge } from './intercom-native-bridge.web';

let bridgeSingleton: IntercomNativeBridge | null = null;

/** 按运行环境返回对讲原生桥（Web 模拟 / Capacitor BLE） */
export async function getIntercomNativeBridge(): Promise<IntercomNativeBridge> {
  if (bridgeSingleton) return bridgeSingleton;

  if (getAppRuntime() === 'capacitor') {
    const { createCapacitorIntercomBridge } = await import('./intercom-native-bridge.capacitor');
    bridgeSingleton = createCapacitorIntercomBridge();
  } else {
    bridgeSingleton = createWebIntercomBridge();
  }

  return bridgeSingleton;
}

export function resetIntercomNativeBridgeForTests(): void {
  bridgeSingleton = null;
}
