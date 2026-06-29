/**
 * Columns of `problems` that are SAFE to expose to the browser (anon /
 * authenticated). Deliberately EXCLUDES `test_cases` — shipping hidden tests +
 * expected outputs to the client lets users hardcode answers and game the
 * ladder (review finding #15). Judging reads test_cases server-side with the
 * service-role client only.
 *
 * Use this anywhere a client-facing query embeds problem data, instead of
 * `problems(*)`.
 */
export const PROBLEM_PUBLIC_COLUMNS =
  "id, slug, title, description, difficulty, topics, time_limit_ms, memory_limit_kb, elo_floor, elo_ceiling, track, is_active, is_ai_generated, created_by, editorial, accepted_count, submission_count, created_at, match_duration_minutes, io_mode, function_name, param_spec, return_spec";
