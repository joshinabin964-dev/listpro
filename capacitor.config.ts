import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nabjo.app',
  appName: 'Nabjo',
  webDir: 'out',
  server: {
    url: 'https://listpro-ochre.vercel.app',
    cleartext: true,
    // This traps the login redirect inside the app!
    allowNavigation: ['listpro-ochre.vercel.app', '*.supabase.co', 'accounts.google.com', 'google.com']
  }
};

export default config;