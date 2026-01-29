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
