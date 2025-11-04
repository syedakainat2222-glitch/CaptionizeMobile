"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged } from "@/lib/firebase/auth";
import type { User } from "@/lib/types";

// For this prototype, we'll use a mock user.
// In a real application, you would integrate a full authentication flow.
const MOCK_USER: User = {
    uid: 'dev-user-12345',
    email: 'dev@example.com',
    displayName: 'Dev User',
};

type UserContextType = {
  user: User | null;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd use onAuthStateChanged(auth, (user) => ...);
    // For now, we simulate an async fetch of the user.
    const timer = setTimeout(() => {
        setUser(MOCK_USER);
        setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
