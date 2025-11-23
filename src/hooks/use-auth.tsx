// This hook has been temporarily modified and backed up to /src/auth-backup/use-auth.tsx.bak
'use client';

import React, { createContext, useContext } from 'react';
import type { User } from '../lib/types';

// Auth Context
export const AuthContext = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: false, // Set loading to false as auth is paused
});

// Auth Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Provide a mock user or null, with loading set to false.
  return <AuthContext.Provider value={{ user: null, loading: false }}>{children}</AuthContext.Provider>;
}

// useAuth Hook
export const useAuth = () => useContext(AuthContext);
