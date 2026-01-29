import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";

export default function AfterVisitPage() {
  return (
    <AppShell
      step="follow"
      title="After Visit — Follow"
      subtitle="Capture outcomes, consent, and compliant follow-up artifacts."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DashboardCard title="Record or Upload" subtitle="Voice memo & files">
          <div className="space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
              <p className="font-semibold text-slate-700">Drop audio here</p>
              <p className="text-xs text-slate-400">or tap to start recording</p>
            </div>
            <label className="flex items-center gap-3 text-xs">
              <input type="checkbox" className="h-4 w-4" />
              Consent obtained for recording
            </label>
          </div>
        </DashboardCard>

        <DashboardCard title="Transcription" subtitle="Structured notes">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Transcription placeholder</p>
              <p>“Patient adherence discussed; follow-up required in 30 days.”</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-400">Structured fields</p>
              <p>Next action: Education kit · Competitor mention: none</p>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Compliance badge" subtitle="Review status">
          <div className="space-y-3 text-sm text-slate-600">
            <p>✔️ Claims verified</p>
            <p>✔️ Consent stored</p>
            <p>✔️ Follow-up task created</p>
          </div>
        </DashboardCard>
        <DashboardCard title="Next steps" subtitle="Sync to CRM">
          <div className="space-y-3 text-sm text-slate-600">
            <p>Send recap email</p>
            <p>Schedule next visit</p>
            <p>Update territory manager</p>
          </div>
        </DashboardCard>
      </div>
    </AppShell>
  );
}
