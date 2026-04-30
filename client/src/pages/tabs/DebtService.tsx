import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { CreditCard, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// Demo debt schedule — in production this would come from a parsed report
const DEMO_DEBTS = [
  { name: "Business Loan – CIBC", balance: 125000, monthlyPayment: 3200, interestRate: 0.065, remainingMonths: 39, type: "Term Loan" },
  { name: "Line of Credit – RBC", balance: 45000, monthlyPayment: 900, interestRate: 0.085, remainingMonths: 60, type: "LOC" },
  { name: "Equipment Finance", balance: 28000, monthlyPayment: 750, interestRate: 0.072, remainingMonths: 37, type: "Equipment" },
  { name: "Merchant Cash Advance", balance: 18500, monthlyPayment: 2100, interestRate: 0.38, remainingMonths: 9, type: "MCA" },
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

  const mcaDebt = DEMO_DEBTS.find(d => d.type === 'MCA');

  return (
    <div className="space-y-6">
      <div
        className="rounded-lg px-4 py-2.5 text-xs border flex items-center gap-2"
        style={{ background: "oklch(96% 0.02 240)", borderColor: "oklch(85% 0.06 240)", color: "oklch(40% 0.10 240)" }}
      >
        <CreditCard size={12} />
        Debt schedule shown is illustrative. Upload a loan schedule or bank statement to populate with live data.
      </div>

      {/* MCA alert */}
      {mcaDebt && mcaDebt.interestRate > 0.3 && (
        <div
          className="rounded-xl p-4 border"
          style={{ background: "oklch(97% 0.02 25)", borderColor: "oklch(85% 0.08 25)" }}
        >
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--tec-red)" }}>
            <AlertTriangle size={14} />
            HIGH-COST DEBT: Merchant Cash Advance — {formatPercent(mcaDebt.interestRate)} effective rate
          </h3>
          <p className="text-sm" style={{ color: "oklch(40% 0.08 25)" }}>
            MCA at {formatPercent(mcaDebt.interestRate)} effective annual rate. Balance: {formatCurrency(mcaDebt.balance)}.
            Monthly payment: {formatCurrency(mcaDebt.monthlyPayment)}. Priority: refinance or pay off within {mcaDebt.remainingMonths} months.
          </p>
        </div>
      )}

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
