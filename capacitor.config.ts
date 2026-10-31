import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nabjo.app',
  appName: 'Nabjo',
  webDir: 'out',
  server: {
    url: 'https://listpro-ochre.vercel.app',
    cleartext: true,
    allowNavigation: ['listpro-ochre.vercel.app', '*.supabase.co', 'accounts.google.com', 'google.com']
  }
};

export default config;