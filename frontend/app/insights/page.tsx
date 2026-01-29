"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { MapPanel } from "@/components/MapPanel";
import { fetchHcps, fetchInsights, nl2sql } from "@/lib/api";
import { hcpToCoordinates } from "@/lib/geo";
import { Hcp } from "@/lib/types";

export default function InsightsPage() {
  const [question, setQuestion] = useState("Show top specialties by volume");
  const [nlResult, setNlResult] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [hcps, setHcps] = useState<Hcp[]>([]);

  useEffect(() => {
    fetchInsights()
      .then(setInsights)
      .catch(() => setInsights(null));
    fetchHcps().then(setHcps).catch(() => setHcps([]));
  }, []);

  const riskMarkers = useMemo(() => {
    if (!insights || hcps.length === 0) return [];
    const lookup = new Map(hcps.map((hcp) => [hcp.id, hcp]));
    return insights.competitor_risk
      .map((item: any) => lookup.get(item.hcp_id))
      .filter(Boolean)
      .map((hcp: Hcp) => ({
        id: hcp.id,
        name: `${hcp.first_name} ${hcp.last_name}`,
        coordinates: hcpToCoordinates(hcp)
      }));
  }, [insights, hcps]);

  const handleAsk = async () => {
    const result = await nl2sql({ question });
    setNlResult(result);
  };

  return (
    <AppShell
      step="prepare"
      title="Territory Insights"
      subtitle="Talk to my territory with safe NL-to-SQL and manager KPIs."
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <DashboardCard title="Talk to my territory" subtitle="Natural language input">
          <div className="space-y-3">
            <input
              placeholder="e.g. Show BPCO growth opportunities in Lyon"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              onClick={handleAsk}
              className="rounded-full bg-airnavy px-5 py-2 text-xs font-semibold text-white"
            >
              Analyze
            </button>
          </div>
        </DashboardCard>

        <DashboardCard title="Results" subtitle="SQL + table view">
          {!nlResult ? (
            <p className="text-sm text-slate-500">Run a question to see results.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              <p className="text-xs text-slate-400">SQL: {nlResult.sql}</p>
              <p className="text-xs text-slate-400">Hint: {nlResult.chart_hint}</p>
              <pre className="rounded-2xl bg-slate-50 p-3 text-xs">
                {JSON.stringify(nlResult.rows, null, 2)}
              </pre>
            </div>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Manager KPIs" subtitle="Monthly pulse">
          {insights ? (
            <div className="grid gap-3 text-sm text-slate-600">
              <p>Visits/month: {insights.kpis.visits_per_month}</p>
              <p>Coverage (60d): {insights.kpis.coverage_pct}%</p>
              <p>Overdue actions: {insights.kpis.overdue_actions}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading KPIs...</p>
          )}
        </DashboardCard>

        <DashboardCard title="Top opportunities" subtitle="Vingtiles leaders">
          {insights ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.top_opportunities}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="vingtiles" fill="#2A6CF4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading opportunities...</p>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <DashboardCard title="Competitor risk heatmap" subtitle="Recent mentions">
          <MapPanel markers={riskMarkers} />
        </DashboardCard>
        <DashboardCard title="Filters" subtitle="Apply segments">
          <div className="space-y-2 text-sm text-slate-600">
            <p>Specialty, channel, city, KOL filters are supported via API.</p>
            <p>Use them to refine the KPI dashboard and risk map.</p>
          </div>
        </DashboardCard>
      </div>
    </AppShell>
  );
}
