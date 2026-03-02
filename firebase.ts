import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqgAMW3crahlXqnlsYNwkTY_gbqhw0yEo",
  authDomain: "iservices-task.firebaseapp.com",
  projectId: "iservices-task",
  storageBucket: "iservices-task.firebasestorage.app",
  messagingSenderId: "411841442764",
  appId: "1:411841442764:web:9b0c4ee41a329594a36369",
  measurementId: "G-C304N8RYDD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
