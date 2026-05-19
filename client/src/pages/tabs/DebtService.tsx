import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { CreditCard } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// CaulCo confirmed debt obligations (sourced from GDB loan doc No. 20252356 and Balance Sheet Mar 31, 2026)
// GDB Loan: Note Date May 15 2025, disbursed Oct 30 2025, 60-month term at 5.25%
// Co-op Bank vehicle loan for T1999 — monthly payment amount pending confirmation
// KPM ($591K) and AMC ($185K) are intercompany balances — excluded from debt service schedule
const DEMO_DEBTS = [
  { name: "GDB Loan – No. 20252356", balance: 470000, monthlyPayment: 9945, interestRate: 0.0525, remainingMonths: 54, type: "Term Loan" },
  { name: "Co-op Bank – Vehicle T1999", balance: 87030, monthlyPayment: 1800, interestRate: 0.065, remainingMonths: 52, type: "Vehicle" },
];

export function DebtService() {
  const { profitLoss, balanceSheet } = useReportStore();

  const totalDebt = DEMO_DEBTS.reduce((s, d) => s + d.balance, 0);
  const totalMonthly = DEMO_DEBTS.reduce((s, d) => s + d.monthlyPayment, 0);
  const annualDebtService = totalMonthly * 12;
  const ebitda = profitLoss ? profitLoss.netIncome + profitLoss.totalExpenses * 0.15 : 0;
  const dscr = ebitda > 0 ? ebitda / annualDebtService : null;
  const debtToEquity = balanceSheet ? totalDebt / Math.max(balanceSheet.equity.totalEquity, 1) : null;

  const chartData = DEMO_DEBTS.map(d => ({
    name: d.name.length > 18 ? d.name.slice(0, 18) + '…' : d.name,
    Balance: d.balance,
    Monthly: d.monthlyPayment,
  }));

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg px-4 py-2.5 text-xs border flex items-center gap-2"
        style={{ background: "oklch(96% 0.02 240)", borderColor: "oklch(85% 0.06 240)", color: "oklch(40% 0.10 240)" }}
      >
        <CreditCard size={12} />
        Debt schedule reflects confirmed obligations: GDB Loan No. 20252356 and Co-op Bank vehicle loan as of March 31, 2026. Co-op Bank monthly payment is estimated. KPM and AMC intercompany balances are excluded from debt service.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          title="Total Debt"
          value={formatCurrency(totalDebt, true)}
          status="neutral"
          icon={<CreditCard size={18} />}
        />
        <KPICard
          title="Monthly Debt Service"
          value={formatCurrency(totalMonthly, true)}
          status={totalMonthly > 5000 ? 'warning' : 'neutral'}
        />
        <KPICard
          title="DSCR"
          value={dscr !== null ? `${dscr.toFixed(2)}x` : "—"}
          subtitle="Target: > 1.25x"
          status={dscr === null ? 'neutral' : dscr >= 1.25 ? 'healthy' : dscr >= 1.0 ? 'warning' : 'critical'}
        />
        <KPICard
          title="Debt-to-Equity"
          value={debtToEquity !== null ? `${debtToEquity.toFixed(2)}x` : "—"}
          subtitle="Target: < 2.0x"
          status={debtToEquity === null ? 'neutral' : debtToEquity <= 2 ? 'healthy' : debtToEquity <= 3 ? 'warning' : 'critical'}
        />
      </div>

      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
          Debt Balance vs Monthly Payment
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatCurrency(v, true)} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="Balance" fill="var(--tec-purple)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Monthly" fill="var(--tec-gold)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--tec-purple-deep)" }}>
          Debt Schedule
        </h3>
        <div className="table-scroll-wrapper">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                {['Facility', 'Type', 'Balance', 'Monthly', 'Rate', 'Months Left'].map(h => (
                  <th key={h} className={`py-2 px-3 text-xs font-semibold ${h === 'Facility' ? 'text-left' : 'text-right'}`}
                    style={{ color: "oklch(55% 0.06 300)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_DEBTS.map((d, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30"
                  style={{ background: d.interestRate > 0.3 ? "oklch(98% 0.01 25)" : undefined }}>
                  <td className="py-2 px-3 font-medium">{d.name}</td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs"
                      style={{
                        background: d.type === 'MCA' ? "oklch(95% 0.04 25)" : "oklch(93% 0.04 310)",
                        color: d.type === 'MCA' ? "var(--tec-red)" : "var(--tec-purple)",
                      }}
                    >
                      {d.type}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">{formatCurrency(d.balance)}</td>
                  <td className="py-2 px-3 text-right">{formatCurrency(d.monthlyPayment)}</td>
                  <td className="py-2 px-3 text-right" style={{ color: d.interestRate > 0.3 ? "var(--tec-red)" : "inherit" }}>
                    {formatPercent(d.interestRate)}
                  </td>
                  <td className="py-2 px-3 text-right">{d.remainingMonths}</td>
                </tr>
              ))}
              <tr className="bg-muted/40 font-semibold border-t-2 border-border">
                <td className="py-2 px-3" colSpan={2}>TOTAL</td>
                <td className="py-2 px-3 text-right" style={{ color: "var(--tec-purple)" }}>{formatCurrency(totalDebt)}</td>
                <td className="py-2 px-3 text-right" style={{ color: "var(--tec-amber)" }}>{formatCurrency(totalMonthly)}</td>
                <td className="py-2 px-3 text-right" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
