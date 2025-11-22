
import {
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../firebase";
import type { User } from "../types";

export function onAuthStateChanged(authInstance: Auth, callback: (user: User | null) => void) {
  return onFirebaseAuthStateChanged(authInstance, (user: FirebaseUser | null) => {
    if (user) {
      const simplifiedUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };
      callback(simplifiedUser);
    } else {
      callback(null);
    }
  });
}

export async function signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    // Force account selection every time, which can help resolve issues in iframe environments.
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error during Google sign-in:", error);
        throw error;
    }
}

export async function signOut(): Promise<void> {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error during sign-out:", error);
        throw error;
    }
}
