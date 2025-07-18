// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

  // Add your Firebase config here
const firebaseConfig = {
  apiKey: "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
  authDomain: "nexus-res-q.firebaseapp.com",
  projectId: "nexus-res-q",
  storageBucket: "nexus-res-q.firebasestorage.app",
  messagingSenderId: "203995658810",
  appId: "1:203995658810:web:97ae2ef0e9d1ed785cd303",
  measurementId: "G-B7B1QZVWFG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);

export default app;
