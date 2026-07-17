import type { User } from "firebase/auth";

export interface LoginCredentials {
  email: string;
  pass: string;
}

export interface AuthState {
  currentUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
}
