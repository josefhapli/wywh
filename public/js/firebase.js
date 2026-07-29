// This file should do nothing except initialize Firebase and export: 
// db
// storage
// auth
// public/js/firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-functions.js";

const firebaseConfig = {
  // Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
  apiKey: "AIzaSyAS-T3H9OSWssqVN412cwDJGu61VH5I2Uo",
  authDomain: "wish-you-were-here-dev.firebaseapp.com",
  projectId: "wish-you-were-here-dev",
  storageBucket: "wish-you-were-here-dev.firebasestorage.app",
  messagingSenderId: "905604585916",
  appId: "1:905604585916:web:d3f792ffaff19fe53573b9",
  measurementId: "G-BZMXZFZ4PG"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");
