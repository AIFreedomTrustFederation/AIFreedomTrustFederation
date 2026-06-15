import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.aifreedomtrust.aiftforge',
  appName: 'AIFT Forge',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '127.0.0.1',
      'localhost',
      '*.local',
      '10.0.2.2',
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
      '172.17.*.*',
      '172.18.*.*',
      '172.19.*.*',
      '172.20.*.*',
      '172.21.*.*',
      '172.22.*.*',
      '172.23.*.*',
      '172.24.*.*',
      '172.25.*.*',
      '172.26.*.*',
      '172.27.*.*',
      '172.28.*.*',
      '172.29.*.*',
      '172.30.*.*',
      '172.31.*.*'
    ]
  },
  android: {
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#07111f',
      showSpinner: false
    }
  }
};

export default config;
