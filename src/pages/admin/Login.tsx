import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { Sparkles, ShieldCheck, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button, Input, PasswordInput, Alert, AlertDescription, ButtonLoader } from "@/components/admin/ui";
import { showSuccess } from "@/utils/toast";
import { ROUTES, MESSAGES } from "@/constants";

export function AdminLogin() {
  const [, setLocation] = useLocation();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation(ROUTES.ADMIN.DASHBOARD);
    }
  }, [isAuthenticated, setLocation]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError("Please enter your administrator email address.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address format.");
      return false;
    }
    if (!password) {
      setError("Please enter your password.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(email, password);
      showSuccess("Welcome Back", MESSAGES.SUCCESS.LOGIN);
      setLocation(ROUTES.ADMIN.DASHBOARD);
    } catch (err: any) {
      setError(err.message || MESSAGES.ERROR.INVALID_CREDENTIALS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nizami-dark text-stone-200 flex flex-col justify-between p-6 select-none relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/3" />

      {/* Top Bar: Back to website */}
      <div className="max-w-md mx-auto w-full pt-4 z-10">
        <Link
          href={ROUTES.PUBLIC.HOME}
          className="inline-flex items-center gap-2 font-sans text-xs text-stone-400 hover:text-gold transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Return to Alankaran Live Website</span>
        </Link>
      </div>

      {/* Center Card */}
      <div className="max-w-md mx-auto w-full my-auto py-8 z-10">
        <div className="bg-black/40 border border-gold/25 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative">
          {/* Subtle Golden Crown Arch Border */}
          <div className="absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-75" />

          {/* Header Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-gold/10 border border-gold/30 text-gold mb-4 shadow-inner">
              <Sparkles className="size-6" />
            </div>
            <h1 className="font-serif text-3xl tracking-[0.15em] text-stone-100 font-normal">
              ALANKARAN
            </h1>
            <p className="font-sans text-xs tracking-[0.25em] text-gold uppercase mt-1">
              Custom Image CMS
            </p>
            <p className="font-sans text-xs text-stone-400 font-light mt-3">
              Enter your credentials to manage website imagery
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-950/40 border-red-900/60 text-red-200">
              <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
              <AlertDescription className="text-xs font-sans leading-relaxed ml-2">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label
                htmlFor="admin-email"
                className="block font-sans text-xs font-medium text-stone-300 tracking-wider uppercase"
              >
                Email Address
              </label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@alankaran.com"
                disabled={loading}
                required
                autoComplete="email"
                autoFocus
                className="h-11 bg-stone-900/80 border-stone-800 text-stone-100 placeholder:text-stone-600 focus-visible:ring-gold/50 focus-visible:border-gold/50"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="admin-password"
                className="block font-sans text-xs font-medium text-stone-300 tracking-wider uppercase"
              >
                Password
              </label>
              <PasswordInput
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                required
                autoComplete="current-password"
                className="h-11 bg-stone-900/80 border-stone-800 text-stone-100 placeholder:text-stone-600 focus-visible:ring-gold/50 focus-visible:border-gold/50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gold text-stone-950 hover:bg-gold-hover hover:gold-glow font-sans font-semibold text-xs tracking-widest uppercase transition-all mt-4"
            >
              {loading ? <ButtonLoader text="Authenticating..." /> : "Sign In to Dashboard"}
            </Button>
          </form>

          {/* Security Note */}
          <div className="mt-8 pt-6 border-t border-stone-800/80 flex items-center justify-center gap-2 text-stone-500 text-[11px] font-sans font-light">
            <ShieldCheck className="size-3.5 text-gold/60" />
            <span>Encrypted Firebase Admin Authentication</span>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="max-w-md mx-auto w-full pb-4 text-center z-10">
        <p className="text-[11px] font-sans text-stone-400 font-light">
          © {new Date().getFullYear()} Alankaran Luxury Weddings. All rights reserved.
        </p>
      </div>
    </div>
  );
}
