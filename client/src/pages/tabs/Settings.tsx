import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { CLIENT_CONFIG } from "../../../../shared/config/caulsConfig";
import { Settings as SettingsIcon, User, Shield, Building2, Bell, ExternalLink, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const ROLE_PERMISSIONS: Record<string, { label: string; permissions: string[] }> = {
  admin: {
    label: "Admin",
    permissions: ["Upload reports", "Download/export", "Run stress tests", "Manage alerts", "User management", "View all data"],
  },
  owner: {
    label: "Owner",
    permissions: ["Upload reports", "Download/export", "Run stress tests", "Manage alerts", "View all data"],
  },
  bookkeeper: {
    label: "Bookkeeper",
    permissions: ["Upload reports", "View all data"],
  },
  accountant: {
    label: "Accountant",
    permissions: ["Upload reports", "Download/export", "View all data"],
  },
};

function UserManagement() {
  const { data: userList, isLoading } = trpc.users.list.useQuery({ clientSlug: 'cauls' });
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => toast.success('Role updated'),
    onError: () => toast.error('Failed to update role'),
  });
  const utils = trpc.useUtils();

  const handleRoleChange = (userId: number, tecRole: 'admin' | 'owner' | 'bookkeeper' | 'accountant') => {
    updateRole.mutate(
      { userId, clientSlug: 'cauls', tecRole },
      { onSuccess: () => utils.users.list.invalidate() },
    );
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
        <Users size={15} />
        User Management
      </h3>
      {isLoading ? (
        <p className="text-sm" style={{ color: "oklch(55% 0.06 300)" }}>Loading users…</p>
      ) : (
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Name', 'Email', 'Last Sign In', 'TEC Role', ''].map(h => (
                  <th key={h} className="text-left py-2 text-xs font-semibold pr-4" style={{ color: "oklch(55% 0.06 300)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(userList ?? []).map(u => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium">{u.name ?? '—'}</td>
                  <td className="py-2 pr-4 text-xs" style={{ color: "oklch(55% 0.06 300)" }}>{u.email ?? '—'}</td>
                  <td className="py-2 pr-4 text-xs" style={{ color: "oklch(55% 0.06 300)" }}>
                    {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "oklch(93% 0.04 310)", color: "var(--tec-purple)" }}>
                      {u.tecRole}
                    </span>
                  </td>
                  <td className="py-2">
                    <select
                      className="text-xs border border-border rounded px-2 py-1"
                      defaultValue={u.tecRole}
                      onChange={e => handleRoleChange(u.id, e.target.value as 'admin' | 'owner' | 'bookkeeper' | 'accountant')}
                      style={{ color: "var(--tec-purple-deep)" }}
                    >
                      {['admin', 'owner', 'bookkeeper', 'accountant'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const [notifyOnUpload, setNotifyOnUpload] = useState(true);
  const [notifyOnAlert, setNotifyOnAlert] = useState(true);

  const userRole = (user?.role ?? 'user') as keyof typeof ROLE_PERMISSIONS;
  const roleInfo = ROLE_PERMISSIONS[userRole] ?? ROLE_PERMISSIONS.accountant;

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* User Profile */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
          <User size={15} />
          User Profile
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm" style={{ color: "oklch(55% 0.06 300)" }}>Name</span>
            <span className="text-sm font-medium" style={{ color: "var(--tec-purple-deep)" }}>{user?.name ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-sm" style={{ color: "oklch(55% 0.06 300)" }}>Email</span>
            <span className="text-sm font-medium" style={{ color: "var(--tec-purple-deep)" }}>{user?.email ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm" style={{ color: "oklch(55% 0.06 300)" }}>Role</span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: "oklch(93% 0.04 310)", color: "var(--tec-purple)" }}
            >
              {roleInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
          <Shield size={15} />
          Your Permissions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ROLE_PERMISSIONS).flatMap(([, r]) => r.permissions)
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(perm => {
              const hasPermission = roleInfo.permissions.includes(perm);
              return (
                <div key={perm} className="flex items-center gap-2 text-xs py-1">
                  <div
                    className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: hasPermission ? "var(--tec-green)" : "oklch(88% 0.005 300)" }}
                  >
                    {hasPermission && (
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1 3.5L3 5.5L6 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: hasPermission ? "var(--tec-purple-deep)" : "oklch(65% 0.05 300)" }}>
                    {perm}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Client Configuration */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
          <Building2 size={15} />
          Client Configuration
        </h3>
        <div className="space-y-2">
          {[
            { label: "Client Name", value: CLIENT_CONFIG.clientName },
            { label: "Currency", value: `${CLIENT_CONFIG.currency} (${CLIENT_CONFIG.currencySymbol})` },
            { label: "Fiscal Year Start", value: CLIENT_CONFIG.fiscalYearStart },
            { label: "Locations", value: CLIENT_CONFIG.locations.join(", ") },
            { label: "VAT Rate", value: "16%" },
            { label: "Gross Margin Target", value: `${(CLIENT_CONFIG.ratioThresholds.grossMargin.healthy * 100).toFixed(0)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-sm" style={{ color: "oklch(55% 0.06 300)" }}>{label}</span>
              <span className="text-sm font-medium" style={{ color: "var(--tec-purple-deep)" }}>{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs" style={{ color: "oklch(55% 0.06 300)" }}>
            Configuration is managed in <code className="px-1 py-0.5 rounded text-xs" style={{ background: "oklch(93% 0.04 310)", color: "var(--tec-purple)" }}>shared/config/caulsConfig.ts</code>.
            Contact your TEC administrator to update thresholds or add locations.
          </p>
        </div>
      </div>

      {/* Profit First Targets */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
          <SettingsIcon size={15} />
          Profit First Targets
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>Bucket</th>
                <th className="text-right py-2 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>Target %</th>
                <th className="text-left py-2 px-3 text-xs font-semibold" style={{ color: "oklch(55% 0.06 300)" }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CLIENT_CONFIG.profitFirstTargets).map(([name, config]) => (
                <tr key={name} className="border-b border-border/50">
                  <td className="py-1.5 font-medium">{name}</td>
                  <td className="py-1.5 text-right" style={{ color: "var(--tec-purple)" }}>{config.target}%</td>
                  <td className="py-1.5 px-3 text-xs" style={{ color: "oklch(55% 0.06 300)" }}>{config.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--tec-purple-deep)" }}>
          <Bell size={15} />
          Notification Preferences
        </h3>
        <div className="space-y-3">
          {[
            { label: "Notify on new report upload", value: notifyOnUpload, onChange: setNotifyOnUpload },
            { label: "Notify on new critical alert", value: notifyOnAlert, onChange: setNotifyOnAlert },
          ].map(({ label, value, onChange }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--tec-purple-deep)" }}>{label}</span>
              <button
                onClick={() => onChange(!value)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: value ? "var(--tec-purple)" : "oklch(80% 0.005 300)" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleSaveNotifications}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--tec-purple)", color: "oklch(97% 0.005 300)" }}
        >
          Save Preferences
        </button>
      </div>

      {/* User Management (admin only) */}
      {user?.role === 'admin' && <UserManagement />}

      {/* TEC Contact */}
      <div
        className="rounded-xl p-5 border"
        style={{ background: "oklch(22% 0.16 310)", borderColor: "oklch(35% 0.18 310)" }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--tec-gold-light)", fontFamily: "'DM Serif Display', serif" }}>
          Tanya Easterling Consulting
        </h3>
        <p className="text-xs mb-3" style={{ color: "oklch(75% 0.05 300)" }}>
          Questions about your financials? Schedule a review session with Tanya.
        </p>
        <a
          href={CLIENT_CONFIG.schedulingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: "var(--tec-gold)", color: "oklch(15% 0.05 75)" }}
        >
          <ExternalLink size={13} />
          Schedule a Session
        </a>
      </div>
    </div>
  );
}
