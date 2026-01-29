export interface Hcp {
  id: string;
  last_name: string;
  first_name: string;
  specialty_label?: string | null;
  specialty_code?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  sector?: string | null;
  activity?: string | null;
  preferred_channel?: string | null;
  kol: boolean;
  un_liters: number;
  vingtiles: number;
  source_sheet: string;
}

export interface Recommendation {
  hcp_id: string;
  score: number;
  top_factors: string[];
  component_scores?: Record<string, number>;
}

export interface ToolTraceEntry {
  tool_name: string;
  status: string;
  elapsed_ms: number;
  short_result_preview: string;
}

export interface PrebriefResponse {
  hcp_snapshot: {
    name: string;
    specialty?: string | null;
    city?: string | null;
    preferred_channel?: string | null;
    kol: boolean;
    un_liters: number;
    vingtiles: number;
    sector?: string | null;
  };
  last_interactions_summary: string;
  suggested_objectives: string[];
  battlecard: {
    air_liquide: string;
    competitor: string;
    win_themes: string;
  };
  evidence_highlights: { snippet: string; source: string }[];
  news_highlights: { title: string; source: string; date: string; summary: string }[];
  next_best_actions: string[];
  tool_trace: ToolTraceEntry[];
  compliance_status: string;
  compliance_issues: string[];
}

export interface PitchResponse {
  pitch_text: string;
  sections: {
    opening?: string;
    technical?: string;
    objections?: string;
    closing?: string;
  };
  compliance_status: string;
  compliance_issues: string[];
  tool_trace: ToolTraceEntry[];
}

export interface Timeline {
  visits: {
    id: string;
    date: string;
    duration_min: number;
    outcome: string;
    next_action_due?: string | null;
    channel_used: string;
  }[];
  notes: {
    id: string;
    date: string;
    note_text: string;
    tags_json: string;
    competitor_mentioned_bool: boolean;
  }[];
}
