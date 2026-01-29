"use client";

import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { MapPanel } from "@/components/MapPanel";
import { fetchHcps, fetchRecommendations } from "@/lib/api";
import { hcpToCoordinates } from "@/lib/geo";
import { Hcp, Recommendation } from "@/lib/types";

const demoScenarios = [
  { label: "Loyal prescriber", hint: "High cadence, strong adherence" },
  { label: "Competitor-risk prescriber", hint: "Recent competitor mention" },
  { label: "Young graduate / high potential", hint: "High growth profile" }
];

interface RecommendationView {
  hcp: Hcp;
  recommendation: Recommendation;
}

export default function TodayPage() {
  const [hcps, setHcps] = useState<Hcp[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filters, setFilters] = useState({
    specialty: "",
    kol: "",
    channel: "",
    city: "",
    visitedSince: ""
  });
  const [scenario, setScenario] = useState(demoScenarios[0].label);

  useEffect(() => {
    Promise.all([fetchHcps(), fetchRecommendations(10)])
      .then(([hcpData, recs]) => {
        setHcps(hcpData);
        setRecommendations(recs);
      })
      .catch(() => {
        setHcps([]);
        setRecommendations([]);
      });
  }, []);

  const merged = useMemo(() => {
    const lookup = new Map(hcps.map((hcp) => [hcp.id, hcp]));
    return recommendations
      .map((rec) => ({ hcp: lookup.get(rec.hcp_id), recommendation: rec }))
      .filter((item): item is RecommendationView => Boolean(item.hcp));
  }, [hcps, recommendations]);

  const filtered = useMemo(() => {
    return merged.filter(({ hcp }) => {
      if (filters.specialty && hcp.specialty_label !== filters.specialty) return false;
      if (filters.kol) {
        const target = filters.kol === "yes";
        if (hcp.kol !== target) return false;
      }
      if (filters.channel && hcp.preferred_channel !== filters.channel) return false;
      if (filters.city) {
        const needle = filters.city.toLowerCase();
        if (!hcp.city?.toLowerCase().includes(needle) && !hcp.postal_code?.includes(needle)) {
          return false;
        }
      }
      return true;
    });
  }, [merged, filters]);

  const markers = filtered.map(({ hcp }) => ({
    id: hcp.id,
    name: `${hcp.first_name} ${hcp.last_name}`,
    coordinates: hcpToCoordinates(hcp)
  }));

  const primaryHcpId = filtered[0]?.hcp.id;

  return (
    <AppShell
      step="prepare"
      title="Today — Prepare"
      subtitle="Next Best Visits with explainable scoring, ready for iPad sales calls."
    >
      <div className="grid gap-6 xl:grid-cols-[2.2fr_1fr]">
        <DashboardCard title="Next Best Visits" subtitle="Top 10 priority list">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <select
              className="rounded-full border border-slate-200 bg-white px-3 py-2"
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
            >
              {demoScenarios.map((demo) => (
                <option key={demo.label} value={demo.label}>
                  {demo.label}
                </option>
              ))}
            </select>
            <span className="text-slate-500">
              {demoScenarios.find((demo) => demo.label === scenario)?.hint}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              placeholder="Specialty"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={filters.specialty}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, specialty: event.target.value }))
              }
            />
            <input
              placeholder="Preferred channel"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={filters.channel}
              onChange={(event) => setFilters((prev) => ({ ...prev, channel: event.target.value }))}
            />
            <input
              placeholder="City or postal"
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={filters.city}
              onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
            />
            <select
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              value={filters.kol}
              onChange={(event) => setFilters((prev) => ({ ...prev, kol: event.target.value }))}
            >
              <option value="">KOL status</option>
              <option value="yes">KOL only</option>
              <option value="no">Exclude KOL</option>
            </select>
          </div>

          <div className="mt-6 space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500">
                Load the backend to populate recommendations.
              </p>
            ) : (
              filtered.map(({ hcp, recommendation }, index) => (
                <div
                  key={hcp.id}
                  className="glass-card flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-airnavy">
                      #{index + 1} {hcp.first_name} {hcp.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {hcp.specialty_label ?? "—"} · {hcp.city ?? ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recommendation.top_factors.map((factor) => (
                        <span key={factor} className="chip">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-airmint/10 px-3 py-1 text-xs font-semibold text-airmint">
                      Score {recommendation.score}
                    </span>
                    <a
                      href={`/hcp/${hcp.id}`}
                      className="rounded-full bg-airnavy px-4 py-2 text-xs font-semibold text-white"
                    >
                      View HCP
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-slate-500">{filtered.length} HCPs in focus</p>
            <a
              href={primaryHcpId ? `/prebrief?hcp=${primaryHcpId}` : "/prebrief"}
              className="rounded-full bg-orange-500 px-5 py-2 text-xs font-semibold text-white"
            >
              Generate Pre-Brief
            </a>
          </div>
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard title="Territory Map" subtitle="Mini view of priority HCPs">
            <MapPanel markers={markers} />
          </DashboardCard>
          <DashboardCard title="Preparation Checklist" subtitle="Before the visit">
            <ul className="space-y-3 text-sm text-slate-600">
              <li>✔️ Review latest oxygen therapy outcomes</li>
              <li>✔️ Prepare compliant messaging checklist</li>
              <li>✔️ Align on patient onboarding resources</li>
            </ul>
          </DashboardCard>
        </div>
      </div>
    </AppShell>
  );
}
