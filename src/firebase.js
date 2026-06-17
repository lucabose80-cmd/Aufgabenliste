import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAlC4cf1RU4HdlMTn4wQOBlrMhLM1ZD4qE",
  authDomain: "thabit-tracker.firebaseapp.com",
  projectId: "thabit-tracker",
  storageBucket: "thabit-tracker.firebasestorage.app",
  messagingSenderId: "178691558776",
  appId: "1:178691558776:web:f261d90853d653f52a4c8d",
  measurementId: "G-5LEJG8SYHD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});
