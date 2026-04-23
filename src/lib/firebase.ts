import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqH96_9RgMg1_rR8liLyhkzpVCTfoU9k4",
  authDomain: "test-compiler-8904a.firebaseapp.com",
  projectId: "test-compiler-8904a",
  storageBucket: "test-compiler-8904a.firebasestorage.app",
  messagingSenderId: "649073865396",
  appId: "1:649073865396:web:71f91d5ce553103bf71de1",
  measurementId: "G-5V6GF77LG3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);

export { app, analytics, db };
