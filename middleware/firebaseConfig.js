// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAFik9VnFK1YMqcXfsSv02g91TEpXG-g0o",
  authDomain: "social-connect-132d0.firebaseapp.com",
  projectId: "social-connect-132d0",
  storageBucket: "social-connect-132d0.firebasestorage.app",
  messagingSenderId: "56322537903",
  appId: "1:56322537903:web:63a4b296a5933b99f3175a",
  measurementId: "G-GQHZG12S47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);