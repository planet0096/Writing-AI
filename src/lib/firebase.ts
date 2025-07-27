// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvesz4WJQ2v2Yy582C3Gj907OY7a9UACk",
  authDomain: "tubenext-z70jo.firebaseapp.com",
  projectId: "tubenext-z70jo",
  storageBucket: "tubenext-z70jo.firebasestorage.app",
  messagingSenderId: "1086340256556",
  appId: "1:1086340256556:web:aeefb9b9966f960faf5289"
};


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
