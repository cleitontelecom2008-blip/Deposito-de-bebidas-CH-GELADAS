import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPq8-B4l-kThTXtX9CVBTdpzarBObUYxI",
  authDomain: "ch-geladas.firebaseapp.com",
  projectId: "ch-geladas",
  storageBucket: "ch-geladas.firebasestorage.app",
  messagingSenderId: "859746983655",
  appId: "1:859746983655:web:dce025d5048850923a8c42"
};

const app = initializeApp(firebaseConfig);
window.firestoreDB = getFirestore(app);
console.log("🔥 Firebase OK");