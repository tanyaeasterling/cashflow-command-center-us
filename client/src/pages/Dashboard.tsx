import { useAuth } from "@/_core/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { TabBar } from "@/components/layout/TabBar";
import { LoadedFilesBar } from "@/components/layout/LoadedFilesBar";
import { useUIStore } from "@/store/useUIStore";
import { Loader2 } from "lucide-react";
import Login from "./Login";

// Tab components
import { Overview } from "./tabs/Overview";
import { CashPosition } from "./tabs/CashPosition";
import { ProfitFirst } from "./tabs/ProfitFirst";
import { ARaging } from "./tabs/ARaging";
import { APaging } from "./tabs/APaging";
import { VATForensics } from "./tabs/VATForensics";
import { Inventory } from "./tabs/Inventory";
import { RealRevenue } from "./tabs/RealRevenue";
import { DebtService } from "./tabs/DebtService";
import { StressTest } from "./tabs/StressTest";
import { AlertsTab } from "./tabs/AlertsTab";
import { Reports } from "./tabs/Reports";
import { Settings } from "./tabs/Settings";

function TabContent() {
  const { activeTab } = useUIStore();

  switch (activeTab) {
    case 'overview':     return <Overview />;
    case 'cash':         return <CashPosition />;
    case 'profit-first': return <ProfitFirst />;
    case 'ar-aging':     return <ARaging />;
    case 'ap-aging':     return <APaging />;
    case 'vat':          return <VATForensics />;
    case 'inventory':    return <Inventory />;
    case 'real-revenue': return <RealRevenue />;
    case 'debt-service': return <DebtService />;
    case 'stress-test':  return <StressTest />;
    case 'alerts':       return <AlertsTab />;
    case 'reports':      return <Reports />;
    case 'settings':     return <Settings />;
    default:             return <Overview />;
  }
}

export default function Dashboard() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tec-purple-deep)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--tec-gold)" }} />
          <p className="text-sm" style={{ color: "oklch(75% 0.05 300)" }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(97% 0.005 300)" }}>
      <Header />
      <TabBar />
      <LoadedFilesBar />

      <main className="flex-1 p-4 md:p-6 max-w-[1400px] mx-auto w-full">
        <TabContent />
      </main>
    </div>
  );
}
