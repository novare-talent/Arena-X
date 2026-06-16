-- Generated from src/lib/forge/challenges.ts.
-- Re-generate with: npx tsx scripts/forge-seed.ts
-- Idempotent: wipes forge_challenges then re-inserts all 40 rows.
-- Submissions and snapshots are NOT touched.

begin;

delete from public.forge_challenges;

-- ============================================================
-- WEEK 1 — Mental Models — The Token Tax (foundation, free)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  1, 'mental_models', 'The Token Tax',
  E'Pick a real prompt you use weekly. Profile its token cost, then refactor it so it costs **at least 50% fewer tokens** without losing quality. Submit a before/after document containing: (a) the original prompt, (b) measured token counts on the same model, (c) the refactored prompt, (d) what you cut and why, (e) a side-by-side output comparison proving quality held.',
  'Treating tokens as a tax — seeing prompt cost before performance.',
  '[{"dimension":"cost_reduction","weight":0.35,"max_score":10,"description":"Did they actually hit a 50%+ token reduction, measured (not estimated)?"},{"dimension":"quality_preservation","weight":0.30,"max_score":10,"description":"Side-by-side outputs prove the refactor did not degrade results."},{"dimension":"explanation_clarity","weight":0.20,"max_score":10,"description":"Each cut is justified — why it was redundant, contradictory, or wasted."},{"dimension":"generalizability","weight":0.15,"max_score":10,"description":"The pattern transfers to other prompts, not a one-off trick."}]'::jsonb,
  ARRAY['pdf','md']::text[], 20, 'foundation', false
);

-- ============================================================
-- WEEK 2 — Daily Driver — The Prompt Library (foundation, free)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  2, 'daily_driver', 'The Prompt Library',
  E'Build a **20-prompt personal library** for your real weekly workflow. Each prompt: a name, the problem it solves, the prompt itself, an example input + output, and a measured time saved vs doing it without the LLM (be honest — minutes per use × uses per week).',
  'Turning ad-hoc usage into a reusable toolbox.',
  '[{"dimension":"realism","weight":0.25,"max_score":10,"description":"These are actually for the learner''s real work, not invented."},{"dimension":"prompt_quality","weight":0.30,"max_score":10,"description":"Each prompt is tight, specific, reusable."},{"dimension":"measurement","weight":0.20,"max_score":10,"description":"Time savings are measured, not estimated."},{"dimension":"organization","weight":0.15,"max_score":10,"description":"Library is browsable — categories, tags, naming."},{"dimension":"breadth","weight":0.10,"max_score":10,"description":"20 distinct workflows, not 20 variants of one."}]'::jsonb,
  ARRAY['zip']::text[], 30, 'foundation', false
);

-- ============================================================
-- WEEK 3 — 4D Operator — Build vs Buy Memo (foundation, free)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  3, 'operator_4d', 'Build vs Buy Memo',
  E'Write a **one-page decision memo** for a real "should we add an LLM to feature X" question (your own work or a public product). Must include: the user job, the build option, the buy option, cost math at expected scale, risk math, and your recommendation with a tripwire that would flip it.',
  'Reasoning under uncertainty with actual numbers, not vibes.',
  '[{"dimension":"decision_quality","weight":0.30,"max_score":10,"description":"Recommendation is actionable and the reasoning supports it."},{"dimension":"cost_math","weight":0.25,"max_score":10,"description":"Numbers are real and load-bearing, not decoration."},{"dimension":"risk_treatment","weight":0.20,"max_score":10,"description":"Risks are specific and ranked."},{"dimension":"tripwire","weight":0.15,"max_score":10,"description":"There''s an honest condition that would flip the call."},{"dimension":"brevity","weight":0.10,"max_score":10,"description":"Fits one page; nothing wasted."}]'::jsonb,
  ARRAY['pdf']::text[], 10, 'foundation', false
);

-- ============================================================
-- WEEK 4 — Agentic Eng — The Daily Brief Agent (foundation, free)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  4, 'agentic_eng', 'The Daily Brief Agent',
  E'Build a single-source agent that, on a trigger, fetches one feed (webpage, RSS, or API) and produces a one-paragraph **"what changed since last run"** brief. Must store yesterday''s snapshot and diff against it. Must handle two edge cases: no-change and fetch-failure. Ship: code, a sample brief it produced, and a step diagram.',
  'Turning a fuzzy goal into discrete, tool-shaped steps with a state-diff branch.',
  '[{"dimension":"system_decomposition","weight":0.30,"max_score":10,"description":"Steps are tool-shaped — each step is a real callable function."},{"dimension":"state_diff_correctness","weight":0.25,"max_score":10,"description":"Yesterday/today comparison is real and works."},{"dimension":"fetch_failure_handling","weight":0.20,"max_score":10,"description":"Fetch fail does not crash the agent or produce a fake brief."},{"dimension":"brief_quality","weight":0.15,"max_score":10,"description":"One paragraph, specific, not a generic summary."},{"dimension":"diagram_clarity","weight":0.10,"max_score":10,"description":"Step diagram matches the code."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'foundation', false
);

-- ============================================================
-- WEEK 5 — Mental Models — Strawberry Trap (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  5, 'mental_models', 'Strawberry Trap',
  E'Find **5 prompts** where a current frontier model (your choice) fails at counting, spelling, or character-level reasoning (the classic "how many r''s in strawberry" family). For each: the prompt, the wrong answer (verbatim), the correct answer, and a **root-cause explanation** rooted in how LLMs tokenize. No copy-pasting other people''s examples — they must be your own discoveries, dated.',
  'Anticipating where tokenization breaks an LLM''s apparent fluency.',
  '[{"dimension":"originality","weight":0.20,"max_score":10,"description":"Examples are the learner''s own, not lifted from social media."},{"dimension":"reproducibility","weight":0.25,"max_score":10,"description":"Each prompt reproduces the failure when re-run."},{"dimension":"root_cause_quality","weight":0.35,"max_score":10,"description":"Explanations point to tokenization / subword structure, not generic ''the model is bad at math''."},{"dimension":"breadth","weight":0.20,"max_score":10,"description":"The 5 examples span different failure shapes."}]'::jsonb,
  ARRAY['pdf','zip']::text[], 20, 'build', true
);

-- ============================================================
-- WEEK 6 — Daily Driver — Inbox Triage (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  6, 'daily_driver', 'Inbox Triage',
  E'Set up a workflow that runs for **one real week** on your personal email or DMs: classifies each message by type + urgency, drafts a reply, queues anything that needs you. Submit a one-page write-up + screenshots of the system handling at least 30 real messages (redact PII).',
  'Wiring an LLM into a real life surface, not a notebook.',
  '[{"dimension":"real_use","weight":0.30,"max_score":10,"description":"Evidence it actually ran on real messages for a real week."},{"dimension":"classification_quality","weight":0.25,"max_score":10,"description":"Labels are useful, not generic."},{"dimension":"draft_quality","weight":0.20,"max_score":10,"description":"Drafts are usable with light editing."},{"dimension":"workflow_design","weight":0.15,"max_score":10,"description":"Handoff back to the human is clean."},{"dimension":"privacy_handling","weight":0.10,"max_score":10,"description":"PII redacted; no sensitive content leaks."}]'::jsonb,
  ARRAY['pdf']::text[], 30, 'build', true
);

-- ============================================================
-- WEEK 7 — 4D Operator — Vendor Eval (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  7, 'operator_4d', 'Vendor Eval',
  E'Pick **one real task** you''d ship to production. Evaluate **3 LLM providers** on it across 5 dimensions (quality, latency, cost, reliability, governance). Build a scoring matrix with weights. Recommend one and explain when you''d switch.',
  'Comparing providers on dimensions that matter to *your* product.',
  '[{"dimension":"dimensions_fit_task","weight":0.25,"max_score":10,"description":"Dimensions and weights reflect the real task, not a template."},{"dimension":"evidence","weight":0.30,"max_score":10,"description":"Real data underpins each score — not opinion."},{"dimension":"comparison_fairness","weight":0.20,"max_score":10,"description":"Same task, same context, same eval set across providers."},{"dimension":"switch_condition","weight":0.15,"max_score":10,"description":"Clear condition that would flip the choice."},{"dimension":"documentation","weight":0.10,"max_score":10,"description":"Matrix is reproducible — someone else could re-run it."}]'::jsonb,
  ARRAY['pdf']::text[], 20, 'build', true
);

-- ============================================================
-- WEEK 8 — Agentic Eng — Operating Doc + Triage Agent (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  8, 'agentic_eng', 'Operating Doc + Triage Agent',
  E'Build a triage agent (inbound emails / DMs / support tickets) that tags type + urgency and drafts a reply. Ship it **with its operating doc**: role, what it may do autonomously, what needs human approval, and a hard "never" list. The operating doc is part of the submission — graded equally with the code.',
  'Writing the autonomy slider and never-list before any logic.',
  '[{"dimension":"operating_doc_quality","weight":0.35,"max_score":10,"description":"Real, specific, irreversible actions ring-fenced."},{"dimension":"autonomy_calibration","weight":0.25,"max_score":10,"description":"Slider matches the stakes of each action."},{"dimension":"triage_quality","weight":0.20,"max_score":10,"description":"Tags and drafts are usable, not generic."},{"dimension":"never_list_specificity","weight":0.20,"max_score":10,"description":"Hard ''never'' list is real, not performative."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'build', true
);

-- ============================================================
-- WEEK 9 — Mental Models — 9.11 vs 9.9 Mining (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  9, 'mental_models', '9.11 vs 9.9 Mining',
  E'Document **10 numeric-comparison failures** in current frontier models. Each entry must include: prompt, model + version, raw output, why it''s wrong, and a one-line hypothesis about *why this class* of comparison breaks. Aim for diversity — not 10 variants of the same number pair.',
  'Building a precise mental model of *what kind of math* LLMs are bad at and why.',
  '[{"dimension":"reproducibility","weight":0.30,"max_score":10,"description":"Each row reproduces verbatim with the same model+version."},{"dimension":"diversity","weight":0.25,"max_score":10,"description":"10 distinct comparison shapes (decimals, version strings, dates, ranges...)."},{"dimension":"hypothesis_quality","weight":0.30,"max_score":10,"description":"Explanations are mechanistic, not ''the model is dumb here''."},{"dimension":"documentation_rigor","weight":0.15,"max_score":10,"description":"Clean tabular format, model versions noted, dates included."}]'::jsonb,
  ARRAY['zip','pdf']::text[], 30, 'build', true
);

-- ============================================================
-- WEEK 10 — Daily Driver — Meeting to Action (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  10, 'daily_driver', 'Meeting to Action',
  E'Build a pipeline that takes a recorded meeting (audio or transcript) and produces action items in your real task manager (Notion, Linear, Todoist, Things — your pick). Submit: the pipeline code/configuration, one real meeting recording (or transcript with permission), and a screenshot of the resulting tasks.',
  'Composing transcription + LLM + API into a real-world workflow.',
  '[{"dimension":"end_to_end_works","weight":0.35,"max_score":10,"description":"Audio/transcript → actual task in actual tool."},{"dimension":"action_extraction_quality","weight":0.25,"max_score":10,"description":"Actions are specific, owned, and dated where possible."},{"dimension":"pipeline_design","weight":0.20,"max_score":10,"description":"Clean stages, replaceable parts."},{"dimension":"error_handling","weight":0.20,"max_score":10,"description":"Doesn''t fall over on noisy audio or missing speaker labels."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'build', true
);

-- ============================================================
-- WEEK 11 — 4D Operator — Risk Register (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  11, 'operator_4d', 'Risk Register',
  E'For a chosen LLM-powered feature (yours or a public product), produce a **risk register of 10 risks** spanning legal, hallucination, abuse, cost, latency, vendor lock, privacy, brand. Rank by (likelihood × impact). For the top 3, propose one concrete mitigation each that you''d actually ship.',
  'Reading an LLM feature with operator eyes, not builder eyes.',
  '[{"dimension":"coverage","weight":0.25,"max_score":10,"description":"Risks span the required categories, no glaring miss."},{"dimension":"ranking_quality","weight":0.25,"max_score":10,"description":"Ordering reflects real likelihood × impact, justified."},{"dimension":"specificity","weight":0.25,"max_score":10,"description":"Risks are concrete and product-specific."},{"dimension":"mitigations","weight":0.25,"max_score":10,"description":"Top-3 mitigations are shippable in a sprint, not ''add governance''."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'build', true
);

-- ============================================================
-- WEEK 12 — Agentic Eng — The Eval Harness (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  12, 'agentic_eng', 'The Eval Harness',
  E'Take last week''s triage agent (or any prior agent). Write **6–8 concrete, automatable pass/fail checks** that tell you it worked without watching it run. Build a harness that runs them and prints a green/red scorecard. Bonus: at least one adversarial check.',
  'Defining ''correct'' precisely enough to automate.',
  '[{"dimension":"check_specificity","weight":0.30,"max_score":10,"description":"Each check is unambiguous — would two engineers agree on pass/fail?"},{"dimension":"automation_quality","weight":0.25,"max_score":10,"description":"Checks run end-to-end without human judgment."},{"dimension":"failure_mode_coverage","weight":0.25,"max_score":10,"description":"Checks catch the failures that matter."},{"dimension":"harness_design","weight":0.20,"max_score":10,"description":"Scorecard is readable; harness is rerunnable."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'build', true
);

-- ============================================================
-- WEEK 13 — Mental Models — Sycophancy Audit (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  13, 'mental_models', 'Sycophancy Audit',
  E'Script **10 prompts** that reliably trigger sycophancy in a frontier model (the model agrees with a wrong premise, walks back a correct answer when pressured, or flatters obvious nonsense). Then design *one* mitigation template — a wrapper prompt or system message — and **measure the delta**: how often did sycophancy occur before vs after, on the same 10 prompts.',
  'Treating model behavior as something you can audit and intervene on with measurement.',
  '[{"dimension":"trigger_quality","weight":0.25,"max_score":10,"description":"The 10 prompts reliably elicit sycophancy, not random refusals."},{"dimension":"mitigation_design","weight":0.30,"max_score":10,"description":"The mitigation is principled, not a magic incantation."},{"dimension":"measurement_rigor","weight":0.30,"max_score":10,"description":"Before/after numbers are reported honestly with the same eval set."},{"dimension":"generalization","weight":0.15,"max_score":10,"description":"The mitigation pattern transfers beyond the test set."}]'::jsonb,
  ARRAY['zip','pdf']::text[], 30, 'build', true
);

-- ============================================================
-- WEEK 14 — Daily Driver — PR Reviewer Persona (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  14, 'daily_driver', 'PR Reviewer Persona',
  E'Design an LLM persona that reviews your pull requests. Run it on **5 real PRs** (your own or open-source). Compare its catches against either human review or known issues. Report: what it caught that humans missed, what it missed, false-positive rate, and where you would and wouldn''t trust it.',
  'Calibrating trust in an LLM judgment empirically.',
  '[{"dimension":"comparison_rigor","weight":0.30,"max_score":10,"description":"Ground truth is real (human reviews or known bug list)."},{"dimension":"calibration","weight":0.25,"max_score":10,"description":"Honest reporting of misses and false positives."},{"dimension":"persona_quality","weight":0.20,"max_score":10,"description":"Persona is task-shaped, not ''you are a senior engineer''."},{"dimension":"real_prs","weight":0.15,"max_score":10,"description":"Actual code review on actual diffs, not toy examples."},{"dimension":"verdict_clarity","weight":0.10,"max_score":10,"description":"Clear statement of where to trust/not trust it."}]'::jsonb,
  ARRAY['pdf']::text[], 20, 'build', true
);

-- ============================================================
-- WEEK 15 — 4D Operator — Latency Budget (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  15, 'operator_4d', 'Latency Budget',
  E'Design a user-facing LLM feature (real or proposed) and lay out a **per-step latency budget**: every network hop, model call, parse, render. Total must hit a stated UX target (e.g. <2s perceived). Show the diagram, list every step, and call out the bottleneck and how you''d reclaim time there.',
  'Designing for time as a first-class constraint.',
  '[{"dimension":"budget_realism","weight":0.30,"max_score":10,"description":"Numbers reflect realistic provider latencies."},{"dimension":"completeness","weight":0.25,"max_score":10,"description":"No hidden steps; entire critical path covered."},{"dimension":"bottleneck_analysis","weight":0.25,"max_score":10,"description":"Top bottleneck named with at least one credible fix."},{"dimension":"ux_target","weight":0.20,"max_score":10,"description":"Hits a stated, defensible UX target."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'build', true
);

-- ============================================================
-- WEEK 16 — Agentic Eng — The Autonomy Slider, Live (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  16, 'agentic_eng', 'The Autonomy Slider, Live',
  E'Build an action-taking agent with a **real approval gate**: it drafts an action (send, post, book, pay-mock), pauses, surfaces it for human approval, then executes only on approval. Smallest possible UI — a console prompt is fine. Approve / reject / edit paths must all work.',
  'Wiring a human into the loop at the right point — not too early, not too late.',
  '[{"dimension":"gate_placement","weight":0.30,"max_score":10,"description":"Gate sits immediately before the irreversible step."},{"dimension":"approve_reject_edit","weight":0.25,"max_score":10,"description":"All three paths actually work and have tests."},{"dimension":"ui_minimal_but_usable","weight":0.20,"max_score":10,"description":"A non-builder could approve/reject."},{"dimension":"safety","weight":0.15,"max_score":10,"description":"No path lets the action fire without approval."},{"dimension":"logging","weight":0.10,"max_score":10,"description":"Decisions are logged for audit."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'build', true
);

-- ============================================================
-- WEEK 17 — Mental Models — Refusal Map (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  17, 'mental_models', 'Refusal Map',
  E'Pick **12 borderline prompts** spanning different policy categories (medical, legal, persuasion, security, personal). Run them against **3 different models**. Chart which model refuses what. Then write a one-page analysis of where each model''s policy boundary actually sits — versus where its docs claim it sits.',
  'Reading model behavior empirically instead of trusting marketing.',
  '[{"dimension":"prompt_design","weight":0.20,"max_score":10,"description":"12 prompts genuinely sit on a boundary, not obvious safe/unsafe."},{"dimension":"comparison_rigor","weight":0.25,"max_score":10,"description":"Same prompt, same context, run against all 3 models."},{"dimension":"policy_insight","weight":0.35,"max_score":10,"description":"Analysis identifies real, specific boundary differences."},{"dimension":"documentation_gap","weight":0.20,"max_score":10,"description":"Calls out where stated policy and observed policy diverge."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'build', true
);

-- ============================================================
-- WEEK 18 — Daily Driver — Daily Standup Bot (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  18, 'daily_driver', 'Daily Standup Bot',
  E'Build a tool that writes your daily standup from your git activity + calendar. Run it for **5 working days**. Submit: the script, the 5 generated standups, and a one-paragraph note on what surprised you (over- or under-counting what you actually did).',
  'Letting an LLM observe your week and summarize it honestly.',
  '[{"dimension":"works_end_to_end","weight":0.30,"max_score":10,"description":"Reads real git+calendar, produces real standups."},{"dimension":"output_quality","weight":0.30,"max_score":10,"description":"Standups are accurate and shippable, not padded."},{"dimension":"reflection","weight":0.20,"max_score":10,"description":"The ''what surprised you'' note shows real observation."},{"dimension":"design","weight":0.20,"max_score":10,"description":"Sensible context boundaries — yesterday only, not whole repo."}]'::jsonb,
  ARRAY['zip']::text[], 30, 'build', true
);

-- ============================================================
-- WEEK 19 — 4D Operator — The Switch Plan (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  19, 'operator_4d', 'The Switch Plan',
  E'Write a **one-page migration plan** from one model or provider to another for an existing feature, **with zero downtime**. Cover: shadow eval, traffic split, rollback condition, comms to stakeholders, and how you''ll know it''s done.',
  'Treating model migration as a deploy, not a swap.',
  '[{"dimension":"safety","weight":0.30,"max_score":10,"description":"Plan has real rollback gates, not ''monitor closely''."},{"dimension":"eval_before_traffic","weight":0.25,"max_score":10,"description":"Shadow eval precedes any user-visible traffic."},{"dimension":"traffic_strategy","weight":0.20,"max_score":10,"description":"Split plan is plausible and reversible."},{"dimension":"done_definition","weight":0.15,"max_score":10,"description":"Clear, testable definition of ''migration complete''."},{"dimension":"comms","weight":0.10,"max_score":10,"description":"Who hears what, when."}]'::jsonb,
  ARRAY['pdf']::text[], 10, 'build', true
);

-- ============================================================
-- WEEK 20 — Agentic Eng — The Tool Chain (build, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  20, 'agentic_eng', 'The Tool Chain',
  E'Build a multi-tool agent that chains **at least three real tools end-to-end** (e.g. fetch → extract → write to Google Sheet or Notion). Each step must be an actual callable tool, not a prompt pretending to be one. Show the chain producing a real artifact.',
  'Composing tools where each output is the next tool''s input.',
  '[{"dimension":"tools_are_real","weight":0.30,"max_score":10,"description":"Each tool is a real callable, not ''pretend a function does this''."},{"dimension":"handoff_quality","weight":0.25,"max_score":10,"description":"Output of step N is valid input for step N+1; seams are clean."},{"dimension":"end_to_end_artifact","weight":0.25,"max_score":10,"description":"Chain produces a real artifact, not a printed log."},{"dimension":"single_responsibility","weight":0.20,"max_score":10,"description":"Each tool does one job."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'build', true
);

-- ============================================================
-- WEEK 21 — Mental Models — Context Decay (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  21, 'mental_models', 'Context Decay',
  E'Design an experiment that shows model accuracy on a specific task **dropping as context length grows**. Pick a task with an objective answer (needle-in-a-haystack, numeric reasoning, etc.). Vary context from short → long in at least 5 steps. Submit: code, raw results, and a chart showing the decay curve.',
  'Quantifying a model behavior most operators only feel anecdotally.',
  '[{"dimension":"experiment_design","weight":0.30,"max_score":10,"description":"Task is unambiguous; only context length varies."},{"dimension":"data_quality","weight":0.25,"max_score":10,"description":"Enough trials per length to see a signal above noise."},{"dimension":"chart_clarity","weight":0.20,"max_score":10,"description":"Decay curve is honest and readable."},{"dimension":"reproducibility","weight":0.25,"max_score":10,"description":"Code runs end-to-end on a fresh checkout."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'advanced', true
);

-- ============================================================
-- WEEK 22 — Daily Driver — Research to Notes (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  22, 'daily_driver', 'Research to Notes',
  E'Pipeline that turns a real paper or long article into Anki-style flashcards **plus** a one-page structured summary. Run it on **3 sources** in your actual area of interest. Submit: the cards, the summaries, the sources, and your notes on which cards you''d actually keep.',
  'Designing for downstream learning, not just summarization.',
  '[{"dimension":"card_quality","weight":0.35,"max_score":10,"description":"Cards test understanding, not trivia. Atomic, answerable."},{"dimension":"summary_structure","weight":0.25,"max_score":10,"description":"Summaries are organized, not paraphrased."},{"dimension":"real_sources","weight":0.20,"max_score":10,"description":"Actual content in the learner''s field."},{"dimension":"keep_rate","weight":0.20,"max_score":10,"description":"Self-reported keep rate is honest; bad cards flagged."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'advanced', true
);

-- ============================================================
-- WEEK 23 — 4D Operator — PII Boundary (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  23, 'operator_4d', 'PII Boundary',
  E'Pick a real workflow that sends data to an LLM. Design and implement a **redaction layer** that strips PII before the request. Demonstrate with **before/after on at least 10 samples**: what would have leaked, what your layer strips, and one adversarial example that defeats the layer.',
  'Treating the prompt boundary as a security perimeter.',
  '[{"dimension":"coverage","weight":0.30,"max_score":10,"description":"Layer catches common PII shapes (email, phone, names, IDs)."},{"dimension":"evidence","weight":0.25,"max_score":10,"description":"Before/after on 10 real samples shows what got stripped."},{"dimension":"adversarial_case","weight":0.20,"max_score":10,"description":"Honest failure case is documented."},{"dimension":"implementation_quality","weight":0.15,"max_score":10,"description":"Code is reusable, not a one-off script."},{"dimension":"policy_clarity","weight":0.10,"max_score":10,"description":"Stated rules for what counts as PII in this context."}]'::jsonb,
  ARRAY['zip']::text[], 30, 'advanced', true
);

-- ============================================================
-- WEEK 24 — Agentic Eng — Persistent Memory (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  24, 'agentic_eng', 'Persistent Memory',
  E'Give an agent **persistent memory across runs** — a state file or a small vector store — so run #5 knows what runs #1–4 did and doesn''t repeat work. Demo by running it 3 times in sequence and showing each run builds on the prior. Memory must be *selective*, not "dump everything".',
  'Deciding what to remember, what to forget, and how to retrieve it.',
  '[{"dimension":"selectivity","weight":0.30,"max_score":10,"description":"Memory writes are deliberate — not the whole transcript."},{"dimension":"retrieval_relevance","weight":0.25,"max_score":10,"description":"What''s recalled is actually relevant to the current run."},{"dimension":"demo_quality","weight":0.20,"max_score":10,"description":"3-run demo clearly shows building-on-prior, not just storing."},{"dimension":"no_context_bloat","weight":0.15,"max_score":10,"description":"Token usage stays bounded across runs."},{"dimension":"storage_choice","weight":0.10,"max_score":10,"description":"Choice of store fits the memory shape."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'advanced', true
);

-- ============================================================
-- WEEK 25 — Mental Models — Hallucinated Citation Hunt (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  25, 'mental_models', 'Hallucinated Citation Hunt',
  E'Collect **20 hallucinated citations** from current frontier models (papers, books, court cases, statutes, URLs that don''t exist). For each: the prompt, the fake citation, evidence it''s fake (search result, "no such DOI"). Then **classify** them by hallucination type (fabricated author, real author + fake paper, real paper + wrong year, etc.).',
  'Building a taxonomy of how LLMs lie — useful for designing checks.',
  '[{"dimension":"evidence_quality","weight":0.30,"max_score":10,"description":"Each citation is convincingly shown to be fake."},{"dimension":"taxonomy_design","weight":0.35,"max_score":10,"description":"Classification is principled and useful for downstream defenses."},{"dimension":"breadth","weight":0.20,"max_score":10,"description":"20 entries span domains (academic, legal, web, books)."},{"dimension":"documentation","weight":0.15,"max_score":10,"description":"Prompts + outputs captured cleanly."}]'::jsonb,
  ARRAY['pdf']::text[], 20, 'advanced', true
);

-- ============================================================
-- WEEK 26 — Daily Driver — Just-One-Prompt Refactor (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  26, 'daily_driver', 'Just-One-Prompt Refactor',
  E'Pick a task you currently do with **multiple back-and-forth prompts**. Compress it to a **single prompt template** that produces the same quality result first-try. Submit: the original conversation (anonymized), the compressed template, side-by-side outputs, and the time saved.',
  'Front-loading specification instead of iterating in chat.',
  '[{"dimension":"compression_fidelity","weight":0.35,"max_score":10,"description":"Single-prompt output matches multi-turn output quality."},{"dimension":"template_design","weight":0.30,"max_score":10,"description":"Template is generalizable to the next instance of this task."},{"dimension":"measurement","weight":0.20,"max_score":10,"description":"Time / token saving is measured."},{"dimension":"documentation","weight":0.15,"max_score":10,"description":"Reader can see the before/after clearly."}]'::jsonb,
  ARRAY['pdf']::text[], 20, 'advanced', true
);

-- ============================================================
-- WEEK 27 — 4D Operator — Cost Model at Three Scales (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  27, 'operator_4d', 'Cost Model at Three Scales',
  E'Build a unit-cost spreadsheet for a hypothetical LLM product at **1K, 100K, and 1M users**. Cover: per-request token cost, calls per user per day, caching hit-rate, batch discounts, and the line where economics break. Submit the sheet + a one-page commentary on what changes between scales.',
  'Pricing model-shaped products before you build them.',
  '[{"dimension":"cost_realism","weight":0.30,"max_score":10,"description":"Numbers reflect real provider pricing."},{"dimension":"assumption_clarity","weight":0.25,"max_score":10,"description":"Assumptions are explicit and adjustable."},{"dimension":"scale_behavior","weight":0.25,"max_score":10,"description":"Cost curves change shape correctly between scales."},{"dimension":"break_point","weight":0.20,"max_score":10,"description":"Identifies where economics genuinely break and why."}]'::jsonb,
  ARRAY['pdf','zip']::text[], 20, 'advanced', true
);

-- ============================================================
-- WEEK 28 — Agentic Eng — Failure Containment (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  28, 'agentic_eng', 'Failure Containment',
  E'Take a deliberately fragile agent (one provided in the drop, or one of your own). **Harden it**: add retries with backoff, fallbacks, and a circuit-breaker so one bad step can''t cascade or loop forever. Show **before/after** on an injected failure — same failure, very different outcomes.',
  'Designing for the step that *will* go wrong.',
  '[{"dimension":"survives_injection","weight":0.30,"max_score":10,"description":"Hardened agent survives the injected failure cleanly."},{"dimension":"fails_safe","weight":0.25,"max_score":10,"description":"When it can''t recover, it stops — does not loop or burn tokens."},{"dimension":"circuit_breaker","weight":0.20,"max_score":10,"description":"Real circuit-breaker, not just a retry counter."},{"dimension":"before_after_clarity","weight":0.15,"max_score":10,"description":"Same failure, side-by-side outcomes."},{"dimension":"backoff_quality","weight":0.10,"max_score":10,"description":"Backoff is sensible, not constant."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'advanced', true
);

-- ============================================================
-- WEEK 29 — Mental Models — Mental Model Diagram (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  29, 'mental_models', 'Mental Model Diagram',
  E'Produce a **one-page diagram** that explains what an LLM actually is — to a non-technical friend (designer, lawyer, doctor, marketer — your choice). Must include: tokens, training, what the model is *predicting*, what "context window" means, and where hallucinations come from. No jargon without a translation.',
  'Compressing a real mental model into something explainable.',
  '[{"dimension":"technical_accuracy","weight":0.30,"max_score":10,"description":"Nothing in the diagram is wrong, even if simplified."},{"dimension":"audience_fit","weight":0.30,"max_score":10,"description":"A non-technical friend would actually understand it."},{"dimension":"completeness","weight":0.20,"max_score":10,"description":"All 5 required elements are present."},{"dimension":"design_quality","weight":0.20,"max_score":10,"description":"Layout helps comprehension, doesn''t just decorate."}]'::jsonb,
  ARRAY['pdf']::text[], 20, 'advanced', true
);

-- ============================================================
-- WEEK 30 — Daily Driver — Voice-First Workflow (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  30, 'daily_driver', 'Voice-First Workflow',
  E'Operate **two full working days** with voice as your primary input to an LLM (dictation + voice agent of your choice). Keep a journal. Submit: the daily plans you executed, the friction points (where voice broke), the wins (where it beat keyboard), and a verdict on which classes of work this changes.',
  'Treating modality as a design choice with real ergonomics.',
  '[{"dimension":"actually_did_it","weight":0.30,"max_score":10,"description":"Evidence of two real voice-first days, not theory."},{"dimension":"friction_specificity","weight":0.25,"max_score":10,"description":"Specific failures, not ''sometimes mishears''."},{"dimension":"win_specificity","weight":0.20,"max_score":10,"description":"Specific tasks where voice won, with reasons."},{"dimension":"verdict_quality","weight":0.25,"max_score":10,"description":"Verdict draws principled lines, not ''it depends''."}]'::jsonb,
  ARRAY['pdf']::text[], 20, 'advanced', true
);

-- ============================================================
-- WEEK 31 — 4D Operator — When Not to Use an LLM (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  31, 'operator_4d', 'When Not to Use an LLM',
  E'List **5 places in your real work** where you tried an LLM and decided to stop. For each: what you tried, what failed, the cost of the failure, and the better non-LLM alternative you switched to. Honesty is the rubric.',
  'Knowing the ceiling — the most under-taught operator skill.',
  '[{"dimension":"honesty","weight":0.30,"max_score":10,"description":"Specific failures, not ''sometimes it hallucinates''."},{"dimension":"cost_of_failure","weight":0.25,"max_score":10,"description":"What it actually cost you (time, money, trust)."},{"dimension":"alternative_quality","weight":0.25,"max_score":10,"description":"The non-LLM alternative is real and used."},{"dimension":"breadth","weight":0.20,"max_score":10,"description":"5 distinct domains, not 5 variants of one."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'advanced', true
);

-- ============================================================
-- WEEK 32 — Agentic Eng — Build the Tool (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  32, 'agentic_eng', 'Build the Tool',
  E'Write **one custom tool / function** (ideally an MCP tool) that an agent can call — something not available off the shelf for your domain. Wire an agent to use it and show it doing something it could not before. The tool''s schema + description is graded as hard as the code.',
  'Recognizing the missing capability and shipping it as a clean, model-callable interface.',
  '[{"dimension":"schema_quality","weight":0.30,"max_score":10,"description":"Schema is crisp, typed, with clear param descriptions."},{"dimension":"description_for_model","weight":0.25,"max_score":10,"description":"Description tells the model when/why to use the tool — not just what."},{"dimension":"capability_extension","weight":0.25,"max_score":10,"description":"Tool extends real capability — not a thin wrapper."},{"dimension":"agent_invokes_correctly","weight":0.20,"max_score":10,"description":"Demo shows the agent picking the tool unprompted when appropriate."}]'::jsonb,
  ARRAY['zip']::text[], 50, 'advanced', true
);

-- ============================================================
-- WEEK 33 — Mental Models — Glitch Token Probe (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  33, 'mental_models', 'Glitch Token Probe',
  E'Find **5 glitch tokens or near-glitch behaviors** in a current model (tokens that produce strange, broken, or stable-but-wrong outputs). For each: the token, reproducible prompts that surface the behavior, the actual output, and your hypothesis for the cause (tokenizer artifact, training data omission, etc.).',
  'Going one layer below the prompt to the tokenizer.',
  '[{"dimension":"reproducibility","weight":0.35,"max_score":10,"description":"The strange behavior reproduces."},{"dimension":"hypothesis_quality","weight":0.30,"max_score":10,"description":"Reasoning is grounded in tokenizer/training mechanics."},{"dimension":"originality","weight":0.20,"max_score":10,"description":"Not the well-known SolidGoldMagikarp examples."},{"dimension":"documentation","weight":0.15,"max_score":10,"description":"Clean prompts and outputs captured."}]'::jsonb,
  ARRAY['zip']::text[], 20, 'advanced', true
);

-- ============================================================
-- WEEK 34 — Daily Driver — Personal Cost Dashboard (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  34, 'daily_driver', 'Personal Cost Dashboard',
  E'Build a personal LLM-cost tracker across the providers you use (OpenAI / Anthropic / local). Run it for one week. Submit: the dashboard (script + screenshots), a one-page weekly report, and one decision you actually changed because of what the data showed.',
  'Making your own LLM spend legible to yourself.',
  '[{"dimension":"captures_real_spend","weight":0.30,"max_score":10,"description":"Tracker pulls real numbers across providers used."},{"dimension":"dashboard_clarity","weight":0.25,"max_score":10,"description":"At a glance: where the money goes."},{"dimension":"one_real_decision","weight":0.30,"max_score":10,"description":"Concrete change made based on the data — not a hypothetical."},{"dimension":"design","weight":0.15,"max_score":10,"description":"Could be reused next month without rewiring."}]'::jsonb,
  ARRAY['zip']::text[], 30, 'advanced', true
);

-- ============================================================
-- WEEK 35 — 4D Operator — Escalation Policy (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  35, 'operator_4d', 'Escalation Policy',
  E'Design an **escalation policy**: when does an LLM-driven workflow hand off to a human? Pick a real workflow, write the policy as a 1-page doc with explicit triggers, then **test it on 5 cases** showing the policy fires correctly (or doesn''t) and what you''d refine.',
  'Writing the rule that decides between autonomy and human time.',
  '[{"dimension":"trigger_specificity","weight":0.30,"max_score":10,"description":"Triggers are testable, not vibes."},{"dimension":"calibration","weight":0.25,"max_score":10,"description":"Policy doesn''t escalate too much (useless) or too little (dangerous)."},{"dimension":"test_quality","weight":0.25,"max_score":10,"description":"5 cases probe real edges, not happy path."},{"dimension":"refinement_notes","weight":0.20,"max_score":10,"description":"Identifies what the test exposed about the policy."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'advanced', true
);

-- ============================================================
-- WEEK 36 — Agentic Eng — The Research Agent (advanced, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  36, 'agentic_eng', 'The Research Agent',
  E'Build a multi-step research agent: given a question, it **plans, searches multiple sources, synthesizes a structured report with citations**, and runs a **self-check pass** that flags unsupported claims. Ship code + a report it produced on a non-trivial question. The self-check must actually catch at least one unsupported claim.',
  'Long-horizon decomposition + grounding + self-verification in one system.',
  '[{"dimension":"citations_resolve","weight":0.25,"max_score":10,"description":"Every citation in the report resolves to a real source."},{"dimension":"claim_grounding","weight":0.25,"max_score":10,"description":"Claims in the report are supported by the cited sources."},{"dimension":"self_check_works","weight":0.25,"max_score":10,"description":"Self-check pass catches a real unsupported claim."},{"dimension":"plan_quality","weight":0.15,"max_score":10,"description":"Plan decomposes the question into real sub-questions."},{"dimension":"report_structure","weight":0.10,"max_score":10,"description":"Report is readable, not a brain-dump."}]'::jsonb,
  ARRAY['zip']::text[], 80, 'advanced', true
);

-- ============================================================
-- WEEK 37 — Mental Models — Failure Anticipation Brief (capstone, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  37, 'mental_models', 'Failure Anticipation Brief',
  E'You''re shown a hypothetical product spec (provided in the drop) that uses an LLM. Before any building, predict the **top 5 failure modes** this product will hit. For each: what fails, why an LLM specifically fails at it, and a one-line mitigation. Score yourself: be specific enough that someone could test your predictions.',
  'Thinking adversarially about LLM-shaped products before they exist.',
  '[{"dimension":"specificity","weight":0.35,"max_score":10,"description":"Each failure is concrete and testable, not ''might hallucinate''."},{"dimension":"mechanism","weight":0.30,"max_score":10,"description":"Roots each failure in a real LLM limitation."},{"dimension":"priority","weight":0.20,"max_score":10,"description":"The 5 are the actual top 5, not random."},{"dimension":"mitigation_realism","weight":0.15,"max_score":10,"description":"Each mitigation is plausible to ship."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'capstone', true
);

-- ============================================================
-- WEEK 38 — Daily Driver — Driver's Manifesto (capstone, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  38, 'daily_driver', E'Driver\'s Manifesto',
  E'Write a **one-page operating doc** for how YOU use LLMs daily: when you reach for them, when you don''t, your hard ''never'' list, the prompts you re-use, and the anti-patterns you''ve learned to avoid. This is the doc you''d give a new hire on day one.',
  'Codifying your own practice — the act of writing it down is the lesson.',
  '[{"dimension":"specificity","weight":0.30,"max_score":10,"description":"Concrete rules, not ''use them wisely''."},{"dimension":"anti_pattern_quality","weight":0.25,"max_score":10,"description":"Things you actually stopped doing, with reasons."},{"dimension":"never_list","weight":0.20,"max_score":10,"description":"Real boundaries, not performative caution."},{"dimension":"usability","weight":0.15,"max_score":10,"description":"A new hire could actually follow this."},{"dimension":"voice","weight":0.10,"max_score":10,"description":"Reads like a person, not a corporate policy."}]'::jsonb,
  ARRAY['pdf','md']::text[], 15, 'capstone', true
);

-- ============================================================
-- WEEK 39 — 4D Operator — Incident Post-Mortem (capstone, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  39, 'operator_4d', 'Incident Post-Mortem',
  E'Write a **realistic post-mortem** for an LLM failure. Can be a real incident (yours or public) or a plausible fictional one. Must include: timeline, user impact, root cause, contributing factors, what would have caught it earlier, action items with owners.',
  'Practicing the discipline incident-writing forces — root cause, not blame.',
  '[{"dimension":"root_cause_quality","weight":0.30,"max_score":10,"description":"RCA goes past the surface; ''5 whys'' depth."},{"dimension":"realism","weight":0.25,"max_score":10,"description":"Failure shape is plausible, not a strawman."},{"dimension":"detection_analysis","weight":0.20,"max_score":10,"description":"What would have caught it earlier is specific."},{"dimension":"action_items","weight":0.15,"max_score":10,"description":"Action items are owned, dated, and testable."},{"dimension":"blamelessness","weight":0.10,"max_score":10,"description":"Reads like Google/Stripe quality, not a finger-point."}]'::jsonb,
  ARRAY['pdf']::text[], 15, 'capstone', true
);

-- ============================================================
-- WEEK 40 — Agentic Eng — Forge Capstone (capstone, pro)
-- ============================================================
insert into public.forge_challenges (week_number, track, title, brief, skill_forced, rubric, submission_formats, max_file_mb, difficulty, is_pro_only) values (
  40, 'agentic_eng', 'Forge Capstone',
  E'Design, spec, build, eval, and **deploy** an original agent that solves a real problem in your own work or life. Open brief — judged on the complete loop, not just the output. Submission must include: the spec, the operating doc, the eval scorecard, the code, and a **live link** to the running service.',
  'Owning the entire spec → direct → verify → ship loop with no scaffolding.',
  '[{"dimension":"spec_fidelity","weight":0.20,"max_score":10,"description":"Code matches the spec; spec is precise enough to be matched."},{"dimension":"eval_design","weight":0.20,"max_score":10,"description":"Eval set is honest, measures the right thing, runs."},{"dimension":"shipping_velocity","weight":0.20,"max_score":10,"description":"It''s actually live; the URL responds."},{"dimension":"operating_doc_quality","weight":0.15,"max_score":10,"description":"Real autonomy slider; real never-list."},{"dimension":"system_decomposition","weight":0.15,"max_score":10,"description":"Steps are tool-shaped; failure modes are mapped."},{"dimension":"originality","weight":0.10,"max_score":10,"description":"Solves a real problem the learner actually has."}]'::jsonb,
  ARRAY['zip','link']::text[], 80, 'capstone', true
);

commit;
