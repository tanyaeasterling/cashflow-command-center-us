import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const utils = trpc.useUtils();
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ email, password }: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Invalid email or password. Please try again.");
        return;
      }

      await utils.auth.me.invalidate();
      window.location.href = "/";
    } catch {
      toast.error("Login failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) return;
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      setForgotSent(true);
    } catch {
      toast.error("Could not send reset email. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--tec-purple-deep, #1a0a2e)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-8 space-y-6"
        style={{ background: "#fff" }}
      >
        {/* Logo */}
        <div className="text-center space-y-1">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2"
            style={{ background: "oklch(93% 0.04 310)" }}
          >
            <Lock size={22} style={{ color: "var(--tec-purple, #4a2878)" }} />
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "'DM Serif Display', serif", color: "var(--tec-purple-deep, #1a0a2e)" }}
          >
            CaulCo Cashflow
          </h1>
          <p className="text-sm" style={{ color: "oklch(55% 0.06 300)" }}>
            Tanya Easterling Consulting
          </p>
        </div>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                style={{ background: "var(--tec-purple, #4a2878)", color: "#fff" }}
              >
                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" style={{ borderColor: "oklch(88% 0.03 310)" }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white" style={{ color: "oklch(60% 0.05 310)" }}>
                  or
                </span>
              </div>
            </div>

            {/* Google OAuth — shows when credentials are configured, placeholder otherwise */}
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.566 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-xs underline"
                style={{ color: "oklch(55% 0.06 300)" }}
              >
                Forgot your password?
              </button>
            </div>
          </>
        ) : (
          /* Forgot password panel */
          <div className="space-y-4">
            {forgotSent ? (
              <div className="text-center space-y-3">
                <Mail size={32} style={{ color: "var(--tec-purple, #4a2878)", margin: "0 auto" }} />
                <p className="text-sm font-medium">Check your email</p>
                <p className="text-xs" style={{ color: "oklch(55% 0.06 300)" }}>
                  If that address is in our system, a reset link is on its way.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                  className="text-xs underline"
                  style={{ color: "var(--tec-purple, #4a2878)" }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm" style={{ color: "oklch(45% 0.06 300)" }}>
                  Enter your email and we will send a reset link.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={handleForgotPassword}
                  style={{ background: "var(--tec-purple, #4a2878)", color: "#fff" }}
                >
                  Send reset link
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="text-xs underline"
                    style={{ color: "oklch(55% 0.06 300)" }}
                  >
                    Back to sign in
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
