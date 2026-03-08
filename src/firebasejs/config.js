// src/firebasejs/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, disableNetwork, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCSpzeyhwzuq_DrSRqcKNdZBxDTXPnSS3o",
  authDomain: "prime-sms-hub-661cc.firebaseapp.com",
  projectId: "prime-sms-hub-661cc",
  storageBucket: "prime-sms-hub-661cc.firebasestorage.app",
  messagingSenderId: "1049442796038",
  appId: "1:1049442796038:web:c3de3a11fd5d0243523987",
  measurementId: "G-LWGBT09TLD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with offline-first settings to prevent unnecessary network calls on free tier
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// On production (free tier Render), disable network to prevent connection errors
// Users will see cached data or fallback UI
if (import.meta.env.PROD) {
  console.warn('🔒 Firestore network disabled on production (free tier compatibility)');
  disableNetwork(db).catch(err => console.warn('Network disable error:', err.message));
}

let analytics;
try {
  analytics = getAnalytics(app);
} catch (err) {
  console.warn('Analytics disabled:', err.message);
}

export { auth, db, analytics };
export default app;