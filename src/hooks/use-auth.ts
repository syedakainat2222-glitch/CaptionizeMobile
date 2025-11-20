'use client';

import { createContext, useContext } from 'react';
import type { User } from '@/lib/types';

export const AuthContext = createContext<{ user: User | null }>({
    user: null,
});

export const useAuth = () => {
    return useContext(AuthContext);
};
