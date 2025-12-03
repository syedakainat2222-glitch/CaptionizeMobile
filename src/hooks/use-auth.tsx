'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import the initialized auth instance
import type { User } from '../lib/types';

// -------------------------------------------
// Auth Context
// -------------------------------------------
export const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});

// -------------------------------------------
// Convert Firebase User → Our User type
// -------------------------------------------
function mapFirebaseUser(u: FirebaseUser | null): User | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email ?? '',
    displayName: u.displayName ?? '',
    photoURL: u.photoURL ?? null,
  };
}

// -------------------------------------------
// Auth Provider
// -------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ---- Admin Bypass ----
    const ADMIN_EMAIL = "admin@bypass.com";
    const ENABLE_ADMIN_BYPASS = false;

    if (ENABLE_ADMIN_BYPASS) {
      const adminUser: User = {
        uid: 'admin-user-uid',
        email: ADMIN_EMAIL,
        displayName: 'Admin User (Bypassed)',
        photoURL: null,
      };
      setUser(adminUser);
      setLoading(false);
      return; // Skip Firebase auth for admin
    }

    // ---- Normal Firebase Auth ----
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(mapFirebaseUser(fbUser));
      setLoading(false);
    });

    // ---- Fallback in case onAuthStateChanged never fires ----
    const fallback = setTimeout(() => {
      console.warn('Auth fallback triggered (Firebase Studio or slow init).');
      setLoading(false);
    }, 2000);

    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

// -------------------------------------------
// useAuth Hook
// -------------------------------------------
export const useAuth = () => useContext(AuthContext);
