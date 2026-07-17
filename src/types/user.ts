export type UserRole = "ADMIN" | "EDITOR" | "VIEWER";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt?: number;
  lastLoginAt?: number;
}
