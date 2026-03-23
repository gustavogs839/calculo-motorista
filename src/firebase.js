import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB5Q9iZA_mVmPMfEoOxOdHs7w1GrtqgPXw",
  authDomain: "motorista-app-a0d2e.firebaseapp.com",
  projectId: "motorista-app-a0d2e",
  storageBucket: "motorista-app-a0d2e.firebasestorage.app",
  messagingSenderId: "543013314360",
  appId: "1:543013314360:web:9f351e82016690f2c0abcd",
  measurementId: "G-1XWSZCE6VV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);