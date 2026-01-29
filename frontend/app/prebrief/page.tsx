"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { fetchPrebrief, fetchProducts } from "@/lib/api";
import { PrebriefResponse } from "@/lib/types";

export default function PrebriefPage() {
  const searchParams = useSearchParams();
  const hcpId = searchParams.get("hcp") ?? "";
  const [productId, setProductId] = useState<string>("");
  const [products, setProducts] = useState<{ id: string; name: string; indications: string }[]>(
    []
  );
  const [prebrief, setPrebrief] = useState<PrebriefResponse | null>(null);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    fetchProducts()
      .then((items) => {
        setProducts(items);
        if (items.length > 0) setProductId(items[0].id);
      })
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!hcpId || !productId) return;
    setStatus("Generating...");
    fetchPrebrief({ hcp_id: hcpId, product_id: productId })
      .then((data) => {
        setPrebrief(data);
        setStatus("Ready");
      })
      .catch(() => {
        setPrebrief(null);
        setStatus("Failed");
      });
  }, [hcpId, productId]);

  const complianceBadge = useMemo(() => {
    if (!prebrief) return "";
    return prebrief.compliance_status;
  }, [prebrief]);

  return (
    <AppShell
      step="prepare"
      title="Pre-Brief"
      subtitle="Synthèse instantanée pour démarrer la visite BPCO."
      toolTrace={prebrief?.tool_trace}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">{status}</span>
        </div>
        {complianceBadge ? (
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              complianceBadge === "PASS"
                ? "bg-emerald-100 text-emerald-700"
                : complianceBadge === "WARN"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-rose-100 text-rose-700"
            }`}
          >
            Compliance {complianceBadge}
          </span>
        ) : null}
      </div>

      {!prebrief ? (
        <DashboardCard title="Pre-Brief" subtitle="Awaiting data">
          <p className="text-sm text-slate-500">Select an HCP to generate the pre-brief.</p>
        </DashboardCard>
      ) : (
        <div className="space-y-6">
          <DashboardCard title="HCP Snapshot" subtitle="Key profile data">
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p>{prebrief.hcp_snapshot.name}</p>
              <p>{prebrief.hcp_snapshot.specialty}</p>
              <p>{prebrief.hcp_snapshot.city}</p>
              <p>Channel: {prebrief.hcp_snapshot.preferred_channel}</p>
              <p>UN liters: {prebrief.hcp_snapshot.un_liters}</p>
              <p>Vingtiles: {prebrief.hcp_snapshot.vingtiles}</p>
            </div>
          </DashboardCard>

          <DashboardCard title="Last interactions" subtitle="Visits + notes">
            <p className="text-sm text-slate-600">{prebrief.last_interactions_summary}</p>
          </DashboardCard>

          <DashboardCard title="Suggested objectives" subtitle="3 priority goals">
            <ul className="space-y-2 text-sm text-slate-600">
              {prebrief.suggested_objectives.map((objective) => (
                <li key={objective}>• {objective}</li>
              ))}
            </ul>
          </DashboardCard>

          <DashboardCard title="Battlecard" subtitle="Positioning summary">
            <div className="space-y-2 text-sm text-slate-600">
              <p>Air Liquide: {prebrief.battlecard.air_liquide}</p>
              <p>Competitor: {prebrief.battlecard.competitor}</p>
              <p>Win themes: {prebrief.battlecard.win_themes}</p>
            </div>
          </DashboardCard>

          <DashboardCard title="Evidence highlights" subtitle="Citations">
            <div className="space-y-3 text-sm text-slate-600">
              {prebrief.evidence_highlights.map((item) => (
                <div key={item.source} className="rounded-2xl bg-slate-50 p-3">
                  <p>{item.snippet}</p>
                  <p className="mt-2 text-xs text-slate-400">Source: {item.source}</p>
                </div>
              ))}
              {prebrief.news_highlights.length > 0 ? (
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-400">News</p>
                  {prebrief.news_highlights.map((news) => (
                    <p key={news.title} className="text-sm">
                      {news.title} — {news.source}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard title="Next best actions" subtitle="3 actionables">
            <ul className="space-y-2 text-sm text-slate-600">
              {prebrief.next_best_actions.map((action) => (
                <li key={action}>• {action}</li>
              ))}
            </ul>
            {prebrief.compliance_issues.length > 0 ? (
              <div className="mt-3 text-xs text-rose-600">
                {prebrief.compliance_issues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            ) : null}
          </DashboardCard>
        </div>
      )}
    </AppShell>
  );
}
