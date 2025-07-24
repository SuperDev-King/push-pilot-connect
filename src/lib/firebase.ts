import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';

// Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxxxxxxxxxxxxxxx"
};

// Your VAPID key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = "YOUR_VAPID_KEY_HERE";

const app = initializeApp(firebaseConfig);

let messaging: any = null;

// Initialize messaging only in browser environment
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase messaging:', error);
  }
}

export { messaging };

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  if (!messaging) {
    console.warn('Firebase messaging not available');
    return null;
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    
    if (permission === 'granted') {
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY
      });
      
      if (token) {
        console.log('FCM Token obtained:', token);
        return token;
      } else {
        console.warn('No registration token available');
        return null;
      }
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission or token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = (): Promise<MessagePayload> =>
  new Promise((resolve) => {
    if (!messaging) {
      console.warn('Firebase messaging not available for foreground messages');
      return;
    }
    
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      resolve(payload);
    });
  });

// Get current FCM token (useful for debugging)
export const getCurrentToken = async (): Promise<string | null> => {
  if (!messaging) return null;
  
  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });
    return token || null;
  } catch (error) {
    console.error('Error getting current token:', error);
    return null;
  }
};

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get notification permission status
export const getNotificationPermission = (): NotificationPermission => {
  return Notification.permission;
};