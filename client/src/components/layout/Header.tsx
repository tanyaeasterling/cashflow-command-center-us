import { useState } from "react";
import { Copy, Check, Calendar, LogOut, Menu } from "lucide-react";
import { CLIENT_CONFIG } from "../../../../shared/config/caulsConfig";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useUIStore } from "@/store/useUIStore";

export function Header() {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const logout = trpc.auth.logout.useMutation();
  const { setSidebarOpen, sidebarOpen } = useUIStore();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(CLIENT_CONFIG.schedulingLink);
      setCopied(true);
      toast.success("Scheduling link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.href = "/";
  };

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:px-6"
      style={{
        background: "var(--tec-purple-deep)",
        borderBottom: "2px solid var(--tec-gold)",
      }}
    >
      {/* Left: Logo + Client Badge */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden text-white/70 hover:text-white mr-1"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex flex-col">
          <span
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "var(--tec-gold)", letterSpacing: "0.12em" }}
          >
            Tanya Easterling Consulting
          </span>
          <span className="text-white font-semibold text-base leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Cashflow Command Center
          </span>
        </div>

        {/* Client badge */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{
            background: "oklch(30% 0.14 310 / 0.6)",
            border: "1px solid oklch(50% 0.15 310 / 0.5)",
            color: "oklch(90% 0.05 300)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          {CLIENT_CONFIG.clientName}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Scheduling link copy button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: copied ? "var(--tec-green)" : "oklch(50% 0.15 310 / 0.3)",
            color: "var(--tec-gold-light)",
            border: "1px solid oklch(55% 0.15 310 / 0.5)",
          }}
          title="Copy scheduling link"
        >
          {copied ? <Check size={13} /> : <Calendar size={13} />}
          <span className="hidden sm:inline">{copied ? "Copied!" : "Schedule"}</span>
        </button>

        {/* User info + logout */}
        {user && (
          <div className="flex items-center gap-2">
            <span className="hidden md:block text-xs text-white/60 max-w-[120px] truncate">
              {user.name ?? user.email}
            </span>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
