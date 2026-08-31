import type { ElementType } from "react";
import {
  Landmark,
  FolderOpen,
  Receipt,
  FileText,
  UserCog,
  CircleCheckBig,
  CircleX,
  Clock,
  Info,
  CircleMinus,
  BadgeCheck,
} from "lucide-react";

// AudIT log presentation helpers — turn the raw stored `action` + `metadata_json`
// into a human-readable, compliance-friendly view ("who did what, and when").
// This is presentation only; the persisted audit_logs row is never changed.

export type AuditTone = "success" | "error" | "warning" | "info" | "neutral";

export type AuditView = {
  /** Noun phrase, e.g. "Entry confirmed" */
  label: string;
  /** Broader bucket used for filtering, e.g. "Reports" */
  category: string;
  icon: ElementType;
  tone: AuditTone;
  /** One-line prose rebuilt from metadata, e.g. "₱50.00 · Express Send #0042..." */
  summary: string;
  /** Structured rows for the expanded detail view (avoids raw JSON) */
  details: { label: string; value: string }[];
};

type Meta = Record<string, unknown>;

const peso = (v: unknown): string => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString("en-PH", { style: "currency", currency: "PHP" })
    : "—";
};

const entryCategory = (v: unknown): string => (typeof v === "string" && v ? v : "");

const empty = (m: Meta): AuditView["details"] => [];

const CAT = {
  entry: "Entries",
  report: "Reports",
  event: "Events",
  user: "Users",
  department: "Departments",
} as const;

// action → view. Fall back gracefully for any unhandled/older code.
export function auditLogView(action: string, meta: Meta | null | undefined): AuditView {
  const m: Meta = meta ?? {};
  const base = { icon: Info as ElementType, tone: "info" as AuditTone };

  switch (action) {
    // ── Departments ────────────────────────────────────────────────
    case "department.created": {
      return {
        ...base,
        category: CAT.department,
        label: "Department created",
        icon: Landmark,
        tone: "success",
        summary: `Created ${m.name ?? "a new department"}${m.code ? ` (${m.code})` : ""}.`,
        details: [
          { label: "Name", value: String(m.name ?? "—") },
          { label: "Code", value: String(m.code ?? "—") },
        ],
      };
    }
    case "department.activated":
      return { ...base, category: CAT.department, label: "Department activated", icon: BadgeCheck, tone: "success", summary: "Department was re-activated.", details: empty(m) };
    case "department.deactivated":
      return { ...base, category: CAT.department, label: "Department deactivated", icon: CircleMinus, tone: "neutral", summary: "Department was deactivated.", details: empty(m) };

    // ── Events ─────────────────────────────────────────────────────
    case "event.created": {
      return {
        ...base,
        category: CAT.event,
        label: "Event created",
        icon: FolderOpen,
        tone: "success",
        summary: `Created event "${m.name ?? ""}".`,
        details: [
          { label: "Name", value: String(m.name ?? "—") },
          { label: "Budget", value: peso(m.budget_total) },
        ],
      };
    }
    case "event.budget_updated": {
      return {
        ...base,
        category: CAT.event,
        label: "Budget updated",
        icon: FolderOpen,
        tone: "info",
        summary: `Updated "${m.name ?? ""}" budget from ${peso(m.from_budget_total)} to ${peso(m.to_budget_total)}.`,
        details: [
          { label: "Event", value: String(m.name ?? "—") },
          { label: "From", value: peso(m.from_budget_total) },
          { label: "To", value: peso(m.to_budget_total) },
        ],
      };
    }
    case "event.archived":
      return {
        ...base,
        category: CAT.event,
        label: "Event archived",
        icon: CircleMinus,
        tone: "neutral",
        summary: `Archived event with document ${m.fs_document_number ?? "—"}.`,
        details: m.fs_document_number ? [{ label: "FS Document", value: String(m.fs_document_number) }] : empty(m),
      };

    // ── Entries ────────────────────────────────────────────────────
    case "entry.receipt_parsed":
      return {
        ...base,
        category: CAT.entry,
        label: "Receipt parsed",
        icon: Receipt,
        tone: "info",
        summary: `Parsed receipt for ${peso(m.amount)}${m.document_type_raw ? ` · ${m.document_type_raw}` : ""}${m.document_number ? ` #${m.document_number}` : ""}.`,
        details: [
          { label: "Amount", value: peso(m.amount) },
          { label: "Document type", value: String(m.document_type_raw ?? "—") },
          { label: "Document number", value: String(m.document_number ?? "—") },
        ],
      };
    case "entry.receipt_borderline":
    case "entry.receipt_invalid_document":
    case "entry.receipt_multiple_documents": {
      const label = action === "entry.receipt_borderline"
        ? "Receipt unreadable"
        : action === "entry.receipt_invalid_document"
          ? "Invalid document"
          : "Multiple documents";
      const mkey = action === "entry.receipt_multiple_documents" ? "multiple documents detected" : action === "entry.receipt_invalid_document" ? "not a valid single receipt" : "was unclear or incomplete";
      return {
        ...base,
        category: CAT.entry,
        label,
        icon: CircleX,
        tone: "warning",
        summary: `Upload ${mkey} — no entry recorded.`,
        details: m.reason ? [{ label: "Reason", value: String(m.reason) }] : empty(m),
      };
    }
    case "entry.manual_submitted": {
      const cat = entryCategory(m.category);
      return {
        ...base,
        category: CAT.entry,
        label: "Manual entry submitted",
        icon: Receipt,
        tone: "info",
        summary: `Submitted manual entry for ${peso(m.amount)}${cat ? ` · ${cat}` : ""}.`,
        details: [
          { label: "Amount", value: peso(m.amount) },
          { label: "Category", value: cat || "—" },
          { label: "Photo attached", value: m.has_photo ? "Yes" : "No" },
          { label: "Causes overspend", value: m.causes_overspend ? "Yes" : "No" },
        ],
      };
    }
    case "entry.confirmed": {
      return {
        ...base,
        category: CAT.entry,
        label: "Entry confirmed",
        icon: Receipt,
        tone: "info",
        summary: `Confirmed entry for ${peso(m.amount)}.`,
        details: [
          { label: "Amount", value: peso(m.amount) },
          { label: "Causes overspend", value: m.causes_overspend ? "Yes" : "No" },
          ...(m.overspend_explanation ? [{ label: "Overspend reason", value: String(m.overspend_explanation) }] : []),
        ],
      };
    }
    case "entry.approved":
      return { ...base, category: CAT.entry, label: "Entry approved", icon: CircleCheckBig, tone: "success", summary: `Approved entry for ${peso(m.amount)}.`, details: [{ label: "Amount", value: peso(m.amount) }] };
    case "entry.rejected":
      return {
        ...base,
        category: CAT.entry,
        label: "Entry rejected",
        icon: CircleX,
        tone: "error",
        summary: `Rejected entry${m.reason ? ` — ${m.reason}` : ""}.`,
        details: m.reason ? [{ label: "Reason", value: String(m.reason) }] : empty(m),
      };
    case "entry.resubmitted":
      return {
        ...base,
        category: CAT.entry,
        label: "Entry resubmitted",
        icon: Receipt,
        tone: "info",
        summary: "Resubmitted entry for re-approval.",
        details: m.explanation ? [{ label: "Note", value: String(m.explanation) }] : empty(m),
      };
    case "entry.withdrawn": {
      const cat = entryCategory(m.category);
      return {
        ...base,
        category: CAT.entry,
        label: "Entry withdrawn",
        icon: CircleMinus,
        tone: "neutral",
        summary: `Withdrew entry for ${peso(m.amount)}${cat ? ` · ${cat}` : ""}.`,
        details: [
          { label: "Amount", value: peso(m.amount) },
          { label: "Category", value: cat || "—" },
          { label: "Previous status", value: String(m.from_status ?? "—").replace(/_/g, " ") },
        ],
      };
    }
    case "entry.discarded":
      return {
        ...base,
        category: CAT.entry,
        label: "Entry discarded",
        icon: CircleX,
        tone: "neutral",
        summary: `Discarded receipt${m.document_number ? ` #${m.document_number}` : ""}.`,
        details: [
          { label: "Document type", value: String(m.document_type_raw ?? "—") },
          { label: "Document number", value: String(m.document_number ?? "—") },
        ],
      };
    case "entry.voided":
      return {
        ...base,
        category: CAT.entry,
        label: "Entry voided",
        icon: CircleX,
        tone: "error",
        summary: `Voided entry${m.reason ? ` — ${m.reason}` : ""}.`,
        details: m.reason ? [{ label: "Reason", value: String(m.reason) }] : empty(m),
      };

    // ── Reports ────────────────────────────────────────────────────
    case "report.generated":
      return {
        ...base,
        category: CAT.report,
        label: "Report generated",
        icon: FileText,
        tone: "info",
        summary: `Generated ${m.fs_document_number ?? "report"} (rev ${m.revision_count ?? "—"}) with ${m.signatory_count ?? 0} signator${(m.signatory_count ?? 0) === 1 ? "y" : "ies"}.`,
        details: [
          { label: "FS Document", value: String(m.fs_document_number ?? "—") },
          { label: "Revision", value: String(m.revision_count ?? "—") },
          { label: "Signatories", value: String(m.signatory_count ?? 0) },
        ],
      };
    case "report.approved": {
      const tx = m.polygon_tx_hash;
      return {
        ...base,
        category: CAT.report,
        label: "Report approved",
        icon: CircleCheckBig,
        tone: "success",
        summary: `Approved ${m.fs_document_number ?? "report"}${typeof tx === "string" && tx ? "" : " (not hash-anchored)"}.`,
        details: [
          { label: "FS Document", value: String(m.fs_document_number ?? "—") },
          { label: "Unresolved overspend", value: String(m.unresolved_overspend_count ?? 0) },
          { label: "Blockchain anchor", value: typeof tx === "string" && tx ? `${tx.slice(0, 10)}…` : "None" },
        ],
      };
    }
    case "report.rejected":
      return {
        ...base,
        category: CAT.report,
        label: "Report rejected",
        icon: CircleX,
        tone: "error",
        summary: `Rejected ${m.fs_document_number ?? "report"}${m.rejection_reason ? ` — ${m.rejection_reason}` : ""}.`,
        details: [
          { label: "FS Document", value: String(m.fs_document_number ?? "—") },
          ...(m.rejection_reason ? [{ label: "Reason", value: String(m.rejection_reason) }] : []),
          ...(typeof m.comment_count === "number" ? [{ label: "Comments", value: String(m.comment_count) }] : []),
        ],
      };
    case "report.cancelled":
      return {
        ...base,
        category: CAT.report,
        label: "Report cancelled",
        icon: CircleMinus,
        tone: "neutral",
        summary: `Cancelled ${m.fs_document_number ?? "report"}${typeof m.revision_count === "number" ? ` (rev ${m.revision_count})` : ""}.`,
        details: m.fs_document_number ? [{ label: "FS Document", value: String(m.fs_document_number) }] : empty(m),
      };

    // ── Users ──────────────────────────────────────────────────────
    case "user.approved":
      return {
        ...base,
        category: CAT.user,
        label: "User approved",
        icon: UserCog,
        tone: "success",
        summary: `Approved ${m.name ?? "user"}${m.email ? ` · ${m.email}` : ""}.`,
        details: [
          { label: "Name", value: String(m.name ?? "—") },
          { label: "Email", value: String(m.email ?? "—") },
        ],
      };
    case "user.rejected":
      return {
        ...base,
        category: CAT.user,
        label: "User rejected",
        icon: UserCog,
        tone: "error",
        summary: `Rejected ${m.name ?? "user"}${m.email ? ` · ${m.email}` : ""} — account purged.`,
        details: [
          { label: "Name", value: String(m.name ?? "—") },
          { label: "Email", value: String(m.email ?? "—") },
        ],
      };
    case "user.deactivated":
    case "user.reactivated": {
      const activating = action === "user.reactivated";
      return {
        ...base,
        category: CAT.user,
        label: activating ? "User reactivated" : "User deactivated",
        icon: activating ? BadgeCheck : CircleMinus,
        tone: activating ? "success" : "neutral",
        summary: activating ? "Reactivated a previously deactivated account." : "Deactivated a user account.",
        details: [
          { label: "Previous status", value: String(m.previous_status ?? "—").replace(/_/g, " ") },
          { label: "New status", value: String(m.new_status ?? "—").replace(/_/g, " ") },
        ],
      };
    }

    // ── Fallback for unhandled/legacy codes ───────────────────────
    default:
      return {
        ...base,
        category: "Other",
        label: action.replace(/_/g, " "),
        icon: Clock,
        tone: "neutral",
        summary: action.replace(/_/g, " "),
        details: Object.entries(m).map(([k, v]) => ({ label: k, value: String(v) })),
      };
  }
}
