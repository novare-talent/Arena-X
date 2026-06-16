// 40 Forge weekly challenges, 10 per track.
// Single source of truth for: the seed SQL, the rubric structure used
// by the gpt-4o judge, and the UI surface.

export type ForgeTrack = "mental_models" | "daily_driver" | "operator_4d" | "agentic_eng";
export type ForgeDifficulty = "foundation" | "build" | "advanced" | "capstone";
export type ForgeFormat = "zip" | "pdf" | "md" | "code" | "link";

export interface RubricDimension {
  dimension: string;
  weight: number;       // 0..1, weights per challenge sum to 1
  max_score: number;    // judge scores 0..max_score
  description: string;  // what the judge looks for
}

export interface ForgeChallenge {
  week_number: number;
  track: ForgeTrack;
  title: string;
  brief: string;        // markdown
  skill_forced: string;
  rubric: RubricDimension[];
  submission_formats: ForgeFormat[];
  max_file_mb: number;
  difficulty: ForgeDifficulty;
  is_pro_only: boolean;
}

const r = (dimension: string, weight: number, description: string, max_score = 10): RubricDimension =>
  ({ dimension, weight, max_score, description });

// ---------- S0 — Mental Models (weeks 1, 5, 9, 13, 17, 21, 25, 29, 33, 37)
const MENTAL_MODELS: Omit<ForgeChallenge, "week_number" | "is_pro_only" | "difficulty">[] = [
  {
    track: "mental_models",
    title: "The Token Tax",
    brief: `Pick a real prompt you use weekly. Profile its token cost, then refactor it so it costs **at least 50% fewer tokens** without losing quality. Submit a before/after document containing: (a) the original prompt, (b) measured token counts on the same model, (c) the refactored prompt, (d) what you cut and why, (e) a side-by-side output comparison proving quality held.`,
    skill_forced: "Treating tokens as a tax — seeing prompt cost before performance.",
    rubric: [
      r("cost_reduction", 0.35, "Did they actually hit a 50%+ token reduction, measured (not estimated)?"),
      r("quality_preservation", 0.30, "Side-by-side outputs prove the refactor did not degrade results."),
      r("explanation_clarity", 0.20, "Each cut is justified — why it was redundant, contradictory, or wasted."),
      r("generalizability", 0.15, "The pattern transfers to other prompts, not a one-off trick."),
    ],
    submission_formats: ["pdf", "md"],
    max_file_mb: 20,
  },
  {
    track: "mental_models",
    title: "Strawberry Trap",
    brief: `Find **5 prompts** where a current frontier model (your choice) fails at counting, spelling, or character-level reasoning (the classic "how many r's in strawberry" family). For each: the prompt, the wrong answer (verbatim), the correct answer, and a **root-cause explanation** rooted in how LLMs tokenize. No copy-pasting other people's examples — they must be your own discoveries, dated.`,
    skill_forced: "Anticipating where tokenization breaks an LLM's apparent fluency.",
    rubric: [
      r("originality", 0.20, "Examples are the learner's own, not lifted from social media."),
      r("reproducibility", 0.25, "Each prompt reproduces the failure when re-run."),
      r("root_cause_quality", 0.35, "Explanations point to tokenization / subword structure, not generic 'the model is bad at math'."),
      r("breadth", 0.20, "The 5 examples span different failure shapes."),
    ],
    submission_formats: ["pdf", "zip"],
    max_file_mb: 20,
  },
  {
    track: "mental_models",
    title: "9.11 vs 9.9 Mining",
    brief: `Document **10 numeric-comparison failures** in current frontier models. Each entry must include: prompt, model + version, raw output, why it's wrong, and a one-line hypothesis about *why this class* of comparison breaks. Aim for diversity — not 10 variants of the same number pair.`,
    skill_forced: "Building a precise mental model of *what kind of math* LLMs are bad at and why.",
    rubric: [
      r("reproducibility", 0.30, "Each row reproduces verbatim with the same model+version."),
      r("diversity", 0.25, "10 distinct comparison shapes (decimals, version strings, dates, ranges...)."),
      r("hypothesis_quality", 0.30, "Explanations are mechanistic, not 'the model is dumb here'."),
      r("documentation_rigor", 0.15, "Clean tabular format, model versions noted, dates included."),
    ],
    submission_formats: ["zip", "pdf"],
    max_file_mb: 30,
  },
  {
    track: "mental_models",
    title: "Sycophancy Audit",
    brief: `Script **10 prompts** that reliably trigger sycophancy in a frontier model (the model agrees with a wrong premise, walks back a correct answer when pressured, or flatters obvious nonsense). Then design *one* mitigation template — a wrapper prompt or system message — and **measure the delta**: how often did sycophancy occur before vs after, on the same 10 prompts.`,
    skill_forced: "Treating model behavior as something you can audit and intervene on with measurement.",
    rubric: [
      r("trigger_quality", 0.25, "The 10 prompts reliably elicit sycophancy, not random refusals."),
      r("mitigation_design", 0.30, "The mitigation is principled, not a magic incantation."),
      r("measurement_rigor", 0.30, "Before/after numbers are reported honestly with the same eval set."),
      r("generalization", 0.15, "The mitigation pattern transfers beyond the test set."),
    ],
    submission_formats: ["zip", "pdf"],
    max_file_mb: 30,
  },
  {
    track: "mental_models",
    title: "Refusal Map",
    brief: `Pick **12 borderline prompts** spanning different policy categories (medical, legal, persuasion, security, personal). Run them against **3 different models**. Chart which model refuses what. Then write a one-page analysis of where each model's policy boundary actually sits — versus where its docs claim it sits.`,
    skill_forced: "Reading model behavior empirically instead of trusting marketing.",
    rubric: [
      r("prompt_design", 0.20, "12 prompts genuinely sit on a boundary, not obvious safe/unsafe."),
      r("comparison_rigor", 0.25, "Same prompt, same context, run against all 3 models."),
      r("policy_insight", 0.35, "Analysis identifies real, specific boundary differences."),
      r("documentation_gap", 0.20, "Calls out where stated policy and observed policy diverge."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
  {
    track: "mental_models",
    title: "Context Decay",
    brief: `Design an experiment that shows model accuracy on a specific task **dropping as context length grows**. Pick a task with an objective answer (needle-in-a-haystack, numeric reasoning, etc.). Vary context from short → long in at least 5 steps. Submit: code, raw results, and a chart showing the decay curve.`,
    skill_forced: "Quantifying a model behavior most operators only feel anecdotally.",
    rubric: [
      r("experiment_design", 0.30, "Task is unambiguous; only context length varies."),
      r("data_quality", 0.25, "Enough trials per length to see a signal above noise."),
      r("chart_clarity", 0.20, "Decay curve is honest and readable."),
      r("reproducibility", 0.25, "Code runs end-to-end on a fresh checkout."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "mental_models",
    title: "Hallucinated Citation Hunt",
    brief: `Collect **20 hallucinated citations** from current frontier models (papers, books, court cases, statutes, URLs that don't exist). For each: the prompt, the fake citation, evidence it's fake (search result, "no such DOI"). Then **classify** them by hallucination type (fabricated author, real author + fake paper, real paper + wrong year, etc.).`,
    skill_forced: "Building a taxonomy of how LLMs lie — useful for designing checks.",
    rubric: [
      r("evidence_quality", 0.30, "Each citation is convincingly shown to be fake."),
      r("taxonomy_design", 0.35, "Classification is principled and useful for downstream defenses."),
      r("breadth", 0.20, "20 entries span domains (academic, legal, web, books)."),
      r("documentation", 0.15, "Prompts + outputs captured cleanly."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 20,
  },
  {
    track: "mental_models",
    title: "Mental Model Diagram",
    brief: `Produce a **one-page diagram** that explains what an LLM actually is — to a non-technical friend (designer, lawyer, doctor, marketer — your choice). Must include: tokens, training, what the model is *predicting*, what "context window" means, and where hallucinations come from. No jargon without a translation.`,
    skill_forced: "Compressing a real mental model into something explainable.",
    rubric: [
      r("technical_accuracy", 0.30, "Nothing in the diagram is wrong, even if simplified."),
      r("audience_fit", 0.30, "A non-technical friend would actually understand it."),
      r("completeness", 0.20, "All 5 required elements are present."),
      r("design_quality", 0.20, "Layout helps comprehension, doesn't just decorate."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 20,
  },
  {
    track: "mental_models",
    title: "Glitch Token Probe",
    brief: `Find **5 glitch tokens or near-glitch behaviors** in a current model (tokens that produce strange, broken, or stable-but-wrong outputs). For each: the token, reproducible prompts that surface the behavior, the actual output, and your hypothesis for the cause (tokenizer artifact, training data omission, etc.).`,
    skill_forced: "Going one layer below the prompt to the tokenizer.",
    rubric: [
      r("reproducibility", 0.35, "The strange behavior reproduces."),
      r("hypothesis_quality", 0.30, "Reasoning is grounded in tokenizer/training mechanics."),
      r("originality", 0.20, "Not the well-known SolidGoldMagikarp examples."),
      r("documentation", 0.15, "Clean prompts and outputs captured."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 20,
  },
  {
    track: "mental_models",
    title: "Failure Anticipation Brief",
    brief: `You're shown a hypothetical product spec (provided in the drop) that uses an LLM. Before any building, predict the **top 5 failure modes** this product will hit. For each: what fails, why an LLM specifically fails at it, and a one-line mitigation. Score yourself: be specific enough that someone could test your predictions.`,
    skill_forced: "Thinking adversarially about LLM-shaped products before they exist.",
    rubric: [
      r("specificity", 0.35, "Each failure is concrete and testable, not 'might hallucinate'."),
      r("mechanism", 0.30, "Roots each failure in a real LLM limitation."),
      r("priority", 0.20, "The 5 are the actual top 5, not random."),
      r("mitigation_realism", 0.15, "Each mitigation is plausible to ship."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
];

// ---------- S1 — Daily Driver (weeks 2, 6, 10, 14, 18, 22, 26, 30, 34, 38)
const DAILY_DRIVER: Omit<ForgeChallenge, "week_number" | "is_pro_only" | "difficulty">[] = [
  {
    track: "daily_driver",
    title: "The Prompt Library",
    brief: `Build a **20-prompt personal library** for your real weekly workflow. Each prompt: a name, the problem it solves, the prompt itself, an example input + output, and a measured time saved vs doing it without the LLM (be honest — minutes per use × uses per week).`,
    skill_forced: "Turning ad-hoc usage into a reusable toolbox.",
    rubric: [
      r("realism", 0.25, "These are actually for the learner's real work, not invented."),
      r("prompt_quality", 0.30, "Each prompt is tight, specific, reusable."),
      r("measurement", 0.20, "Time savings are measured, not estimated."),
      r("organization", 0.15, "Library is browsable — categories, tags, naming."),
      r("breadth", 0.10, "20 distinct workflows, not 20 variants of one."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 30,
  },
  {
    track: "daily_driver",
    title: "Inbox Triage",
    brief: `Set up a workflow that runs for **one real week** on your personal email or DMs: classifies each message by type + urgency, drafts a reply, queues anything that needs you. Submit a one-page write-up + screenshots of the system handling at least 30 real messages (redact PII).`,
    skill_forced: "Wiring an LLM into a real life surface, not a notebook.",
    rubric: [
      r("real_use", 0.30, "Evidence it actually ran on real messages for a real week."),
      r("classification_quality", 0.25, "Labels are useful, not generic."),
      r("draft_quality", 0.20, "Drafts are usable with light editing."),
      r("workflow_design", 0.15, "Handoff back to the human is clean."),
      r("privacy_handling", 0.10, "PII redacted; no sensitive content leaks."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 30,
  },
  {
    track: "daily_driver",
    title: "Meeting to Action",
    brief: `Build a pipeline that takes a recorded meeting (audio or transcript) and produces action items in your real task manager (Notion, Linear, Todoist, Things — your pick). Submit: the pipeline code/configuration, one real meeting recording (or transcript with permission), and a screenshot of the resulting tasks.`,
    skill_forced: "Composing transcription + LLM + API into a real-world workflow.",
    rubric: [
      r("end_to_end_works", 0.35, "Audio/transcript → actual task in actual tool."),
      r("action_extraction_quality", 0.25, "Actions are specific, owned, and dated where possible."),
      r("pipeline_design", 0.20, "Clean stages, replaceable parts."),
      r("error_handling", 0.20, "Doesn't fall over on noisy audio or missing speaker labels."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "daily_driver",
    title: "PR Reviewer Persona",
    brief: `Design an LLM persona that reviews your pull requests. Run it on **5 real PRs** (your own or open-source). Compare its catches against either human review or known issues. Report: what it caught that humans missed, what it missed, false-positive rate, and where you would and wouldn't trust it.`,
    skill_forced: "Calibrating trust in an LLM judgment empirically.",
    rubric: [
      r("comparison_rigor", 0.30, "Ground truth is real (human reviews or known bug list)."),
      r("calibration", 0.25, "Honest reporting of misses and false positives."),
      r("persona_quality", 0.20, "Persona is task-shaped, not 'you are a senior engineer'."),
      r("real_prs", 0.15, "Actual code review on actual diffs, not toy examples."),
      r("verdict_clarity", 0.10, "Clear statement of where to trust/not trust it."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 20,
  },
  {
    track: "daily_driver",
    title: "Daily Standup Bot",
    brief: `Build a tool that writes your daily standup from your git activity + calendar. Run it for **5 working days**. Submit: the script, the 5 generated standups, and a one-paragraph note on what surprised you (over- or under-counting what you actually did).`,
    skill_forced: "Letting an LLM observe your week and summarize it honestly.",
    rubric: [
      r("works_end_to_end", 0.30, "Reads real git+calendar, produces real standups."),
      r("output_quality", 0.30, "Standups are accurate and shippable, not padded."),
      r("reflection", 0.20, "The 'what surprised you' note shows real observation."),
      r("design", 0.20, "Sensible context boundaries — yesterday only, not whole repo."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 30,
  },
  {
    track: "daily_driver",
    title: "Research to Notes",
    brief: `Pipeline that turns a real paper or long article into Anki-style flashcards **plus** a one-page structured summary. Run it on **3 sources** in your actual area of interest. Submit: the cards, the summaries, the sources, and your notes on which cards you'd actually keep.`,
    skill_forced: "Designing for downstream learning, not just summarization.",
    rubric: [
      r("card_quality", 0.35, "Cards test understanding, not trivia. Atomic, answerable."),
      r("summary_structure", 0.25, "Summaries are organized, not paraphrased."),
      r("real_sources", 0.20, "Actual content in the learner's field."),
      r("keep_rate", 0.20, "Self-reported keep rate is honest; bad cards flagged."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "daily_driver",
    title: "Just-One-Prompt Refactor",
    brief: `Pick a task you currently do with **multiple back-and-forth prompts**. Compress it to a **single prompt template** that produces the same quality result first-try. Submit: the original conversation (anonymized), the compressed template, side-by-side outputs, and the time saved.`,
    skill_forced: "Front-loading specification instead of iterating in chat.",
    rubric: [
      r("compression_fidelity", 0.35, "Single-prompt output matches multi-turn output quality."),
      r("template_design", 0.30, "Template is generalizable to the next instance of this task."),
      r("measurement", 0.20, "Time / token saving is measured."),
      r("documentation", 0.15, "Reader can see the before/after clearly."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 20,
  },
  {
    track: "daily_driver",
    title: "Voice-First Workflow",
    brief: `Operate **two full working days** with voice as your primary input to an LLM (dictation + voice agent of your choice). Keep a journal. Submit: the daily plans you executed, the friction points (where voice broke), the wins (where it beat keyboard), and a verdict on which classes of work this changes.`,
    skill_forced: "Treating modality as a design choice with real ergonomics.",
    rubric: [
      r("actually_did_it", 0.30, "Evidence of two real voice-first days, not theory."),
      r("friction_specificity", 0.25, "Specific failures, not 'sometimes mishears'."),
      r("win_specificity", 0.20, "Specific tasks where voice won, with reasons."),
      r("verdict_quality", 0.25, "Verdict draws principled lines, not 'it depends'."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 20,
  },
  {
    track: "daily_driver",
    title: "Personal Cost Dashboard",
    brief: `Build a personal LLM-cost tracker across the providers you use (OpenAI / Anthropic / local). Run it for one week. Submit: the dashboard (script + screenshots), a one-page weekly report, and one decision you actually changed because of what the data showed.`,
    skill_forced: "Making your own LLM spend legible to yourself.",
    rubric: [
      r("captures_real_spend", 0.30, "Tracker pulls real numbers across providers used."),
      r("dashboard_clarity", 0.25, "At a glance: where the money goes."),
      r("one_real_decision", 0.30, "Concrete change made based on the data — not a hypothetical."),
      r("design", 0.15, "Could be reused next month without rewiring."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 30,
  },
  {
    track: "daily_driver",
    title: "Driver's Manifesto",
    brief: `Write a **one-page operating doc** for how YOU use LLMs daily: when you reach for them, when you don't, your hard 'never' list, the prompts you re-use, and the anti-patterns you've learned to avoid. This is the doc you'd give a new hire on day one.`,
    skill_forced: "Codifying your own practice — the act of writing it down is the lesson.",
    rubric: [
      r("specificity", 0.30, "Concrete rules, not 'use them wisely'."),
      r("anti_pattern_quality", 0.25, "Things you actually stopped doing, with reasons."),
      r("never_list", 0.20, "Real boundaries, not performative caution."),
      r("usability", 0.15, "A new hire could actually follow this."),
      r("voice", 0.10, "Reads like a person, not a corporate policy."),
    ],
    submission_formats: ["pdf", "md"],
    max_file_mb: 15,
  },
];

// ---------- S2 — 4D Operator (weeks 3, 7, 11, 15, 19, 23, 27, 31, 35, 39)
const OPERATOR_4D: Omit<ForgeChallenge, "week_number" | "is_pro_only" | "difficulty">[] = [
  {
    track: "operator_4d",
    title: "Build vs Buy Memo",
    brief: `Write a **one-page decision memo** for a real "should we add an LLM to feature X" question (your own work or a public product). Must include: the user job, the build option, the buy option, cost math at expected scale, risk math, and your recommendation with a tripwire that would flip it.`,
    skill_forced: "Reasoning under uncertainty with actual numbers, not vibes.",
    rubric: [
      r("decision_quality", 0.30, "Recommendation is actionable and the reasoning supports it."),
      r("cost_math", 0.25, "Numbers are real and load-bearing, not decoration."),
      r("risk_treatment", 0.20, "Risks are specific and ranked."),
      r("tripwire", 0.15, "There's an honest condition that would flip the call."),
      r("brevity", 0.10, "Fits one page; nothing wasted."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 10,
  },
  {
    track: "operator_4d",
    title: "Vendor Eval",
    brief: `Pick **one real task** you'd ship to production. Evaluate **3 LLM providers** on it across 5 dimensions (quality, latency, cost, reliability, governance). Build a scoring matrix with weights. Recommend one and explain when you'd switch.`,
    skill_forced: "Comparing providers on dimensions that matter to *your* product.",
    rubric: [
      r("dimensions_fit_task", 0.25, "Dimensions and weights reflect the real task, not a template."),
      r("evidence", 0.30, "Real data underpins each score — not opinion."),
      r("comparison_fairness", 0.20, "Same task, same context, same eval set across providers."),
      r("switch_condition", 0.15, "Clear condition that would flip the choice."),
      r("documentation", 0.10, "Matrix is reproducible — someone else could re-run it."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 20,
  },
  {
    track: "operator_4d",
    title: "Risk Register",
    brief: `For a chosen LLM-powered feature (yours or a public product), produce a **risk register of 10 risks** spanning legal, hallucination, abuse, cost, latency, vendor lock, privacy, brand. Rank by (likelihood × impact). For the top 3, propose one concrete mitigation each that you'd actually ship.`,
    skill_forced: "Reading an LLM feature with operator eyes, not builder eyes.",
    rubric: [
      r("coverage", 0.25, "Risks span the required categories, no glaring miss."),
      r("ranking_quality", 0.25, "Ordering reflects real likelihood × impact, justified."),
      r("specificity", 0.25, "Risks are concrete and product-specific."),
      r("mitigations", 0.25, "Top-3 mitigations are shippable in a sprint, not 'add governance'."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
  {
    track: "operator_4d",
    title: "Latency Budget",
    brief: `Design a user-facing LLM feature (real or proposed) and lay out a **per-step latency budget**: every network hop, model call, parse, render. Total must hit a stated UX target (e.g. <2s perceived). Show the diagram, list every step, and call out the bottleneck and how you'd reclaim time there.`,
    skill_forced: "Designing for time as a first-class constraint.",
    rubric: [
      r("budget_realism", 0.30, "Numbers reflect realistic provider latencies."),
      r("completeness", 0.25, "No hidden steps; entire critical path covered."),
      r("bottleneck_analysis", 0.25, "Top bottleneck named with at least one credible fix."),
      r("ux_target", 0.20, "Hits a stated, defensible UX target."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
  {
    track: "operator_4d",
    title: "The Switch Plan",
    brief: `Write a **one-page migration plan** from one model or provider to another for an existing feature, **with zero downtime**. Cover: shadow eval, traffic split, rollback condition, comms to stakeholders, and how you'll know it's done.`,
    skill_forced: "Treating model migration as a deploy, not a swap.",
    rubric: [
      r("safety", 0.30, "Plan has real rollback gates, not 'monitor closely'."),
      r("eval_before_traffic", 0.25, "Shadow eval precedes any user-visible traffic."),
      r("traffic_strategy", 0.20, "Split plan is plausible and reversible."),
      r("done_definition", 0.15, "Clear, testable definition of 'migration complete'."),
      r("comms", 0.10, "Who hears what, when."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 10,
  },
  {
    track: "operator_4d",
    title: "PII Boundary",
    brief: `Pick a real workflow that sends data to an LLM. Design and implement a **redaction layer** that strips PII before the request. Demonstrate with **before/after on at least 10 samples**: what would have leaked, what your layer strips, and one adversarial example that defeats the layer.`,
    skill_forced: "Treating the prompt boundary as a security perimeter.",
    rubric: [
      r("coverage", 0.30, "Layer catches common PII shapes (email, phone, names, IDs)."),
      r("evidence", 0.25, "Before/after on 10 real samples shows what got stripped."),
      r("adversarial_case", 0.20, "Honest failure case is documented."),
      r("implementation_quality", 0.15, "Code is reusable, not a one-off script."),
      r("policy_clarity", 0.10, "Stated rules for what counts as PII in this context."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 30,
  },
  {
    track: "operator_4d",
    title: "Cost Model at Three Scales",
    brief: `Build a unit-cost spreadsheet for a hypothetical LLM product at **1K, 100K, and 1M users**. Cover: per-request token cost, calls per user per day, caching hit-rate, batch discounts, and the line where economics break. Submit the sheet + a one-page commentary on what changes between scales.`,
    skill_forced: "Pricing model-shaped products before you build them.",
    rubric: [
      r("cost_realism", 0.30, "Numbers reflect real provider pricing."),
      r("assumption_clarity", 0.25, "Assumptions are explicit and adjustable."),
      r("scale_behavior", 0.25, "Cost curves change shape correctly between scales."),
      r("break_point", 0.20, "Identifies where economics genuinely break and why."),
    ],
    submission_formats: ["pdf", "zip"],
    max_file_mb: 20,
  },
  {
    track: "operator_4d",
    title: "When Not to Use an LLM",
    brief: `List **5 places in your real work** where you tried an LLM and decided to stop. For each: what you tried, what failed, the cost of the failure, and the better non-LLM alternative you switched to. Honesty is the rubric.`,
    skill_forced: "Knowing the ceiling — the most under-taught operator skill.",
    rubric: [
      r("honesty", 0.30, "Specific failures, not 'sometimes it hallucinates'."),
      r("cost_of_failure", 0.25, "What it actually cost you (time, money, trust)."),
      r("alternative_quality", 0.25, "The non-LLM alternative is real and used."),
      r("breadth", 0.20, "5 distinct domains, not 5 variants of one."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
  {
    track: "operator_4d",
    title: "Escalation Policy",
    brief: `Design an **escalation policy**: when does an LLM-driven workflow hand off to a human? Pick a real workflow, write the policy as a 1-page doc with explicit triggers, then **test it on 5 cases** showing the policy fires correctly (or doesn't) and what you'd refine.`,
    skill_forced: "Writing the rule that decides between autonomy and human time.",
    rubric: [
      r("trigger_specificity", 0.30, "Triggers are testable, not vibes."),
      r("calibration", 0.25, "Policy doesn't escalate too much (useless) or too little (dangerous)."),
      r("test_quality", 0.25, "5 cases probe real edges, not happy path."),
      r("refinement_notes", 0.20, "Identifies what the test exposed about the policy."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
  {
    track: "operator_4d",
    title: "Incident Post-Mortem",
    brief: `Write a **realistic post-mortem** for an LLM failure. Can be a real incident (yours or public) or a plausible fictional one. Must include: timeline, user impact, root cause, contributing factors, what would have caught it earlier, action items with owners.`,
    skill_forced: "Practicing the discipline incident-writing forces — root cause, not blame.",
    rubric: [
      r("root_cause_quality", 0.30, "RCA goes past the surface; '5 whys' depth."),
      r("realism", 0.25, "Failure shape is plausible, not a strawman."),
      r("detection_analysis", 0.20, "What would have caught it earlier is specific."),
      r("action_items", 0.15, "Action items are owned, dated, and testable."),
      r("blamelessness", 0.10, "Reads like Google/Stripe quality, not a finger-point."),
    ],
    submission_formats: ["pdf"],
    max_file_mb: 15,
  },
];

// ---------- S3 — Agentic Engineering (weeks 4, 8, 12, 16, 20, 24, 28, 32, 36, 40)
const AGENTIC_ENG: Omit<ForgeChallenge, "week_number" | "is_pro_only" | "difficulty">[] = [
  {
    track: "agentic_eng",
    title: "The Daily Brief Agent",
    brief: `Build a single-source agent that, on a trigger, fetches one feed (webpage, RSS, or API) and produces a one-paragraph **"what changed since last run"** brief. Must store yesterday's snapshot and diff against it. Must handle two edge cases: no-change and fetch-failure. Ship: code, a sample brief it produced, and a step diagram.`,
    skill_forced: "Turning a fuzzy goal into discrete, tool-shaped steps with a state-diff branch.",
    rubric: [
      r("system_decomposition", 0.30, "Steps are tool-shaped — each step is a real callable function."),
      r("state_diff_correctness", 0.25, "Yesterday/today comparison is real and works."),
      r("fetch_failure_handling", 0.20, "Fetch fail does not crash the agent or produce a fake brief."),
      r("brief_quality", 0.15, "One paragraph, specific, not a generic summary."),
      r("diagram_clarity", 0.10, "Step diagram matches the code."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "Operating Doc + Triage Agent",
    brief: `Build a triage agent (inbound emails / DMs / support tickets) that tags type + urgency and drafts a reply. Ship it **with its operating doc**: role, what it may do autonomously, what needs human approval, and a hard "never" list. The operating doc is part of the submission — graded equally with the code.`,
    skill_forced: "Writing the autonomy slider and never-list before any logic.",
    rubric: [
      r("operating_doc_quality", 0.35, "Real, specific, irreversible actions ring-fenced."),
      r("autonomy_calibration", 0.25, "Slider matches the stakes of each action."),
      r("triage_quality", 0.20, "Tags and drafts are usable, not generic."),
      r("never_list_specificity", 0.20, "Hard 'never' list is real, not performative."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "The Eval Harness",
    brief: `Take last week's triage agent (or any prior agent). Write **6–8 concrete, automatable pass/fail checks** that tell you it worked without watching it run. Build a harness that runs them and prints a green/red scorecard. Bonus: at least one adversarial check.`,
    skill_forced: "Defining 'correct' precisely enough to automate.",
    rubric: [
      r("check_specificity", 0.30, "Each check is unambiguous — would two engineers agree on pass/fail?"),
      r("automation_quality", 0.25, "Checks run end-to-end without human judgment."),
      r("failure_mode_coverage", 0.25, "Checks catch the failures that matter."),
      r("harness_design", 0.20, "Scorecard is readable; harness is rerunnable."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "The Autonomy Slider, Live",
    brief: `Build an action-taking agent with a **real approval gate**: it drafts an action (send, post, book, pay-mock), pauses, surfaces it for human approval, then executes only on approval. Smallest possible UI — a console prompt is fine. Approve / reject / edit paths must all work.`,
    skill_forced: "Wiring a human into the loop at the right point — not too early, not too late.",
    rubric: [
      r("gate_placement", 0.30, "Gate sits immediately before the irreversible step."),
      r("approve_reject_edit", 0.25, "All three paths actually work and have tests."),
      r("ui_minimal_but_usable", 0.20, "A non-builder could approve/reject."),
      r("safety", 0.15, "No path lets the action fire without approval."),
      r("logging", 0.10, "Decisions are logged for audit."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "The Tool Chain",
    brief: `Build a multi-tool agent that chains **at least three real tools end-to-end** (e.g. fetch → extract → write to Google Sheet or Notion). Each step must be an actual callable tool, not a prompt pretending to be one. Show the chain producing a real artifact.`,
    skill_forced: "Composing tools where each output is the next tool's input.",
    rubric: [
      r("tools_are_real", 0.30, "Each tool is a real callable, not 'pretend a function does this'."),
      r("handoff_quality", 0.25, "Output of step N is valid input for step N+1; seams are clean."),
      r("end_to_end_artifact", 0.25, "Chain produces a real artifact, not a printed log."),
      r("single_responsibility", 0.20, "Each tool does one job."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "Persistent Memory",
    brief: `Give an agent **persistent memory across runs** — a state file or a small vector store — so run #5 knows what runs #1–4 did and doesn't repeat work. Demo by running it 3 times in sequence and showing each run builds on the prior. Memory must be *selective*, not "dump everything".`,
    skill_forced: "Deciding what to remember, what to forget, and how to retrieve it.",
    rubric: [
      r("selectivity", 0.30, "Memory writes are deliberate — not the whole transcript."),
      r("retrieval_relevance", 0.25, "What's recalled is actually relevant to the current run."),
      r("demo_quality", 0.20, "3-run demo clearly shows building-on-prior, not just storing."),
      r("no_context_bloat", 0.15, "Token usage stays bounded across runs."),
      r("storage_choice", 0.10, "Choice of store fits the memory shape."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "Failure Containment",
    brief: `Take a deliberately fragile agent (one provided in the drop, or one of your own). **Harden it**: add retries with backoff, fallbacks, and a circuit-breaker so one bad step can't cascade or loop forever. Show **before/after** on an injected failure — same failure, very different outcomes.`,
    skill_forced: "Designing for the step that *will* go wrong.",
    rubric: [
      r("survives_injection", 0.30, "Hardened agent survives the injected failure cleanly."),
      r("fails_safe", 0.25, "When it can't recover, it stops — does not loop or burn tokens."),
      r("circuit_breaker", 0.20, "Real circuit-breaker, not just a retry counter."),
      r("before_after_clarity", 0.15, "Same failure, side-by-side outcomes."),
      r("backoff_quality", 0.10, "Backoff is sensible, not constant."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "Build the Tool",
    brief: `Write **one custom tool / function** (ideally an MCP tool) that an agent can call — something not available off the shelf for your domain. Wire an agent to use it and show it doing something it could not before. The tool's schema + description is graded as hard as the code.`,
    skill_forced: "Recognizing the missing capability and shipping it as a clean, model-callable interface.",
    rubric: [
      r("schema_quality", 0.30, "Schema is crisp, typed, with clear param descriptions."),
      r("description_for_model", 0.25, "Description tells the model when/why to use the tool — not just what."),
      r("capability_extension", 0.25, "Tool extends real capability — not a thin wrapper."),
      r("agent_invokes_correctly", 0.20, "Demo shows the agent picking the tool unprompted when appropriate."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 50,
  },
  {
    track: "agentic_eng",
    title: "The Research Agent",
    brief: `Build a multi-step research agent: given a question, it **plans, searches multiple sources, synthesizes a structured report with citations**, and runs a **self-check pass** that flags unsupported claims. Ship code + a report it produced on a non-trivial question. The self-check must actually catch at least one unsupported claim.`,
    skill_forced: "Long-horizon decomposition + grounding + self-verification in one system.",
    rubric: [
      r("citations_resolve", 0.25, "Every citation in the report resolves to a real source."),
      r("claim_grounding", 0.25, "Claims in the report are supported by the cited sources."),
      r("self_check_works", 0.25, "Self-check pass catches a real unsupported claim."),
      r("plan_quality", 0.15, "Plan decomposes the question into real sub-questions."),
      r("report_structure", 0.10, "Report is readable, not a brain-dump."),
    ],
    submission_formats: ["zip"],
    max_file_mb: 80,
  },
  {
    track: "agentic_eng",
    title: "Forge Capstone",
    brief: `Design, spec, build, eval, and **deploy** an original agent that solves a real problem in your own work or life. Open brief — judged on the complete loop, not just the output. Submission must include: the spec, the operating doc, the eval scorecard, the code, and a **live link** to the running service.`,
    skill_forced: "Owning the entire spec → direct → verify → ship loop with no scaffolding.",
    rubric: [
      r("spec_fidelity", 0.20, "Code matches the spec; spec is precise enough to be matched."),
      r("eval_design", 0.20, "Eval set is honest, measures the right thing, runs."),
      r("shipping_velocity", 0.20, "It's actually live; the URL responds."),
      r("operating_doc_quality", 0.15, "Real autonomy slider; real never-list."),
      r("system_decomposition", 0.15, "Steps are tool-shaped; failure modes are mapped."),
      r("originality", 0.10, "Solves a real problem the learner actually has."),
    ],
    submission_formats: ["zip", "link"],
    max_file_mb: 80,
  },
];

// ---------- Compose the 40-week schedule
// Rotation: W1=S0, W2=S1, W3=S2, W4=S3, W5=S0, ...
// Difficulty bands by week number:
//   W1..W4   foundation
//   W5..W20  build
//   W21..W36 advanced
//   W37..W40 capstone
// Pro gate: weeks 1..4 free, weeks 5..40 Pro.
function difficultyForWeek(week: number): ForgeDifficulty {
  if (week <= 4) return "foundation";
  if (week <= 20) return "build";
  if (week <= 36) return "advanced";
  return "capstone";
}

export const FORGE_CHALLENGES: ForgeChallenge[] = (() => {
  const out: ForgeChallenge[] = [];
  // Use indices into each track array so the rotation is stable across reorderings.
  const TRACK_LISTS = [MENTAL_MODELS, DAILY_DRIVER, OPERATOR_4D, AGENTIC_ENG];
  for (let week = 1; week <= 40; week++) {
    const trackIdx = (week - 1) % 4;
    const slotIdx = Math.floor((week - 1) / 4);
    const base = TRACK_LISTS[trackIdx][slotIdx];
    out.push({
      ...base,
      week_number: week,
      difficulty: difficultyForWeek(week),
      is_pro_only: week > 4,
    });
  }
  return out;
})();
