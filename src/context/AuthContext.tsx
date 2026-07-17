import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { User } from "firebase/auth";
import { authService } from "@/services/auth/auth.service";
import type { AuthContextType } from "@/types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Optimized Authentication Context Provider.
 * Enforces memoization via `useCallback` on actions and `useMemo` on context value
 * to guarantee that consuming components only rerender when `currentUser` or `loading` explicitly changes.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to Firebase auth state changes once on mount
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, pass: string): Promise<User> => {
    return await authService.login(email, pass);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    return await authService.logout();
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      isAuthenticated: !!currentUser,
      login,
      logout,
    }),
    [currentUser, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom hook to consume the AuthContext safely from any component.
 * @throws {Error} If called outside of `<AuthProvider>`
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
