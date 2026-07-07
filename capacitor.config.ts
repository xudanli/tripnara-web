import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tripnara.app',
  appName: 'TripNARA',
  webDir: 'dist',
  server: {
    // 开发时可用 Capacitor Live Reload：取消注释并改为本机 IP
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: '正在扫描附近队友…',
        cancel: '取消',
        availableDevices: '可用设备',
        noDeviceFound: '未发现蓝牙设备',
      },
    },
  },
};

export default config;
