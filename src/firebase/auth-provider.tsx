// This component has been temporarily disabled and backed up to /src/auth-backup/auth-provider.tsx.bak
'use client';

import { AuthContext } from '@/hooks/use-auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Authentication is paused, providing a null user.
  return (
    <AuthContext.Provider value={{ user: null }}>
      {children}
    </AuthContext.Provider>
  );
}
