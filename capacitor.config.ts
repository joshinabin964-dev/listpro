import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nabjo.app',
  appName: 'Nabjo',
  // Changed to 'public' so the sync command doesn't fail looking for an 'out' folder
  webDir: 'public', 
  server: {
    // This loads your live Vercel website directly inside the native app!
    url: 'https://listpro-ochre.vercel.app',
    cleartext: true
  }
};

export default config;