import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";

export default function InsightsPage() {
  return (
    <AppShell
      step="prepare"
      title="Territory Insights"
      subtitle="Natural language queries with future analytics extensions."
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <DashboardCard title="Ask ARIA" subtitle="Natural language input">
          <div className="space-y-3">
            <input
              placeholder="e.g. Show BPCO growth opportunities in Lyon"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            />
            <button className="rounded-full bg-airnavy px-5 py-2 text-xs font-semibold text-white">
              Analyze
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Results" subtitle="Table + charts placeholder">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">Opportunity ranking table</div>
            <div className="rounded-2xl bg-slate-50 p-4">Chart placeholder</div>
          </div>
        </DashboardCard>
      </div>
    </AppShell>
  );
}
