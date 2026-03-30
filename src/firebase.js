// Firebase configuration
// Replace these values with your Firebase project config
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyA1a0RcoGmHgIx8GJ9QD3-BC3z-3RopL1k",
  authDomain: "skillforge-7a058.firebaseapp.com",
  projectId: "skillforge-7a058",
  storageBucket: "skillforge-7a058.firebasestorage.app",
  messagingSenderId: "594339083725",
  appId: "1:594339083725:web:54037350180ae6d4e54084"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Firestore
export const db = getFirestore(app)

export default app