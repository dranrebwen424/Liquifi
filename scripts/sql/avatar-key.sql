-- ============================================================================
-- Profile avatars
-- Stores the versioned public storage key for each user's profile photo.
-- The key is nullable until a user uploads an avatar; the initials fallback
-- remains the source of truth when it is NULL.
--
-- Deploy: InsForge Dashboard → SQL editor (or MCP raw SQL). Idempotent.
-- ============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_key text;
