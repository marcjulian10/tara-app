import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEqx4pDbXzjdAux3zCzdMmCLrEJLoFxSQ",
  authDomain: "tara-1aacf.firebaseapp.com",
  projectId: "tara-1aacf",
  storageBucket: "tara-1aacf.firebasestorage.app",
  messagingSenderId: "519304462876",
  appId: "1:519304462876:web:1909ad3f37b8b9bd3195d9",
  measurementId: "G-8W0B84L0J5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
