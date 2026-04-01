-- =============================================================================
-- Migration: 005_harden_function_search_paths.sql
-- Description: Set explicit search_path on helper/trigger functions
-- =============================================================================

ALTER FUNCTION public.request_user_id() SET search_path = public;
ALTER FUNCTION public.request_user_policy() SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
