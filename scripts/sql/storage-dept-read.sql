-- Department-scoped reads for the private document buckets.
--
-- storage.objects has RLS enabled with owner-only defaults:
--   storage_objects_owner_select: uploaded_by = auth.jwt()->>'sub'
--                                  OR storage.bucket_is_public(bucket)
-- Receipts, budget proofs and signed report pages are uploaded by the
-- treasurer but read by adviser/admin through the session-authed proxies
-- (/api/entries/[entryId]/image, /api/proofs/[proofId]/image,
-- /api/reports/[reportId]/signed-page). Owner-only reads 404'd for every
-- non-uploader, so those images never loaded.
--
-- This mirrors the app-table policies: admin unrestricted, adviser/treasurer
-- scoped to their own department. Document keys start with {department_id}/.

DROP POLICY IF EXISTS storage_objects_dept_select ON storage.objects;

CREATE POLICY storage_objects_dept_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket IN ('receipts', 'budget-proofs', 'signed-reports')
  AND (
    public.get_user_role() = 'admin'
    OR (
      split_part(key, '/', 1) = public.get_user_department_id()::text
      AND public.get_user_role() IN ('adviser', 'treasurer')
    )
  )
);

-- Check: every stored document key must start with its own department id,
-- otherwise the policy above hides it. Expect bad_prefix = 0.
WITH doc_keys AS (
  SELECT ev.department_id, k.key
  FROM public.entries e
  JOIN public.events ev ON ev.id = e.event_id
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN left(e.image_url, 1) = '[' THEN e.image_url::jsonb ELSE jsonb_build_array(e.image_url) END
  ) AS k(key)
  WHERE e.image_url IS NOT NULL AND e.image_url <> ''
  UNION ALL
  SELECT bp.department_id, k.key
  FROM public.budget_proofs bp
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN left(bp.proof_url, 1) = '[' THEN bp.proof_url::jsonb ELSE jsonb_build_array(bp.proof_url) END
  ) AS k(key)
  WHERE bp.proof_url IS NOT NULL AND bp.proof_url <> ''
  UNION ALL
  SELECT ev.department_id, k.key
  FROM public.reports r
  JOIN public.events ev ON ev.id = r.event_id
  CROSS JOIN LATERAL unnest(
    COALESCE(r.signed_document_urls, ARRAY[]::text[]) || COALESCE(ARRAY[r.pdf_url], ARRAY[]::text[])
  ) AS k(key)
  WHERE r.pdf_url IS NOT NULL OR r.signed_document_urls IS NOT NULL
)
SELECT count(*)::int AS total_keys,
       count(*) FILTER (WHERE split_part(key, '/', 1) = department_id::text)::int AS good_prefix,
       count(*) FILTER (WHERE split_part(key, '/', 1) <> department_id::text)::int AS bad_prefix
FROM doc_keys
WHERE key IS NOT NULL AND key <> '';
