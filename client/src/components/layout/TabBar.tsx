import { useUIStore, type TabId } from "@/store/useUIStore";
import { useReportStore } from "@/store/useReportStore";
import {
  LayoutDashboard, Banknote, PiggyBank, Users, Building2,
  Receipt, Package, TrendingUp, CreditCard, Zap,
  AlertTriangle, FileText, Settings,
} from "lucide-react";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  hasData?: boolean;
}

export function TabBar() {
  const { activeTab, setActiveTab } = useUIStore();
  const { balanceSheet, profitLoss, arAging, apAging, vatSummary, profitFirst, alerts } = useReportStore();

  const criticalCount = alerts.filter(a => a.level === 'critical' && !a.resolved).length;

  const tabs: Tab[] = [
    { id: 'overview',      label: 'Overview',       icon: <LayoutDashboard size={14} />, hasData: !!(balanceSheet || profitLoss) },
    { id: 'cash',          label: 'Cash Position',  icon: <Banknote size={14} />,        hasData: !!balanceSheet },
    { id: 'profit-first',  label: 'Profit First',   icon: <PiggyBank size={14} />,       hasData: !!profitFirst },
    { id: 'ar-aging',      label: 'A/R Aging',      icon: <Users size={14} />,           hasData: !!arAging },
    { id: 'ap-aging',      label: 'A/P Aging',      icon: <Building2 size={14} />,       hasData: !!apAging },
    { id: 'vat',           label: 'VAT Forensics',  icon: <Receipt size={14} />,         hasData: !!vatSummary },
    { id: 'inventory',     label: 'Inventory',      icon: <Package size={14} />,         hasData: false },
    { id: 'real-revenue',  label: 'Real Revenue',   icon: <TrendingUp size={14} />,      hasData: !!profitLoss },
    { id: 'debt-service',  label: 'Debt Service',   icon: <CreditCard size={14} />,      hasData: false },
    { id: 'stress-test',   label: 'Stress Test',    icon: <Zap size={14} />,             hasData: true },
    { id: 'alerts',        label: criticalCount > 0 ? `Alerts (${criticalCount})` : 'Alerts', icon: <AlertTriangle size={14} />, hasData: alerts.length > 0 },
    { id: 'reports',       label: 'Reports',        icon: <FileText size={14} />,        hasData: false },
    { id: 'settings',      label: 'Settings',       icon: <Settings size={14} />,        hasData: false },
  ];

  return (
    <div
      className="sticky top-[57px] z-40 border-b"
      style={{
        background: "var(--tec-purple-deep)",
        borderColor: "oklch(40% 0.12 310 / 0.5)",
      }}
    >
      <div className="flex overflow-x-auto tab-bar-scroll px-2">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const isAlerts = tab.id === 'alerts';
          const hasAlert = isAlerts && criticalCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all relative shrink-0"
              style={{
                color: isActive
                  ? "var(--tec-gold-light)"
                  : hasAlert
                  ? "oklch(75% 0.12 25)"
                  : "oklch(75% 0.05 300)",
                borderBottom: isActive
                  ? "2px solid var(--tec-gold)"
                  : "2px solid transparent",
                background: isActive ? "oklch(30% 0.14 310 / 0.4)" : "transparent",
                marginBottom: "-1px",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.7 }}>{tab.icon}</span>
              {tab.label}
              {tab.hasData && !isActive && (
                <span
                  className="w-1 h-1 rounded-full absolute top-2 right-1"
                  style={{ background: "var(--tec-gold)" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
