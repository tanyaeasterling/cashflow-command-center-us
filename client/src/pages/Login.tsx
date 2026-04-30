import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const utils = trpc.useUtils();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async ({ password }: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        toast.error("Incorrect password. Please try again.");
        return;
      }

      // Invalidate the auth cache so the Dashboard can load
      await utils.auth.me.invalidate();
      window.location.href = "/";
    } catch {
      toast.error("Login failed. Is the server running?");
    } finally {
      setLoading(false);
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
        {/* Logo area */}
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
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
            style={{
              background: "var(--tec-purple, #4a2878)",
              color: "#fff",
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin mr-2" />
            ) : null}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
