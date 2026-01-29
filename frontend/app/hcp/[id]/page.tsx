"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { fetchHcp, fetchTimeline } from "@/lib/api";
import { Hcp, Timeline } from "@/lib/types";

interface PageProps {
  params: { id: string };
}

export default function HcpProfilePage({ params }: PageProps) {
  const [hcp, setHcp] = useState<Hcp | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  useEffect(() => {
    fetchHcp(params.id)
      .then(setHcp)
      .catch(() => setHcp(null));
    fetchTimeline(params.id)
      .then(setTimeline)
      .catch(() => setTimeline(null));
  }, [params.id]);

  return (
    <AppShell
      step="prepare"
      title="HCP Profile"
      subtitle="Snapshot insights, timeline, and next best action."
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <DashboardCard title="Snapshot" subtitle="Key attributes">
          {hcp ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold text-airnavy">
                  {hcp.first_name} {hcp.last_name}
                </h2>
                <p className="text-sm text-slate-500">
                  {hcp.specialty_label ?? "—"} · {hcp.city ?? ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="chip">Channel: {hcp.preferred_channel ?? "—"}</span>
                <span className="chip">Sector: {hcp.sector ?? "—"}</span>
                <span className="chip">UN liters: {hcp.un_liters}</span>
                <span className="chip">Vingtiles: {hcp.vingtiles}</span>
                {hcp.kol ? <span className="chip">KOL</span> : null}
              </div>
              <div className="flex gap-3">
                <a
                  href={`/prebrief?hcp=${hcp.id}`}
                  className="rounded-full bg-airnavy px-4 py-2 text-xs font-semibold text-white"
                >
                  Open Pre-Brief
                </a>
                <a
                  href={`/visit?hcp=${hcp.id}`}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-airnavy"
                >
                  Start Visit
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading HCP profile...</p>
          )}
        </DashboardCard>

        <DashboardCard title="Timeline" subtitle="Recent visits & notes">
          {!timeline ? (
            <p className="text-sm text-slate-500">Loading timeline...</p>
          ) : (
            <div className="space-y-4">
              {timeline.visits.slice(0, 4).map((visit) => (
                <div key={visit.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-airnavy">Visit · {visit.date}</p>
                  <p className="text-xs text-slate-500">
                    {visit.outcome} · {visit.channel_used} · {visit.duration_min} min
                  </p>
                  {visit.next_action_due ? (
                    <p className="text-xs text-orange-600">
                      Next action due {visit.next_action_due}
                    </p>
                  ) : null}
                </div>
              ))}
              {timeline.notes.slice(0, 3).map((note) => (
                <div key={note.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <p className="font-semibold text-airnavy">Conversation note</p>
                  <p className="text-xs text-slate-500">{note.note_text}</p>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>
    </AppShell>
  );
}
