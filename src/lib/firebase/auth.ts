// This file has been temporarily modified and backed up to /src/auth-backup/firebase-auth.ts.bak

import type { Auth } from "firebase/auth";
import type { User } from "../types";

// Mock functions to disable authentication
export function onAuthStateChanged(authInstance: Auth, callback: (user: User | null) => void) {
  // Immediately call back with null user and return an empty unsubscribe function
  callback(null);
  return () => {};
}

export async function signInWithGoogle(): Promise<void> {
    console.log("Sign-in has been temporarily disabled.");
    return Promise.resolve();
}

export async function signOut(): Promise<void> {
    console.log("Sign-out has been temporarily disabled.");
    return Promise.resolve();
}
