import {
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from "firebase/auth";
import type { User } from "@/lib/types";

export function onAuthStateChanged(auth: Auth, callback: (user: User | null) => void) {
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
