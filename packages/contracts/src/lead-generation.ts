/** Backend contract. Campaign service must deduplicate the delivery key within a workspace. */
export type LeadEvidence = { field: string; value: string; source_url: string; quote: string };
export type BusinessInput = {
  name: string;
  website: string;
  description: string;
  offerings: string[];
  target_categories: string[];
  locations: string[];
};
export type LeadRunInput = {
  categories: string[];
  location?: string;
  company_size?: string;
  contact_role?: string;
  instructions?: string;
  excluded_domains: string[];
  required_contact: "none" | "email" | "phone";
  target_count: number;
  campaign_id?: string;
};
export type LeadPolicy = {
  enabled: boolean;
  subscription_limits_enabled: boolean;
  max_categories: number;
  max_queued_runs: number;
  max_active_tasks: number;
  daily_runs: number;
  daily_units: number;
  daily_tokens: number;
  scheduling_weight: number;
  max_rounds: number;
  max_candidates: number;
  max_target_count: number;
  run_deadline_seconds: number;
  request_rate_per_minute: number;
  min_fit_score: number;
};
export type CampaignLeadDelivery = {
  schema_version: 1;
  idempotency_key: string;
  workspace_id: string;
  campaign_id: string;
  run_id: string;
  lead_id: string;
  lead: {
    data_origin?: "demo" | "live";
    company_name: string;
    website: string;
    category: string;
    location: string | null;
    company_size?: string | null;
    contact_role?: string | null;
    email: string | null;
    phone: string | null;
    summary: string;
    fit_score: number;
    fit_reasons: string[];
    reject_reasons?: string[];
    evidence: LeadEvidence[];
    discovered_fields?: Record<string, string>;
    checked_at: string;
    outreach_eligible: false;
  };
};

/** Staff-facing shapes for lead-generation profile / runs (gateway responses). */
export type LeadGenerationResearchStatus =
  | "idle"
  | "queued"
  | "running"
  | "ready"
  | "failed"
  | string;

export type LeadGenerationProfile = {
  id?: string;
  version?: number;
  research_status?: LeadGenerationResearchStatus;
  supplied?: BusinessInput;
  researched?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type LeadGenerationRunSummary = {
  id: string;
  status: string;
  accepted?: number;
  errors?: number;
  rounds?: number;
  stop_reason?: string | null;
  brief?: LeadRunInput;
  deadline_at?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type LeadGenerationRunCreateResponse = {
  run: LeadGenerationRunSummary;
  deduplicated?: boolean;
};

export type LeadGenerationCandidateResult = {
  id: string;
  status: string;
  assessment?: CampaignLeadDelivery["lead"] | null;
  [key: string]: unknown;
};

export type LeadGenerationDeliveryTask = {
  id: string;
  state: string;
  attempts?: number;
  error_code?: string | null;
  result?: Record<string, unknown> | null;
  [key: string]: unknown;
};

export type LeadGenerationCursorPage<T> = {
  items: T[];
  next_cursor: string | null;
};
