import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBFybMGcRgMGHiBwUtFmLlleVIZmKNPo-8",
  authDomain: "studio-4279257619-fdb62.firebaseapp.com",
  projectId: "studio-4279257619-fdb62",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
