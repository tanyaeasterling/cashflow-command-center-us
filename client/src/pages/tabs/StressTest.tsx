import { useState, useMemo } from "react";
import { useReportStore } from "@/store/useReportStore";
import { KPICard } from "@/components/ui/KPICard";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { Zap, AlertTriangle, CheckCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";

interface ScenarioParams {
  revenueChange: number;
  cogsChange: number;
  expenseChange: number;
  arCollectionDays: number;
  cashReserveMonths: number;
}

const DEFAULT_PARAMS: ScenarioParams = {
  revenueChange: 0,
  cogsChange: 0,
  expenseChange: 0,
  arCollectionDays: 45,
  cashReserveMonths: 3,
};

function SliderRow({
  label, value, min, max, step = 1, unit = '%', onChange,
  colorFn,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  colorFn?: (v: number) => string;
}) {
  const color = colorFn ? colorFn(value) : "var(--tec-purple)";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium" style={{ color: "var(--tec-purple-deep)" }}>{label}</label>
        <span className="text-sm font-bold" style={{ color }}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, oklch(88% 0.005 300) ${((value - min) / (max - min)) * 100}%, oklch(88% 0.005 300) 100%)`,
          accentColor: color,
        }}
      />
      <div className="flex justify-between text-xs" style={{ color: "oklch(65% 0.05 300)" }}>
        <span>{min}{unit}</span>
        <span>0{unit}</span>
        <span>+{max}{unit}</span>
      </div>
    </div>
  );
}

export function StressTest() {
  const { profitLoss, balanceSheet, arAging } = useReportStore();
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);

  const update = (key: keyof ScenarioParams) => (v: number) =>
    setParams(prev => ({ ...prev, [key]: v }));

  const results = useMemo(() => {
    const baseRevenue = profitLoss?.totalIncome ?? 150000;
    const baseCOGS = profitLoss?.totalCOGS ?? 90000;
    const baseExpenses = profitLoss?.totalExpenses ?? 40000;

    // FIXED: safe guard on currentAssets which may be undefined from parser
    const currentAssets = balanceSheet?.assets?.currentAssets ?? [];
    const baseCash = currentAssets.find(a => /cash/i.test(a.name))?.amount ?? 25000;

    const baseAR = arAging?.totals.total ?? 15000;

    const stressRevenue = baseRevenue * (1 + params.revenueChange / 100);
    const stressCOGS = baseCOGS * (1 + params.cogsChange / 100);
    const stressExpenses = baseExpenses * (1 + params.expenseChange / 100);
    const stressGrossProfit = stressRevenue - stressCOGS;
    const stressNetIncome = stressGrossProfit - stressExpenses;
    const stressGrossMargin = stressRevenue > 0 ? stressGrossProfit / stressRevenue : 0;
    const stressNetMargin = stressRevenue > 0 ? stressNetIncome / stressRevenue : 0;

    const monthlyBurn = (stressCOGS + stressExpenses) / 12;
    const arCollectionCash = baseAR * (45 / params.arCollectionDays);
    const effectiveCash = baseCash + arCollectionCash;
    const cashRunwayMonths = monthlyBurn > 0 ? effectiveCash / monthlyBurn : 99;
    const cashReserveTarget = monthlyBurn * params.cashReserveMonths;
    const cashSurplusDeficit = effectiveCash - cashReserveTarget;

    const pfProfit = stressRevenue * 0.05;
    const pfOwnerPay = stressRevenue * 0.35;
    const pfTax = stressRevenue * 0.15;
    const pfOpex = stressRevenue * 0.45;

    const scenarios = [
      { name: 'Base', revenue: baseRevenue, netIncome: profitLoss?.netIncome ?? 40000 },
      { name: 'Stress', revenue: stressRevenue, netIncome: stressNetIncome },
      { name: 'Best', revenue: baseRevenue * 1.2, netIncome: (baseRevenue * 1.2 - baseCOGS * 0.95 - baseExpenses * 0.95) },
    ];

    return {
      stressRevenue, stressCOGS, stressExpenses, stressGrossProfit, stressNetIncome,
      stressGrossMargin, stressNetMargin, cashRunwayMonths, cashReserveTarget,
      cashSurplusDeficit, pfProfit, pfOwnerPay, pfTax, pfOpex, scenarios,
      monthlyBurn, effectiveCash,
    };
  }, [params, profitLoss, balanceSheet, arAging]);

  const {
    stressRevenue, stressNetIncome, stressGrossMargin, stressNetMargin,
    cashRunwayMonths, cashSurplusDeficit, scenarios,
  } = results;

  const scenarioBarData = [
    { name: 'Revenue', Base: profitLoss?.totalIncome ?? 150000, Stress: stressRevenue },
    { name: 'Net Income', Base: profitLoss?.netIncome ?? 20000, Stress: stressNetIncome },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 border flex items-start gap-3"
        style={{ background: "oklch(22% 0.16 310)", borderColor: "oklch(35% 0.18 310)" }}
      >
        <Zap size={20} style={{ color: "var(--tec-gold)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--tec-gold-light)", fontFamily: "'DM Serif Display', serif" }}>
            Real-Time Stress Test Simulator
          </h3>
          <p className="text-xs mt-1" style={{ color: "oklch(75% 0.05 300)" }}>
            Adjust sliders to model revenue shocks, cost changes, and collection delays. All outputs update instantly.
            {!profitLoss && " Upload P&L for live data — currently using illustrative baseline."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-border p-5 shadow-sm space-y-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--tec-purple-deep)" }}>Scenario Parameters</h3>
          <SliderRow
            label="Revenue Change"
            value={params.revenueChange}
            min={-50} max={50}
            onChange={update('revenueChange')}
            colorFn={v => v >= 0 ? "var(--tec-green)" : "var(--tec-red)"}
          />
          <SliderRow
            label="COGS Change"
            value={params.cogsChange}
            min={-30} max={30}
            onChange={update('cogsChange')}
            colorFn={v => v <= 0 ? "var(--tec-green)" : "var(--tec-amber)"}
          />
          <SliderRow
            label="Operating Expense Change"
            value={params.expenseChange}
            min={-30} max={30}
            onChange={update('expenseChange')}
            colorFn={v => v <= 0 ? "var(--tec-green)" : "var(--tec-amber)"}
          />
          <SliderRow
            label="A/R Collection Days"
            value={params.arCollectionDays}
            min={30} max={120}
            unit=" days"
            onChange={update('arCollectionDays')}
            colorFn={v => v <= 45 ? "var(--tec-green)" : v <= 75 ? "var(--tec-amber)" : "var(--tec-red)"}
          />
          <SliderRow
            label="Cash Reserve Target"
            value={params.cashReserveMonths}
            min={1} max={6}
            unit=" mo"
            onChange={update('cashReserveMonths')}
            colorFn={() => "var(--tec-purple)"}
          />
          <button
            onClick={() => setParams(DEFAULT_PARAMS)}
            className="w-full py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{
              borderColor: "oklch(80% 0.05 300)",
              color: "oklch(55% 0.06 300)",
            }}
          >
            Reset to Baseline
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPICard
              title="Stress Revenue"
              value={formatCurrency(stressRevenue, true)}
              status={params.revenueChange >= 0 ? 'healthy' : params.revenueChange >= -20 ? 'warning' : 'critical'}
            />
            <KPICard
              title="Stress Net Income"
              value={formatCurrency(stressNetIncome, true)}
              status={stressNetIncome > 0 ? 'healthy' : 'critical'}
            />
            <KPICard
              title="Stress Gross Margin"
              value={formatPercent(stressGrossMargin)}
              status={stressGrossMargin >= 0.25 ? 'healthy' : stressGrossMargin >= 0.20 ? 'warning' : 'critical'}
            />
            <KPICard
              title="Cash Runway"
              value={cashRunwayMonths >= 99 ? "inf" : `${cashRunwayMonths.toFixed(1)} mo`}
              status={cashRunwayMonths >= 6 ? 'healthy' : cashRunwayMonths >= 3 ? 'warning' : 'critical'}
              subtitle={`Target: ${params.cashReserveMonths} months`}
            />
            <KPICard
              title="Cash Surplus / Deficit"
              value={formatCurrency(cashSurplusDeficit, true)}
              status={cashSurplusDeficit >= 0 ? 'healthy' : 'critical'}
            />
            <KPICard
              title="Stress Net Margin"
              value={formatPercent(stressNetMargin)}
              status={stressNetMargin > 0 ? 'healthy' : 'critical'}
            />
          </div>

          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--tec-purple-deep)" }}>
              Base vs Stress Scenario
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scenarioBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(92% 0.005 300)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v, true)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Base" fill="var(--tec-purple)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Stress" radius={[4, 4, 0, 0]}>
                  {scenarioBarData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.Stress < entry.Base ? "var(--tec-red)" : "var(--tec-green)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {stressNetIncome < 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border"
                style={{ background: "oklch(97% 0.02 25)", borderColor: "oklch(85% 0.08 25)" }}>
                <AlertTriangle size={14} style={{ color: "var(--tec-red)", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: "oklch(35% 0.12 25)" }}>
                  <strong>Net loss scenario:</strong> At {params.revenueChange}% revenue change, the business operates at a net loss of {formatCurrency(Math.abs(stressNetIncome))}. Immediate cost reduction or revenue recovery plan required.
                </p>
              </div>
            )}
            {cashRunwayMonths < 3 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border"
                style={{ background: "oklch(97% 0.02 25)", borderColor: "oklch(85% 0.08 25)" }}>
                <AlertTriangle size={14} style={{ color: "var(--tec-red)", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: "oklch(35% 0.12 25)" }}>
                  <strong>Cash runway critical:</strong> Only {cashRunwayMonths.toFixed(1)} months of operating cash. Accelerate A/R collections and review discretionary spending.
                </p>
              </div>
            )}
            {stressNetIncome > 0 && cashRunwayMonths >= 3 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border"
                style={{ background: "oklch(97% 0.02 155)", borderColor: "oklch(85% 0.08 155)" }}>
                <CheckCircle size={14} style={{ color: "var(--tec-green)", flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: "oklch(35% 0.12 155)" }}>
                  Business remains profitable under this scenario with {cashRunwayMonths.toFixed(1)} months cash runway.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
