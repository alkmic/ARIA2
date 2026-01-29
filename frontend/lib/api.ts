import { Hcp, PitchResponse, PrebriefResponse, Recommendation, Timeline } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export async function fetchHcps(): Promise<Hcp[]> {
  const res = await fetch(`${API_BASE}/api/hcps`);
  if (!res.ok) throw new Error("Failed to load HCPs");
  return res.json();
}

export async function fetchRecommendations(limit = 10): Promise<Recommendation[]> {
  const res = await fetch(`${API_BASE}/api/recommendations/today?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to load recommendations");
  return res.json();
}

export async function fetchHcp(id: string): Promise<Hcp> {
  const res = await fetch(`${API_BASE}/api/hcps/${id}`);
  if (!res.ok) throw new Error("HCP not found");
  return res.json();
}

export async function fetchTimeline(id: string): Promise<Timeline> {
  const res = await fetch(`${API_BASE}/api/hcps/${id}/timeline`);
  if (!res.ok) throw new Error("Timeline not found");
  return res.json();
}

export async function fetchProducts(): Promise<
  { id: string; name: string; indications: string }[]
> {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
}

export async function savePitch(payload: {
  hcp_id: string;
  channel: string;
  length_label: string;
  word_limit: number;
  content_json: string;
}): Promise<{ id: string; message: string }> {
  const res = await fetch(`${API_BASE}/api/pitches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Pitch save failed");
  return res.json();
}

export async function fetchPrebrief(payload: {
  hcp_id: string;
  product_id: string;
  optional_context?: string;
}): Promise<PrebriefResponse> {
  const res = await fetch(`${API_BASE}/api/prebrief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Prebrief failed");
  return res.json();
}

export async function generatePitch(payload: {
  hcp_id: string;
  product_id: string;
  length: string;
  word_limit: number;
  tone: string;
  section_to_rewrite?: string;
}): Promise<PitchResponse> {
  const res = await fetch(`${API_BASE}/api/pitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Pitch generation failed");
  return res.json();
}

export async function transcribeAudio(payload: FormData): Promise<{
  transcript_text: string;
  used_fallback: boolean;
}> {
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: "POST",
    body: payload
  });
  if (!res.ok) throw new Error("Transcription failed");
  return res.json();
}

export async function afterVisitReport(payload: {
  hcp_id: string;
  transcript_text: string;
}): Promise<{
  anonymization: { before: string; after: string };
  report: {
    summary_bullets: string[];
    pain_points: string[];
    objections: string[];
    competitor_mentions: string[];
    actions: { task: string; due_date: string; owner: string }[];
    follow_up_channel: string;
  };
  compliance_status: string;
  compliance_issues: string[];
}> {
  const res = await fetch(`${API_BASE}/api/after_visit_report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("After visit report failed");
  return res.json();
}

export async function pushCrm(payload: {
  hcp_id: string;
  outcome: string;
  channel_used: string;
  note_text: string;
  next_action_due?: string;
}): Promise<{ status: string; diff_preview: { visit: any; note: any } }> {
  const res = await fetch(`${API_BASE}/api/crm/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("CRM push failed");
  return res.json();
}

export async function nl2sql(payload: {
  question: string;
}): Promise<{ sql: string; rationale_short: string; chart_hint: string; rows: any[] }> {
  const res = await fetch(`${API_BASE}/api/nl2sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("NL2SQL failed");
  return res.json();
}

export async function fetchInsights(params?: {
  specialty?: string;
  channel?: string;
  city?: string;
  kol?: boolean;
}): Promise<{
  kpis: { visits_per_month: number; coverage_pct: number; overdue_actions: number };
  top_opportunities: { hcp_id: string; name: string; vingtiles: number }[];
  competitor_risk: { hcp_id: string; date: string }[];
}> {
  const search = new URLSearchParams();
  if (params?.specialty) search.set("specialty", params.specialty);
  if (params?.channel) search.set("channel", params.channel);
  if (params?.city) search.set("city", params.city);
  if (params?.kol !== undefined) search.set("kol", String(params.kol));
  const res = await fetch(`${API_BASE}/api/insights?${search.toString()}`);
  if (!res.ok) throw new Error("Insights failed");
  return res.json();
}
