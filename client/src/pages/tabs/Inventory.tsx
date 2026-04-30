import { useReportStore } from "@/store/useReportStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency } from "@/lib/formatters";
import { Package } from "lucide-react";
import { CLIENT_CONFIG } from "../../../../shared/config/caulsConfig";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// Demo data for when no inventory report is loaded
const DEMO_LOCATIONS = CLIENT_CONFIG.locations.map((loc, i) => ({
  location: loc,
  value: [185000, 142000, 95000][i] ?? 0,
  units: [1240, 980, 620][i] ?? 0,
  gmroi: [2.1, 1.3, 0.0][i] ?? 0,
  daysCover: [28, 35, 0][i] ?? 0,
  turnover: [13, 10, 0][i] ?? 0,
}));

export function Inventory() {
  const { } = useReportStore();

  // Use demo data since inventory parsing requires custom integration
  const locations = DEMO_LOCATIONS;
  const totalValue = locations.reduce((s, l) => s + l.value, 0);

  const gmroiData = locations.map(l => ({
    name: l.location,
    GMROI: l.gmroi,
    threshold: CLIENT_CONFIG.ratioThresholds.gmroi.healthy,
  }));

  const daysCoverData = locations.filter(l => l.daysCover > 0).map(l => ({
    name: l.location,
    'Days Cover': l.daysCover,
  }));

  const gmroiStatus = (v: number) => v >= 2.0 ? 'healthy' : v >= 1.5 ? 'warning' : 'critical';

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg px-4 py-2.5 text-xs border flex items-center gap-2"
        style={{ background: "oklch(96% 0.02 240)", borderColor: "oklch(85% 0.06 240)", color: "oklch(40% 0.10 240)" }}
      >
        <Package size={12} />
        Inventory data shown is illustrative. Upload a Vend/POS inventory export or QBO inventory report to populate with live data.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Total Inventory Value" value={formatCurrency(totalValue, true)} status="neutral" icon={<Package size={18} />} />
        <KPICard title="Locations" value={String(locations.length)} status="neutral" />
        <KPICard
          title="Avg GMROI"
          value={`${(locations.filter(l => l.gmroi > 0).reduce((s, l) => s + l.gmroi, 0) / locations.filter(l => l.gmroi > 0).length || 0).toFixed(2)}x`}
          status={locations.some(l => l.gmroi > 0 && l.gmroi < 1.5) ? 'warning' : 'healthy'}
          subtitle="Target: > 2.0x"
        />
        <KPICard
          title="Warehouse Turnover"
          value={locations.find(l => /warehouse/i.test(l.location))?.turnover === 0 ? "0x" : `${locations.find(l => /warehouse/i.test(l.location))?.turnover ?? 0}x`}
          status={locations.find(l => /warehouse/i.test(l.location))?.turnover === 0 ? 'critical' : 'healthy'}
          subtitle="Zero = no sell-through"
        />
      </div>

      {/* Location table */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Inventory by Location
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                {['Location', 'Value', 'Units', 'GMROI', 'Days Cover', 'Turnover'].map(h => (
                  <th key={h} className={`py-2 px-3 text-xs font-semibold ${h === 'Location' ? 'text-left' : 'text-right'}`}
                    style={{ color: "oklch(55% 0.06 300)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3 font-medium">{loc.location}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(loc.value)}</td>
                  <td className="py-2 px-3 text-right">{loc.units.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right">
                    <span style={{ color: loc.gmroi === 0 ? "oklch(60% 0.05 300)" : loc.gmroi >= 2 ? "var(--tec-green)" : loc.gmroi >= 1.5 ? "var(--tec-amber)" : "var(--tec-red)" }}>
                      {loc.gmroi === 0 ? "—" : `${loc.gmroi.toFixed(2)}x`}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">{loc.daysCover === 0 ? "—" : `${loc.daysCover}d`}</td>
                  <td className="py-2 px-3 text-right">{loc.turnover === 0 ? "—" : `${loc.turnover}x`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>GMROI by Location</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gmroiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}x`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
              <Bar dataKey="GMROI" radius={[4, 4, 0, 0]}>
                {gmroiData.map((entry, i) => (
                  <Cell key={i} fill={entry.GMROI === 0 ? "oklch(80% 0.05 300)" : entry.GMROI >= 2 ? "var(--tec-green)" : entry.GMROI >= 1.5 ? "var(--tec-amber)" : "var(--tec-red)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {daysCoverData.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>Days Cover by Location</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={daysCoverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}d`} />
                <Tooltip formatter={(v: number) => `${v} days`} />
                <Bar dataKey="Days Cover" fill="var(--tec-purple)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
