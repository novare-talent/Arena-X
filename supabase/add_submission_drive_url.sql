-- ════════════════════════════════════════════════════════════════════
-- Hackathon submissions: add a Google Drive link + make every field
-- optional (a submission can now be created with nothing filled in).
-- Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

alter table public.hackathon_submissions
  add column if not exists drive_url text;

-- Title was required; make it optional so submissions are fully optional.
alter table public.hackathon_submissions
  alter column title drop not null;
