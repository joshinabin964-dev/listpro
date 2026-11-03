import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// ✅ YOUR EXACT FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBwAO_imrENw178huFEBAmIAyxmGq-DPiU",
  authDomain: "nabjo-9d6cb.firebaseapp.com",
  projectId: "nabjo-9d6cb",
  storageBucket: "nabjo-9d6cb.firebasestorage.app",
  messagingSenderId: "533454735290",
  appId: "1:533454735290:web:6262e2a07efa003b883f83",
  measurementId: "G-H9NXT6GFK8"
};

// Initialize Firebase (prevents multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Cloud Messaging
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Request permission and get FCM Token
export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
    
    const token = await getToken(messaging, {
      // ✅ YOUR EXACT VAPID KEY
      vapidKey: 'BLSGSsr4v-StdUQU2myficVGXwLlQY6d0YC7fEi4zeotQipXZioVpIZ5atnDnQpXRl3EI7DlVdfxAOO15pJrsQ0' 
    });
    
    console.log('FCM Token Generated:', token);
    return token;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
};

// Listen for messages when the app is open and in focus
export const onMessageListener = (callback: any) => {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    console.log('Foreground message received. Payload:', payload);
    callback(payload);
  });
};