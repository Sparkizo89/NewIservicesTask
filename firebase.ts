import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA2Ck3H4-7KKNFBvNfpb4t-oGQDv0ZDbps",
  authDomain: "iservices-task-840dd.firebaseapp.com",
  projectId: "iservices-task-840dd",
  storageBucket: "iservices-task-840dd.firebasestorage.app",
  messagingSenderId: "474358132461",
  appId: "1:474358132461:web:8c406deba18d38c00466e4",
  measurementId: "G-9T0EEPT0W4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

