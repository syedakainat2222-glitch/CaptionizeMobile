'use client';

import { UserProvider } from '@/hooks/use-user';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}