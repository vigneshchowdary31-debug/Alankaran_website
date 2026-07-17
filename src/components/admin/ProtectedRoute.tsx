import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { FullScreenLoader } from "@/components/admin/ui/Loaders";
import { ROUTES } from "@/constants/routes";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Reusable ProtectedRoute guard.
 * Behavior:
 * - While auth state is initializing/loading -> Displays full screen Loader
 * - If unauthenticated -> Redirects to /admin/login immediately
 * - If authenticated -> Renders the protected child components/layout
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (location !== ROUTES.ADMIN.LOGIN) {
        setLocation(ROUTES.ADMIN.LOGIN);
      }
    }
  }, [loading, isAuthenticated, location, setLocation]);

  if (loading) {
    return <FullScreenLoader text="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
