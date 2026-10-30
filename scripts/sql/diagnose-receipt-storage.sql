-- Read-only inspection for the event-page image failures.
-- Run as the project administrator; authenticated storage RLS can hide existing files.
BEGIN TRANSACTION READ ONLY;

SELECT name, public
FROM storage.buckets
WHERE name = 'receipts';

WITH affected AS (
  SELECT e.id, e.event_id, ev.department_id, e.image_url
  FROM public.entries e
  JOIN public.events ev ON ev.id = e.event_id
  WHERE e.id IN (
    '1628aca8-38d8-42fe-ba4b-02257f39bfea',
    '714cf020-4799-4a85-9ec4-a99282266ecc',
    'ff1ee929-c2c8-4ef0-9337-824045356551'
  )
), image_keys AS (
  SELECT affected.*, image.key
  FROM affected
  CROSS JOIN LATERAL jsonb_array_elements_text(
    CASE WHEN left(image_url, 1) = '[' THEN image_url::jsonb
         ELSE jsonb_build_array(image_url) END
  ) AS image(key)
)
SELECT image_keys.id AS entry_id, image_keys.event_id,
       image_keys.department_id, image_keys.key AS stored_key,
       objects.key IS NOT NULL AS object_exists,
       objects.uploaded_by
FROM image_keys
LEFT JOIN storage.objects AS objects
  ON objects.bucket = 'receipts' AND objects.key = image_keys.key;

SELECT relrowsecurity
FROM pg_class
WHERE oid = 'storage.objects'::regclass;

SELECT polname, polcmd,
       pg_get_expr(polqual, polrelid) AS using_clause,
       pg_get_expr(polwithcheck, polrelid) AS check_clause
FROM pg_policy
WHERE polrelid = 'storage.objects'::regclass;

ROLLBACK;
