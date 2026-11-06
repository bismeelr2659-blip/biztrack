import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Safe environment config lookup
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {} as Record<string, string>;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoKeyForBizTrackSaaSCloud123',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'biztrack-saas.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'biztrack-saas',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'biztrack-saas.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1029384756',
  appId: env.VITE_FIREBASE_APP_ID || '1:1029384756:web:abcdef123456789',
};

// Check if credentials are production configured
export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  db = getFirestore(app);
  auth = getAuth(app);

  // Enable offline caching if available in browser
  if (typeof window !== 'undefined' && db) {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence enabled in another browser tab.');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('The current browser does not support Firestore offline persistence.');
      }
    });
  }
} catch (error) {
  console.warn('Firebase initialized in fallback mode:', error);
}

export { app, db, auth };
