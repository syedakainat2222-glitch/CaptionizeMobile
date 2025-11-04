import {
  getAuth,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { app } from "@/lib/firebase"; // Use the initialized app
import type { User } from "@/lib/types";

export const auth = getAuth(app);

export function onAuthStateChanged(callback: (user: User | null) => void) {
  return onFirebaseAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      const simplifiedUser: User = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };
      callback(simplifiedUser);
    } else {
      callback(null);
    }
  });
}
