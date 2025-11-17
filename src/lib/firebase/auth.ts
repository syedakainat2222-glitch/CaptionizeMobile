
import {
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { User } from "@/lib/types";

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

export async function signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
         if (user) {
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
            };
        }
        return null;
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
