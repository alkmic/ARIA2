"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { DashboardCard } from "@/components/DashboardCard";
import { MapPanel } from "@/components/MapPanel";

interface Recommendation {
  hcp_id: string;
  score: number;
  top_factors: string[];
}

const potentialData = [
  { name: "Respiratory", value: 78 },
  { name: "Homecare", value: 64 },
  { name: "Oxygen", value: 52 }
];

export default function HomePage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/recommendations/today?limit=5")
      .then((res) => res.json())
      .then((data) => setRecommendations(data))
      .catch(() => setRecommendations([]));
  }, []);

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="ipad-frame px-8 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm uppercase tracking-[0.35em] text-white/70">Air Liquide Santé</p>
          <h1 className="mt-2 text-4xl font-semibold">
            ARIA — Air Liquide Intelligent Assistant
          </h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Live BPCO demo for Life Science sales reps. Prioritize next best visits with
            explainable scoring and omnichannel context.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-6xl px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-6 lg:grid-cols-[2fr_1fr]"
        >
          <div className="space-y-6">
            <DashboardCard title="Next best visits" subtitle="Explainable priority ranking">
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Connect the backend to load today&apos;s recommendations.
                  </p>
                ) : (
                  recommendations.map((rec, index) => (
                    <div
                      key={rec.hcp_id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-airnavy">
                            Priority #{index + 1}
                          </p>
                          <p className="text-xs text-slate-500">HCP ID {rec.hcp_id}</p>
                        </div>
                        <span className="rounded-full bg-airmint/10 px-3 py-1 text-sm font-semibold text-airmint">
                          Score {rec.score}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        {rec.top_factors.map((factor) => (
                          <li key={factor}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </DashboardCard>

            <DashboardCard title="BPCO portfolio momentum" subtitle="Sales-ready story">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={potentialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2A6CF4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>

          <div className="space-y-6">
            <DashboardCard title="Territory pulse" subtitle="Key accounts around France">
              <MapPanel />
            </DashboardCard>
            <DashboardCard title="Conversation summary" subtitle="Last 7 days">
              <div className="space-y-3 text-sm text-slate-600">
                <p>
                  28 visits completed · 12 remote follow-ups · 4 competitive mentions.
                </p>
                <div className="rounded-xl bg-airnavy/5 p-3 text-xs text-airnavy">
                  Top needs: patient onboarding, adherence support, and homecare
                  coordination.
                </div>
              </div>
            </DashboardCard>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
