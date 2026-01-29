"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { DashboardCard } from "@/components/DashboardCard";
import { afterVisitReport, pushCrm, transcribeAudio } from "@/lib/api";

export default function AfterVisitPage() {
  const searchParams = useSearchParams();
  const hcpId = searchParams.get("hcp") ?? "";
  const [transcript, setTranscript] = useState("");
  const [anonymized, setAnonymized] = useState("");
  const [showAnonymized, setShowAnonymized] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [status, setStatus] = useState("Ready");
  const [compliance, setCompliance] = useState<{ status: string; issues: string[] } | null>(null);
  const [diffPreview, setDiffPreview] = useState<any>(null);

  const handleTranscribe = async (file?: File) => {
    setStatus("Transcribing...");
    const form = new FormData();
    if (file) {
      form.append("file", file);
    } else {
      form.append("fallback_text", transcript);
    }
    const result = await transcribeAudio(form);
    setTranscript(result.transcript_text);
    setStatus(result.used_fallback ? "Fallback transcript" : "Transcribed");
  };

  const handleGenerateReport = async () => {
    if (!hcpId || !transcript) return;
    setStatus("Extracting report...");
    const response = await afterVisitReport({ hcp_id: hcpId, transcript_text: transcript });
    setAnonymized(response.anonymization.after);
    setReport(response.report);
    setCompliance({ status: response.compliance_status, issues: response.compliance_issues });
    setStatus("Report ready");
  };

  const handlePushCrm = async () => {
    if (!hcpId || !report) return;
    const payload = {
      hcp_id: hcpId,
      outcome: "Needs follow-up",
      channel_used: report.follow_up_channel ?? "Email",
      note_text: transcript
    };
    const response = await pushCrm(payload);
    setDiffPreview(response.diff_preview);
  };

  return (
    <AppShell
      step="follow"
      title="After Visit — Follow"
      subtitle="Capture outcomes, transcribe audio, and push compliant updates."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <DashboardCard title="Record or Upload" subtitle="Voice memo & files">
          <div className="space-y-4 text-sm text-slate-600">
            <input
              type="file"
              accept="audio/*"
              onChange={(event) => handleTranscribe(event.target.files?.[0])}
              className="w-full rounded-2xl border border-dashed border-slate-200 p-4"
            />
            <textarea
              className="h-24 w-full rounded-2xl border border-slate-200 p-3 text-sm"
              placeholder="Fallback transcript text (if no audio)"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
            />
            <button
              onClick={() => handleTranscribe()}
              className="rounded-full bg-airnavy px-4 py-2 text-xs font-semibold text-white"
            >
              Use text fallback
            </button>
            <p className="text-xs text-slate-400">Status: {status}</p>
          </div>
        </DashboardCard>

        <DashboardCard title="Transcription" subtitle="Anonymization">
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Transcript</p>
              <button
                className="text-xs font-semibold text-airblue"
                onClick={() => setShowAnonymized((prev) => !prev)}
              >
                {showAnonymized ? "Show original" : "Show anonymized"}
              </button>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p>{showAnonymized ? anonymized || transcript : transcript}</p>
            </div>
            <button
              onClick={handleGenerateReport}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white"
            >
              Generate report
            </button>
          </div>
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Extracted report" subtitle="Structured fields">
          {!report ? (
            <p className="text-sm text-slate-500">Generate a report to view structured fields.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              <ul className="list-disc pl-4">
                {report.summary_bullets?.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p>Pain points: {report.pain_points?.join(", ")}</p>
              <p>Objections: {report.objections?.join(", ")}</p>
              <p>Competitors: {report.competitor_mentions?.join(", ")}</p>
              <p>Follow-up channel: {report.follow_up_channel}</p>
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Compliance badge" subtitle="Always visible">
          {compliance ? (
            <div className="space-y-3 text-sm text-slate-600">
              <p>Status: {compliance.status}</p>
              {compliance.issues.length ? (
                compliance.issues.map((issue) => <p key={issue}>{issue}</p>)
              ) : (
                <p>No issues detected.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Compliance status pending.</p>
          )}
        </DashboardCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Push to CRM (demo)" subtitle="Preview diff">
          <button
            onClick={handlePushCrm}
            className="rounded-full bg-airnavy px-4 py-2 text-xs font-semibold text-white"
          >
            Push to CRM
          </button>
          {diffPreview ? (
            <pre className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              {JSON.stringify(diffPreview, null, 2)}
            </pre>
          ) : (
            <p className="mt-3 text-xs text-slate-500">No diff preview yet.</p>
          )}
        </DashboardCard>

        <DashboardCard title="Next steps" subtitle="Action plan">
          <div className="space-y-3 text-sm text-slate-600">
            <p>✔️ Review compliance output</p>
            <p>✔️ Confirm push to CRM</p>
            <p>✔️ Schedule follow-up</p>
          </div>
        </DashboardCard>
      </div>
    </AppShell>
  );
}
