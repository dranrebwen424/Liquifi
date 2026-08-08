// ─── Roles & Account Status ─────────────────────────────────────────
export type Role = "admin" | "adviser" | "treasurer";

export type AccountStatus =
  | "pending_approval"
  | "active"
  | "deactivated"
  | "rejected";

// ─── Event Status ───────────────────────────────────────────────────
export type EventStatus = "open" | "archived";

// ─── Entry Status ───────────────────────────────────────────────────
export type EntryStatus =
  | "draft"
  | "ai_parsed"
  | "treasurer_reviewed"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "resubmitted"
  | "discarded"
  | "voided"
  | "deducted";

export type EntryType = "receipt" | "manual";

// ─── Report Status ──────────────────────────────────────────────────
export type ReportStatus =
  | "pending_adviser_approval"
  | "approved"
  | "rejected"
  | "cancelled";

// ─── DB Row Types (snake_case, matches Postgres columns) ────────────
export type Department = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
};

export type User = {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  role: Role;
  department_id: string | null;
  account_status: AccountStatus;
  approved_by: string | null;
  approved_at: string | null;
  otp_verified_at: string | null;
  created_at: string;
};

export type Event = {
  id: string;
  name: string;
  department_id: string;
  created_by: string;
  created_at: string;
  budget_total: number;
  status: EventStatus;
  archived_at: string | null;
  archived_by: string | null;
};

export type Entry = {
  id: string;
  event_id: string;
  created_by: string;
  created_at: string;
  type: EntryType;
  status: EntryStatus;
  amount: number;
  category: string | null;
  image_url: string | null;
  ocr_raw_json: Record<string, unknown> | null;
  document_type_raw: string | null;
  document_type_category: string | null;
  document_number: string | null;
  issue_date: string | null;
  issue_time: string | null;
  supplier_name: string | null;
  item_breakdown: Record<string, unknown> | null;
  form_payload_json: Record<string, unknown> | null;
  computed_breakdown_json: Record<string, unknown> | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
  causes_overspend: boolean;
  overspend_explanation: string | null;
  overspend_resolved_by: string | null;
  overspend_resolved_at: string | null;
};

export type Report = {
  id: string;
  event_id: string;
  generated_by: string;
  generated_at: string;
  fs_document_number: string;
  status: ReportStatus;
  rejection_reason: string | null;
  revision_count: number;
  pdf_url: string | null;
  signed_document_urls: string[] | null;
  signed_page_count: number | null;
  signing_confirmed_by: string | null;
  signing_confirmed_at: string | null;
  polygon_tx_hash: string | null;
};

export type ReportSignatory = {
  id: string;
  report_id: string;
  position: string;
  full_name: string;
  sort_order: number;
};

// ─── Client-side Report Flow Types ─────────────────────────────────
/** Signatory row as entered by the treasurer; `sort_order` is assigned server-side. */
export type ReportSignatoryRow = {
  position: string;
  full_name: string;
};

export type EntryComment = {
  id: string;
  entry_id: string;
  report_id: string;
  comment: string;
  created_by: string;
  created_at: string;
};

export type DepartmentReportCounter = {
  department_id: string;
  year: number;
  last_sequence_number: number;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  payload_json: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  keys_json: Record<string, unknown>;
};

export type AuditLog = {
  id: string;
  actor_id: string;
  department_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
};

// ─── Guard / Auth Context ───────────────────────────────────────────
export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  departmentId: string | null;
  accountStatus: AccountStatus;
};

export type GuardContext = {
  user: AuthUser | null;
  departmentId?: string;
};

export type PreconditionCheck = (ctx: GuardContext) => Promise<void> | void;

// ─── Derived (computed at query time, never stored) ─────────────────
/** budget_locked = EXISTS(entry WHERE event_id = X AND status = 'deducted') */
/** is_locked = EXISTS(report WHERE event_id = X AND status IN ('pending_adviser_approval','approved')) */
