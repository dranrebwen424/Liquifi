-- ============================================================================
-- Notification retention job (Step 27)
-- Deploy as an InsForge scheduled function (see AGENTS.md → InsForge Functions).
--
-- Schedule: run daily (e.g. 03:00 Asia/Manila).
-- Guard:   idempotent — deletes only rows older than one year, regardless of
--          read state.
-- NEVER deletes AuditLog rows — this job touches ONLY the notifications table.
--
-- Mirrored by the boundary predicate in
-- scripts/check-notification-retention.ts — keep the two in sync.
-- ============================================================================

DELETE FROM notifications
WHERE created_at < now() - interval '1 year';
