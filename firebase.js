// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAqnCQnFROLiVsQPIvgOe7mAciDiwCuLOg",
  authDomain: "nexus-res-q.firebaseapp.com",
  projectId: "nexus-res-q",
  storageBucket: "nexus-res-q.appspot.com",
  messagingSenderId: "203995658810",
  appId: "1:203995658810:web:97ae2ef0e9d1ed785cd303",
  measurementId: "G-B7B1QZVWFG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
