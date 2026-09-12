-- ============================================================================
-- budget_proofs (BudgetProof feature)
-- Audit trail of budget amount changes: every initial budget creation and
-- every add-only increase is backed by a Gemini-verified proof document.
--
--  - verification_status 'pending' → 'matched' | 'mismatch'
--      The write path never creates a row for a failed/malformed Gemini
--      parse (mirrors entry receipt rule). Mismatch rows PERSIST as audit.
--  - resulting_budget_total is the event.budget_total AFTER a matched proof
--      was applied; NULL until then (also NULL forever on mismatch).
--  - proof_url mirrors entries.image_url: a JSON array of storage KEYS
--      (multi-image), or NULL if the proof is manual/typed.
--  - uploaded_by references auth.users (same convention as events.created_by).
--
-- Deploy: InsForge Dashboard → SQL editor (or MCP raw SQL). Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('initial', 'increase')),
  claimed_amount numeric(12,2) NOT NULL,
  proof_url text,
  ai_extracted_amount numeric(12,2),
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'matched', 'mismatch')),
  resulting_budget_total numeric(12,2),
  CONSTRAINT budget_proofs_matched_has_total CHECK (
    verification_status = 'matched' OR resulting_budget_total IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_budget_proofs_event
  ON budget_proofs (event_id, uploaded_at DESC);

ALTER TABLE budget_proofs ENABLE ROW LEVEL SECURITY;

-- Treasurer + adviser: their own department only.
-- Admin: unrestricted (same pair of policies as every dept-scoped table).
DROP POLICY IF EXISTS budget_proofs_dept ON budget_proofs;
CREATE POLICY budget_proofs_dept ON budget_proofs
  FOR ALL
  USING (
    department_id = get_user_department_id()
    AND get_user_role() IN ('adviser', 'treasurer')
  );

DROP POLICY IF EXISTS budget_proofs_admin_all ON budget_proofs;
CREATE POLICY budget_proofs_admin_all ON budget_proofs
  FOR ALL
  USING (get_user_role() = 'admin');