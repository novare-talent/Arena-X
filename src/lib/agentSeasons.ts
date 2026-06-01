export type CardFormat =
  | "glitch_diagnosis"
  | "prediction"
  | "mental_model"
  | "repair"
  | "output_match"
  | "delegation_sim"
  | "spec_to_agent";

export type AgentCard = {
  id: string;
  format: CardFormat;
  title: string;
  difficulty: "intro" | "core" | "stretch";
  est_seconds: number;
  // MCQ fields
  transcript?: string;
  setup?: string;
  question?: string;
  options?: string[];
  correctAnswer?: number;
  // Open-ended fields
  prompt?: string;
  broken_prompt?: string;
  observed_failure?: string;
  task?: string;
  target_output?: string;
  task_description?: string;
  scenario?: string;
  goal?: string;
  environment?: string;
  // Explanation shown after MCQ answer (D5 90-100 rubric text)
  explanation: string;
  // Full rubric for open-ended cards (90-100 band per dimension)
  rubric?: { dim: string; label: string; perfect: string }[];
};

export type AgentSeason = {
  id: string;
  title: string;
  tagline: string;
  thesis: string;
  traits: string[];
  cards: AgentCard[];
};

// ─────────────────────────────────────────────────────────────────────────────
// S0 — Mental Models (15 cards)
// ─────────────────────────────────────────────────────────────────────────────
const S0: AgentSeason = {
  id: "S0",
  title: "Mental Models",
  tagline: "Understand what an LLM actually is",
  thesis: "Understand what an LLM actually is before you try to operate one.",
  traits: ["mental_model_accuracy", "failure_anticipation"],
  cards: [
    {
      id: "S0-001",
      format: "glitch_diagnosis",
      title: "The Strawberry Problem",
      difficulty: "intro",
      est_seconds: 90,
      transcript: `User: How many r's are in "strawberry"?\nModel: There are two r's in "strawberry".`,
      question: "What is the ROOT cause of this failure?",
      options: [
        "The model can't count",
        "The model sees tokens, not letters — 'strawberry' is a few tokens, not 10 characters",
        "The model wasn't trained on the word strawberry",
        "Temperature was set too high",
      ],
      correctAnswer: 1,
      explanation:
        "Names tokenization as the mechanism AND explains why letter-level tasks are the failure class, not a one-off bug.",
    },
    {
      id: "S0-002",
      format: "prediction",
      title: "9.11 vs 9.9",
      difficulty: "intro",
      est_seconds: 60,
      setup: "You ask a base chat model (no tools, no reasoning mode): 'Which is bigger, 9.11 or 9.9?'",
      question: "Predict the outcome and the reason.",
      options: [
        "It may answer 9.11, pattern-matching version-number / date-like strings over numeric value",
        "It will always answer 9.9 correctly",
        "It will refuse",
        "It depends only on temperature",
      ],
      correctAnswer: 0,
      explanation:
        "Explains the competition between numeric reasoning and string-pattern priors; notes a reasoning/tool path would fix it.",
    },
    {
      id: "S0-003",
      format: "mental_model",
      title: "Swiss-Cheese Capability",
      difficulty: "core",
      est_seconds: 120,
      prompt:
        "Explain, in your own words, why an LLM can write a working merge-sort but fail a primary-school subtraction — to a smart teammate who is NOT technical. Use one concrete analogy.",
      explanation:
        "Captures 'jagged / swiss-cheese' intelligence — competence is uneven and not predicted by human difficulty; analogy lands; no anthropomorphizing.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures 'jagged / swiss-cheese' intelligence — competence is uneven and not predicted by human difficulty; analogy lands; no anthropomorphizing.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Tight, non-technical, one clean analogy, no jargon leakage.",
        },
      ],
    },
    {
      id: "S0-004",
      format: "repair",
      title: "Hallucinated Citation",
      difficulty: "core",
      est_seconds: 180,
      broken_prompt: "Summarize the latest research on X and cite your sources.",
      observed_failure: "Model returned 3 plausible-looking but non-existent paper titles + DOIs.",
      task: "Rewrite the prompt so this failure class stops, without external tools.",
      explanation:
        "Gives the model an explicit out (abstain / 'no reliable source'), constrains to provided context, separates claim from citation.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Gives the model an explicit out (abstain / 'no reliable source'), constrains to provided context, separates claim from citation.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Correctly diagnoses that the cure is *permission to not answer*, not a tool — matches the no-tools constraint exactly.",
        },
      ],
    },
    {
      id: "S0-005",
      format: "glitch_diagnosis",
      title: "Knowledge of Self",
      difficulty: "stretch",
      est_seconds: 120,
      transcript: `User: What model are you and what's your knowledge cutoff?\nModel: I am GPT-4, trained by OpenAI, with a cutoff of September 2021.\n(The model is actually a different model entirely.)`,
      question: "Why is the model's self-description unreliable?",
      options: [
        "It's lying on purpose",
        "Self-identity is a learned/conditioned text pattern, not introspective fact — it has no privileged access to its own weights or training",
        "The cutoff is always wrong",
        "It was fine-tuned to deceive",
      ],
      correctAnswer: 1,
      explanation:
        "Explains that 'self-knowledge' is conditioned text + system-prompt-injected, so authoritative facts come from the provider, not the model.",
    },
    {
      id: "S0-006",
      format: "glitch_diagnosis",
      title: "Reversed Instructions",
      difficulty: "core",
      est_seconds: 120,
      transcript: `User: Write a 3-line product blurb for a sleep app. Do NOT mention sheep.\nModel: Drift off to dreamland with our app. Count sheep no longer — we'll lull you to sleep. Sweet dreams await.`,
      question: "Why did the model produce 'sheep' even though it was told not to?",
      options: [
        "The model is being defiant",
        "Negation is weakly conditioned — naming the forbidden token raises its salience, which often increases the chance the model produces it",
        "The system prompt was missing",
        "The user used capital letters wrong",
      ],
      correctAnswer: 1,
      explanation:
        "Names instruction-salience / negation-failure as a general class; explains why positive-only instructions help.",
    },
    {
      id: "S0-007",
      format: "prediction",
      title: "Date Arithmetic",
      difficulty: "core",
      est_seconds: 60,
      setup:
        "You ask a base chat model (no tools, no code execution): 'How many days are there from 2026-03-14 to 2026-09-02?'",
      question: "Predict what the model will do, and explain.",
      options: [
        "It will answer correctly with the exact number of days",
        "It will confidently give a wrong number that looks plausible (off by days or weeks), with no flag of uncertainty",
        "It will refuse to compute",
        "It will always ask for clarification",
      ],
      correctAnswer: 1,
      explanation:
        "Explains that base models do not actually execute arithmetic — they sample the most-likely-looking answer; confidence is uncorrelated with correctness; a tool/code path would fix it.",
    },
    {
      id: "S0-008",
      format: "prediction",
      title: "Off-by-One",
      difficulty: "stretch",
      est_seconds: 90,
      setup:
        "You ask a chat model: 'In a 0-indexed array of length 10, what is the index of the last element?' Then later in the same chat: 'And in a 1-indexed array of length 10, what is the index of the last element?'",
      question: "Predict the likely failure mode.",
      options: [
        "It will mix the two conventions and answer 10 for the 0-indexed case, or 9 for the 1-indexed case",
        "It will answer both perfectly every time",
        "It will only fail if the temperature is high",
        "It will refuse the second question",
      ],
      correctAnswer: 0,
      explanation:
        "Explains conditional-priors interference: the second question's answer is biased by the first; the convention boundary is exactly where token statistics break down.",
    },
    {
      id: "S0-009",
      format: "output_match",
      title: "Exact JSON Shape",
      difficulty: "intro",
      est_seconds: 120,
      target_output: `{"name": "alex", "age": 28, "skills": ["python", "sql"]}`,
      task_description:
        "Write a prompt that makes the model output EXACTLY this JSON object — same keys, same types, same order — with NO prose, NO code fences, NO commentary.",
      explanation:
        "Specifies the exact JSON, suppresses fences and prose with named formats; instructs on key order and types.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Specifies the exact JSON, suppresses fences and prose with named formats; instructs on key order and types.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Treats format-locking as a structural problem (schema + suppression of meta), not a politeness problem.",
        },
      ],
    },
    {
      id: "S0-010",
      format: "output_match",
      title: "Markdown Table with Footnote",
      difficulty: "core",
      est_seconds: 150,
      target_output:
        "| Country | Capital | Note |\n|---|---|---|\n| India | New Delhi¹ | seat of government |\n| Japan | Tokyo | |\n| Brazil | Brasília | moved 1960 |\n\n¹ technically the National Capital Territory.",
      task_description:
        "Write a prompt that produces this exact 4×3 markdown table with a footnote marker (¹) in one cell and the footnote rendered below the table.",
      explanation:
        "Either gives a full template to fill or uses precise format vocabulary (footnote markers, table syntax).",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Either gives a full template to fill or uses precise format vocabulary (footnote markers, table syntax).",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Recognizes the right lever is providing a template the model fills, not describing the format in prose.",
        },
      ],
    },
    {
      id: "S0-011",
      format: "output_match",
      title: "Single Token Answer",
      difficulty: "stretch",
      est_seconds: 120,
      target_output: "yes",
      task_description:
        'Write a prompt that forces the model to answer with exactly the single word "yes", and nothing else — no punctuation, no quotes, no whitespace before/after.',
      explanation:
        "Locks output via an explicit constraint AND demonstrates the exact desired output, suppressing chatter.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Locks output via an explicit constraint AND demonstrates the exact desired output, suppressing chatter.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Identifies that length and politeness are the two failure axes and closes both.",
        },
      ],
    },
    {
      id: "S0-012",
      format: "repair",
      title: "Wishy-Washy Summary",
      difficulty: "intro",
      est_seconds: 150,
      broken_prompt: "Summarize the attached article.",
      observed_failure:
        "Output is generic filler ('the article discusses important topics about...') with no actual content from the text.",
      task: "Rewrite the prompt so the summary contains substantive, source-grounded claims.",
      explanation:
        "Replaces 'summarize' with explicit extraction targets (numbered claims, named entities, quoted phrases).",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Replaces 'summarize' with explicit extraction targets (numbered claims, named entities, quoted phrases).",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses the failure as 'summary is an under-constrained verb' and replaces it with extraction structure.",
        },
      ],
    },
    {
      id: "S0-013",
      format: "repair",
      title: "Constraint Leak",
      difficulty: "core",
      est_seconds: 180,
      broken_prompt:
        'SYSTEM: You are a helpful assistant. Always respond in JSON with keys "answer" and "confidence".\nUSER: What\'s the capital of France?',
      observed_failure:
        'Model echoed parts of the system prompt in its response and added prose around the JSON, e.g.: "As a helpful assistant, here is your JSON: { \\"answer\\": \\"Paris\\", ... }"',
      task: "Rewrite the prompt so the model produces clean JSON with no echo and no prose.",
      explanation:
        "Strips the persona, locks output format with an explicit suppression rule, and moves rule to system instead of repeating in user.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Strips the persona, locks output format with an explicit suppression rule, and moves rule to system instead of repeating in user.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses that the *persona itself* is a vector for leakage; treats system instructions as machine-readable, not motivational.",
        },
      ],
    },
    {
      id: "S0-014",
      format: "mental_model",
      title: "Why Temperature ≠ Creativity",
      difficulty: "intro",
      est_seconds: 120,
      prompt:
        "Explain, to a non-technical PM who keeps asking to 'turn up the temperature for more creative output,' what temperature ACTUALLY does and why high temperature is not the same as creativity. Use one concrete analogy.",
      explanation:
        "Names sampling distribution / probability flattening; explains that high temperature increases variance (including nonsense), not creativity; creativity is a separate dimension.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names sampling distribution / probability flattening; explains that high temperature increases variance (including nonsense), not creativity; creativity is a separate dimension.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "PM-readable, one concrete analogy, no jargon leakage.",
        },
      ],
    },
    {
      id: "S0-015",
      format: "mental_model",
      title: "Context Window ≠ Memory",
      difficulty: "stretch",
      est_seconds: 150,
      prompt:
        "A user says: 'The model \"forgot\" what we agreed in our chat 20 messages ago — why does it keep doing that?' Explain to them, in plain English, what's actually happening with the context window and why this isn't 'forgetting' the way humans forget.",
      explanation:
        "Captures: the model has no persistent state; each turn re-reads the whole transcript; once content slides out of the window (or summary slot), it is genuinely *gone* until reintroduced. Distinguishes from human episodic forgetting.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: the model has no persistent state; each turn re-reads the whole transcript; once content slides out of the window (or summary slot), it is genuinely *gone* until reintroduced. Distinguishes from human episodic forgetting.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Clear, non-technical, one concrete framing the user could repeat back.",
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// S1 — The Daily Driver (20 cards)
// ─────────────────────────────────────────────────────────────────────────────
const S1: AgentSeason = {
  id: "S1",
  title: "The Daily Driver",
  tagline: "Operate the model you have like a pro",
  thesis:
    "Operate the model you have like a pro — pick it, feed it, wipe it, and know when to reach for a tool.",
  traits: ["operating_fluency", "context_management"],
  cards: [
    {
      id: "S1-001",
      format: "prediction",
      title: "Wrong Tool, Right Question",
      difficulty: "intro",
      est_seconds: 75,
      setup:
        "Teammate pastes a 40-page PDF into a plain chat model with no file/upload tool and asks for a summary. It 'works' but invents details on pages 30+.",
      question: "Predict why detail quality collapses late in the doc.",
      options: [
        "The model gets tired",
        "PDFs can't be summarized",
        "Pasted text past the effective context budget gets truncated or attended-to weakly — late pages fall out of working memory",
        "Temperature drift",
      ],
      correctAnswer: 2,
      explanation:
        "Frames the context window as finite working memory; recommends chunking or a retrieval/upload tool; distinguishes 'in context' from 'attended-to well.'",
    },
    {
      id: "S1-002",
      format: "output_match",
      title: "One-Shot Standup Note",
      difficulty: "core",
      est_seconds: 240,
      target_output:
        "Yesterday: shipped auth refactor, unblocked Sanat on the ELO write path.\nToday: pack validator + drop-in proof.\nBlockers: need staging MCP creds.",
      task_description:
        "Raw material: a messy ~300-word brain-dump of someone's day.\nTask: write ONE prompt that turns any such brain-dump into exactly this 3-line shape — Yesterday / Today / Blockers — every time, including on unseen dumps. Treat this as a reusable daily-driver prompt.",
      explanation:
        "Crisp, reusable template prompt with the schema fixed and an example; would work on unseen dumps without edits.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Crisp, reusable template prompt with the schema fixed and an example; would work on unseen dumps without edits.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Recognizes this is a repeatable daily task worth a saved/custom-instruction prompt, not a one-off — names that.",
        },
      ],
    },
    {
      id: "S1-003",
      format: "repair",
      title: "Reasoning Tax",
      difficulty: "core",
      est_seconds: 180,
      broken_prompt:
        "Using a heavy reasoning model: 'Reformat this list alphabetically.' (Waits 40s, burns tokens.)",
      observed_failure: "Correct answer, but slow and expensive for a trivial task.",
      task: "Fix the WORKFLOW (not just the prompt) so trivial tasks stop paying the reasoning tax.",
      explanation:
        "Routes trivial/deterministic work to a fast non-reasoning model (or local), reserves reasoning for genuinely hard multi-step tasks; states the cost/latency/quality triangle explicitly.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Concrete routing rule expressed as a workflow — e.g., 'default to fast model, escalate to reasoning when multi-step or novel.' Implementable today.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Routes trivial/deterministic work to a fast non-reasoning model (or local), reserves reasoning for genuinely hard multi-step tasks; states the cost/latency/quality triangle explicitly.",
        },
      ],
    },
    {
      id: "S1-004",
      format: "mental_model",
      title: "When to Wipe",
      difficulty: "core",
      est_seconds: 120,
      prompt:
        "Explain to a new Pro user when they should START A NEW CHAT vs keep going in the current one. Give a rule they can actually remember, and one example each way.",
      explanation:
        "Context = working memory: wipe when the thread is polluted with stale/contradictory state or a new task begins; keep when continuity helps. Memorable rule + clean examples.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Context = working memory: wipe when the thread is polluted with stale/contradictory state or a new task begins; keep when continuity helps. Memorable rule + clean examples.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "One-line rule a non-technical user will actually retain.",
        },
      ],
    },
    {
      id: "S1-005",
      format: "output_match",
      title: "Tool-or-No-Tool",
      difficulty: "stretch",
      est_seconds: 200,
      target_output:
        "A prompt that answers from its own knowledge when stable, but explicitly triggers web search ONLY when the question is time-sensitive (prices, who-holds-a-role, latest version).",
      task_description:
        "Write the instruction block that encodes that decision rule. The model should know — from your instruction alone — when to skip search and when to invoke it.",
      explanation:
        "Cleanly separates stable knowledge from changing facts; triggers tools on rate-of-change, not on confidence; avoids over-searching.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Decision rule is stated as machine-readable conditions (categories of question that trigger or skip), not vibes. Concise.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Cleanly separates stable knowledge from changing facts; triggers tools on rate-of-change, not on confidence; avoids over-searching.",
        },
      ],
    },
    {
      id: "S1-006",
      format: "prediction",
      title: "Voice in a Cafe",
      difficulty: "intro",
      est_seconds: 60,
      setup:
        "A user dictates a long, technical paragraph using voice input in a busy cafe. The transcribed text reads beautifully but contains three subtle word-substitutions (e.g., 'principal' for 'principle', 'cite' for 'site').",
      question:
        "Predict the main failure mode of voice input here and the right operating response.",
      options: [
        "The microphone broke",
        "Speech-to-text degrades on rare/technical terms in noisy environments and confidently picks plausible homophones — re-read before sending",
        "The model misunderstood the meaning",
        "Voice always works worse than typing",
      ],
      correctAnswer: 1,
      explanation:
        "Distinguishes the speech-to-text step from the LLM step; names confidence-without-correctness in transcription; recommends a read-back habit.",
    },
    {
      id: "S1-007",
      format: "prediction",
      title: "Stale Custom Instructions",
      difficulty: "core",
      est_seconds: 90,
      setup:
        "Six months ago a user set custom instructions: 'I'm a Python backend engineer working on the payments service. Be concise. Assume Postgres.' They've since switched companies and now write Go. They never updated the instructions.",
      question: "Predict where this leaks first.",
      options: [
        "It won't — custom instructions are ignored unless re-stated",
        "Quietly: the model will frame Go answers in Python idioms and casually suggest Postgres-flavored solutions; the user might not notice until something breaks",
        "Loudly: the model will refuse to help with Go",
        "Only on long chats, not short ones",
      ],
      correctAnswer: 1,
      explanation:
        "Treats custom instructions as a persistent prior that biases every answer subtly; names the silent-drift failure mode; recommends a quarterly audit habit.",
    },
    {
      id: "S1-008",
      format: "prediction",
      title: "Image Edit by Words",
      difficulty: "core",
      est_seconds: 90,
      setup:
        "A user uploads a photo of a whiteboard and types: 'Edit the photo to change the red box to blue and add my logo in the corner.' The model has multimodal input but no actual image-editing tool.",
      question: "Predict the most likely failure mode.",
      options: [
        "It returns the edited image perfectly",
        "It returns prose describing how the image would look, or a generated lookalike that drops most of the original detail — because it cannot actually edit the input, only generate from a description of it",
        "It refuses entirely",
        "It crashes",
      ],
      correctAnswer: 1,
      explanation:
        "Separates 'sees the image' from 'edits the image' — the model can describe inputs but generation is from text; recommends a proper image-editing tool for the real task.",
    },
    {
      id: "S1-009",
      format: "prediction",
      title: "Reasoning on a List",
      difficulty: "intro",
      est_seconds: 60,
      setup:
        "A user pipes a 200-line CSV through a heavy reasoning model with the prompt 'sort by date descending.' They watch a 45-second 'thinking' indicator and pay 30× the per-token cost vs the fast model.",
      question: "Predict the operating mistake.",
      options: [
        "There's no mistake — bigger model means more accurate sort",
        "Reasoning models are designed for hard multi-step problems; on a deterministic reshape the extra latency and cost buy you nothing — wrong tool selection, not wrong prompt",
        "The CSV is too large",
        "They should have used voice input",
      ],
      correctAnswer: 1,
      explanation:
        "Names the cost/latency/quality triangle and that reasoning mode is the wrong corner for deterministic transforms; recommends fast model or a code interpreter tool.",
    },
    {
      id: "S1-010",
      format: "output_match",
      title: "Weekly Slack Digest",
      difficulty: "intro",
      est_seconds: 180,
      target_output:
        "Shipped:\n- <project A>: <one-line outcome>\n- <project B>: <one-line outcome>\nAt risk:\n- <project C>: <one-line reason>\nDecisions needed:\n- <one-line ask, owner, deadline>",
      task_description:
        "Raw material: a week's worth of Slack messages from a 5-person team channel (highlights, complaints, jokes, links, status notes — all mixed in).\nTask: write ONE reusable prompt that turns any such week into exactly this structure. Must work on weeks with NO 'at risk' items (leave that section empty rather than inventing items).",
      explanation:
        "Reusable template with explicit empty-section handling, an example, and instructions to ignore noise.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Reusable template with explicit empty-section handling, an example, and instructions to ignore noise.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Names the failure modes (hallucinated at-risk items, noise in the dump) and closes them in the instruction.",
        },
      ],
    },
    {
      id: "S1-011",
      format: "output_match",
      title: "Email Triage Rule",
      difficulty: "core",
      est_seconds: 200,
      target_output:
        "REPLY: <subject> | <one-line reason>\nSNOOZE: <subject> | <reason + when to revisit>\nIGNORE: <subject> | <reason>",
      task_description:
        "Task: write a single reusable instruction block that classifies each email in a user's inbox as REPLY, SNOOZE, or IGNORE, and produces output in exactly the format above. The classifier should NOT use email importance flags from the client; it must reason about the content + sender context provided in each message. Must abstain (no classification line) on emails that lack enough information to decide.",
      explanation:
        "Crisp, machine-readable classifier with an explicit abstention case and a clean output schema.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Crisp, machine-readable classifier with an explicit abstention case and a clean output schema.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses that the dangerous failure is silent mis-classification; provides the model an out (skip) rather than forcing a guess.",
        },
      ],
    },
    {
      id: "S1-012",
      format: "output_match",
      title: "Calendar Conflict Resolver",
      difficulty: "core",
      est_seconds: 180,
      target_output:
        "Option 1: <weekday>, <HH:MM-HH:MM TZ>\nOption 2: <weekday>, <HH:MM-HH:MM TZ>\nOption 3: <weekday>, <HH:MM-HH:MM TZ>",
      task_description:
        "Raw material: the user's free-busy data for the next 5 weekdays + a constraint (e.g., 'I want a 45-min slot, after 11am IST, not on Fridays').\nTask: write a reusable prompt that returns EXACTLY three options in the exact format above — no commentary, no preamble, no apologies if fewer than three valid slots exist (then return as many as exist, never invent).",
      explanation:
        "Tight format lock, explicit non-invention rule, allows fewer options gracefully.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Tight format lock, explicit non-invention rule, allows fewer options gracefully.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses the failure mode as the model inventing slots to fill the template; closes that path explicitly.",
        },
      ],
    },
    {
      id: "S1-013",
      format: "repair",
      title: "Stale Doc in the Loop",
      difficulty: "core",
      est_seconds: 180,
      broken_prompt:
        "Same long chat used for 50 turns. The user pasted an old API spec in turn 4; the spec changed last week.",
      observed_failure:
        "The model keeps suggesting deprecated endpoint names and stale parameter shapes. Calling them out in-thread only works for a turn or two before they creep back.",
      task: "Fix the OPERATING habit, not the prompt — what should the user do to make the failure stop permanently?",
      explanation:
        "Names polluted context as the root cause and that no prompt can undo it inside the same thread; wipes the thread.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Concrete habit: start a new chat, paste only the current spec, save the spec as a reference doc/custom instruction.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Names polluted context as the root cause and that no prompt can undo it inside the same thread; wipes the thread.",
        },
      ],
    },
    {
      id: "S1-014",
      format: "repair",
      title: "Always-Searching",
      difficulty: "intro",
      est_seconds: 150,
      broken_prompt: "Custom instruction: 'Always check the web before answering.'",
      observed_failure:
        "Every answer — even 'what is 2+2' or 'explain a for-loop' — triggers a slow web search and citation block. Latency on simple questions has 5x'd.",
      task: "Fix the instruction so search is triggered selectively, without losing it for the cases that genuinely need fresh info.",
      explanation:
        "Rewrites with a precise trigger rule: search only for time-sensitive / changing / current-state questions; default off otherwise.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Rewrites with a precise trigger rule: search only for time-sensitive / changing / current-state questions; default off otherwise.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Treats 'always' as the bug (over-triggering), not search itself; carves out exactly the time-sensitive case.",
        },
      ],
    },
    {
      id: "S1-015",
      format: "repair",
      title: "Multimodal When Text Would Do",
      difficulty: "stretch",
      est_seconds: 200,
      broken_prompt:
        "User screenshots their terminal log, uploads the image, and asks 'why is this failing?' The error text is already perfectly typeable.",
      observed_failure:
        "Model OCR's the image, hallucinates one of the long stack-trace hex addresses, and chases a phantom bug. Investigation cost: 20 minutes.",
      task: "Fix the operating habit so this class of error stops.",
      explanation:
        "Diagnoses the failure as wrong-modality choice — OCR adds a noisy step where none was needed; matches input modality to data type.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Clear habit: paste machine-readable text (logs, code, errors) as text; reserve image input for genuinely visual content (charts, UI, handwriting).",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses the failure as wrong-modality choice — OCR adds a noisy step where none was needed; matches input modality to data type.",
        },
      ],
    },
    {
      id: "S1-016",
      format: "repair",
      title: "Custom Instruction Spillover",
      difficulty: "core",
      est_seconds: 180,
      broken_prompt: "Custom instructions: 'I'm writing a horror novel. Be vivid and dark.'",
      observed_failure:
        "User now needs help with a customer-support email to refund a delayed shipment. The model produces a refund response that opens with 'In the cold silence between sent and received, a parcel grew restless...'",
      task: "Fix the operating setup so creative-writing custom instructions stop bleeding into unrelated tasks.",
      explanation:
        "Frames custom instructions as a global prior that contaminates every task — solves at the platform level (scoping), not per-prompt.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Concrete fix: separate projects/workspaces/profiles per task type so instructions are scoped; if unavailable, disable custom instructions for routine tasks.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Frames custom instructions as a global prior that contaminates every task — solves at the platform level (scoping), not per-prompt.",
        },
      ],
    },
    {
      id: "S1-017",
      format: "mental_model",
      title: "Why Bigger ≠ Better",
      difficulty: "intro",
      est_seconds: 120,
      prompt:
        "Explain to a PM who keeps reaching for the biggest, most expensive model 'just to be safe' WHY a smaller / faster model might actually be a better default for 90% of their tasks. Use a concrete example from typical PM work (writing a tweet, summarizing a meeting, drafting an email).",
      explanation:
        "Frames model choice as a cost/latency/quality triangle; names that quality saturates on routine tasks while latency and cost don't; concrete PM example lands.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Frames model choice as a cost/latency/quality triangle; names that quality saturates on routine tasks while latency and cost don't; concrete PM example lands.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "PM-readable, one tight concrete example, no jargon.",
        },
      ],
    },
    {
      id: "S1-018",
      format: "mental_model",
      title: "What Reasoning Mode Actually Does",
      difficulty: "core",
      est_seconds: 150,
      prompt:
        "Explain, in plain English to a smart non-engineer, what a 'reasoning model' is actually doing under the hood compared to a normal chat model. Why does it take longer and cost more? Use one analogy. Be honest about the limits — what reasoning mode does NOT fix.",
      explanation:
        "Captures: the model emits a long internal scratchpad of intermediate steps before the final answer, which costs tokens and time but helps on multi-step problems; does NOT fix hallucinations or knowledge gaps; analogy lands.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: the model emits a long internal scratchpad of intermediate steps before the final answer, which costs tokens and time but helps on multi-step problems; does NOT fix hallucinations or knowledge gaps; analogy lands.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "One analogy, plain English, ~100 words, no jargon leak.",
        },
      ],
    },
    {
      id: "S1-019",
      format: "mental_model",
      title: "Cost / Latency / Quality",
      difficulty: "stretch",
      est_seconds: 150,
      prompt:
        "Explain the cost / latency / quality triangle of operating an LLM as if to a designer choosing models for a feature spec. Each corner has a real cost when you push it. Give one feature example where each corner is the right one to prioritize. The explanation must be actionable — they should be able to use it in their next spec.",
      explanation:
        "Names the trilemma honestly — you cannot get all three; each corner is the right one in specific shipped contexts (e.g., real-time chat = latency, bulk overnight reports = cost, legal review = quality); designer can pull a lever next sprint.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names the trilemma honestly — you cannot get all three; each corner is the right one in specific shipped contexts (e.g., real-time chat = latency, bulk overnight reports = cost, legal review = quality); designer can pull a lever next sprint.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Designer-readable, actionable, one example per corner, no jargon.",
        },
      ],
    },
    {
      id: "S1-020",
      format: "mental_model",
      title: "Custom Instructions vs Memory",
      difficulty: "core",
      est_seconds: 150,
      prompt:
        "A new Pro user asks: 'What's the difference between Custom Instructions and the Memory feature? When should I use which?' Explain — with a memorable rule and one concrete example each — to someone who has used neither.",
      explanation:
        "Captures: custom instructions are a fixed, user-authored prior the user controls; memory is an automatic, evolving store the model writes to from conversations. Custom for stable preferences, memory for evolving context. Memorable rule and clear examples.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: custom instructions are a fixed, user-authored prior the user controls; memory is an automatic, evolving store the model writes to from conversations. Custom for stable preferences, memory for evolving context. Memorable rule and clear examples.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "One-line rule the user will retain; two concrete examples.",
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// S2 — The 4D Operator (20 cards)
// ─────────────────────────────────────────────────────────────────────────────
const S2: AgentSeason = {
  id: "S2",
  title: "The 4D Operator",
  tagline: "Delegation · Description · Discernment · Diligence",
  thesis:
    "Fluency isn't prompting — it's judgment: what to delegate, how to describe it, how to tell if the output is real, and when not to trust any of it.",
  traits: ["delegation", "description", "discernment", "diligence"],
  cards: [
    {
      id: "S2-001",
      format: "delegation_sim",
      title: "Keep or Hand Off",
      difficulty: "intro",
      est_seconds: 150,
      scenario:
        "You have 90 minutes before an investor call. Tasks: (a) pull 3 comparable company valuations, (b) write the cold email to the next 5 prospects, (c) decide the round size, (d) format the cap table.",
      task: "Split these into KEEP (you do) vs DELEGATE (AI does), and justify the split in one line each.",
      explanation:
        "Delegates retrievable/formattable work (a, d), drafts with AI but owns (b), KEEPS the judgment call (c) with a clear 'this is mine because stakes/irreversibility' rationale.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Clean, scannable KEEP/DELEGATE table; one-line rationale per item is readable by a peer without context.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Delegates retrievable/formattable work (a, d), drafts with AI but owns (b), KEEPS the judgment call (c) with a clear 'this is mine because stakes/irreversibility' rationale.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "States the underlying principle (delegate retrieval/format, keep judgment/stakes/irreversibility) and would generalize to a different scenario.",
        },
      ],
    },
    {
      id: "S2-002",
      format: "output_match",
      title: "Describe It So It Lands",
      difficulty: "core",
      est_seconds: 240,
      target_output:
        "A rejection email to a candidate that is warm, specific to their interview, and leaves the door open for a future round — under 90 words.",
      task_description:
        "Write the prompt + context block you'd give an AI so it produces that, for ANY candidate, without you editing it. The model never sees the candidate file — you must front-load the slots it will need.",
      explanation:
        "Front-loads the missing context the model can't know (interview specifics as variables), sets tone + length, gives one gold example — Description done well.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Front-loads the missing context the model can't know (interview specifics as variables), sets tone + length, gives one gold example — Description done well.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Recognizes the AI's failure mode here is genericness, and pre-empts it with specifics — correct diagnosis.",
        },
      ],
    },
    {
      id: "S2-003",
      format: "glitch_diagnosis",
      title: "Confident and Wrong",
      difficulty: "core",
      est_seconds: 180,
      transcript:
        "Prompt: \"Summarize this contract's termination clause and flag any auto-renewal.\"\nOutput: \"The contract auto-renews annually unless cancelled 60 days prior (Section 8.2).\"\n(The contract has NO Section 8.2 and no auto-renewal clause at all.)",
      question: "What's the discernment failure, and what's the ONE check that catches it?",
      options: [
        "Trust it; AI is good at contracts",
        "It fabricated a specific-looking citation; the catch is verifying the cited section exists in the source before acting",
        "Re-run at lower temperature",
        "Ask it if it's sure",
      ],
      correctAnswer: 1,
      explanation:
        "Names that specificity is NOT evidence — fabricated citations look most real; the only check is grounding against the source. Generalizes to a verification habit.",
    },
    {
      id: "S2-004",
      format: "delegation_sim",
      title: "The Line You Don't Cross",
      difficulty: "stretch",
      est_seconds: 210,
      scenario:
        "Four asks land in your inbox: (1) draft a LinkedIn post, (2) summarize a candidate's medical disclosure for the hiring panel, (3) write boilerplate for an NDA, (4) diagnose why a payment to a US client got stuck under FEMA.",
      task: "For each: full-delegate / draft-then-verify / do-not-delegate — and say why.",
      explanation:
        "Full-delegates (1); ring-fences (2) on privacy/sensitivity grounds; draft-then-verify (3) with a lawyer; draft-then-verify (4) but treats regulated/financial output as advisory only. Diligence reasoning is explicit.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Full-delegates (1); ring-fences (2) on privacy/sensitivity grounds; draft-then-verify (3) with a lawyer; draft-then-verify (4) but treats regulated/financial output as advisory only. Diligence reasoning is explicit.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Articulates the principle: irreversibility + sensitivity + regulation raise the verification bar.",
        },
      ],
    },
    {
      id: "S2-005",
      format: "repair",
      title: "Verification Loop",
      difficulty: "stretch",
      est_seconds: 200,
      broken_prompt:
        "Find me the 5 best-fit YC S26 companies for our BD outreach and their founders' emails.",
      observed_failure:
        "Returned 5 real-sounding companies, 2 of which don't exist, and 3 guessed emails.",
      task: "Redesign the ask so the output is trustworthy — without assuming a specific tool.",
      explanation:
        "Splits 'find' (needs grounded retrieval) from 'guess' (forbid); demands sources per claim; permits 'unknown' for emails; matches the no-specific-tool constraint.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Splits 'find' (needs grounded retrieval) from 'guess' (forbid); demands sources per claim; permits 'unknown' for emails; matches the no-specific-tool constraint.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names the failure as fabrication-by-completion — the model fills the answer-shaped hole; cure is structured permission to abstain. Generalizes.",
        },
      ],
    },
    {
      id: "S2-006",
      format: "delegation_sim",
      title: "Scope the Handoff",
      difficulty: "intro",
      est_seconds: 120,
      scenario:
        "A new hire asks: 'I have a 6-hour task: read 20 customer-support tickets, write a 1-page summary of common complaints, and propose 3 product fixes.'",
      task: "Show them how to split that 6-hour task into a 'do with AI' block and a 'do alone' block. Be specific about the handoff boundary.",
      explanation:
        "AI clusters/drafts; human owns the proposal (judgment + product knowledge) and validates the clusters. The handoff point is where novel synthesis begins.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Concrete split with named tasks per block (e.g., AI: cluster tickets + draft summary; alone: validate clusters + propose fixes); handoff is described as a hand-off, not 'collaboration.'",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "AI clusters/drafts; human owns the proposal (judgment + product knowledge) and validates the clusters. The handoff point is where novel synthesis begins.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Articulates the principle: AI for retrieval + first draft, human for synthesis + judgment. Names the handoff criterion explicitly.",
        },
      ],
    },
    {
      id: "S2-007",
      format: "delegation_sim",
      title: "Hard Stop Tasks",
      difficulty: "core",
      est_seconds: 180,
      scenario:
        "A founder asks an AI assistant to: (1) draft a board update, (2) write a termination letter to an underperforming employee, (3) summarize what happened on Slack yesterday, (4) make the final call on whether to lay off 20% of the team.",
      task: "Classify each as full-delegate / draft-then-verify / do-not-delegate. Justify the do-not-delegate calls with a principle, not a vibe.",
      explanation:
        "Drafts (1, 2) with explicit human review (legal review on 2); full-delegates (3); ring-fences (4) as a non-delegatable judgment + people decision. Principle stated.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Drafts (1, 2) with explicit human review (legal review on 2); full-delegates (3); ring-fences (4) as a non-delegatable judgment + people decision. Principle stated.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Articulates: irreversible + emotionally-loaded + accountability-bearing decisions are hard stops; the AI is a drafter, not a decider.",
        },
      ],
    },
    {
      id: "S2-008",
      format: "mental_model",
      title: "Solo Skills",
      difficulty: "intro",
      est_seconds: 150,
      prompt:
        "Explain to a junior consultant which kinds of tasks they should still try to do WITHOUT any AI for the first 6 months of their career — and why. The advice must be specific (not 'practice your skills') and have a clear cutoff condition for when to start delegating each one.",
      explanation:
        "Names the principle: do unaided the things you must JUDGE later (so you can verify AI's output); pre-AI reps are how discernment is built. Each named task has a clean 'when to delegate' cutoff.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names the principle: do unaided the things you must JUDGE later (so you can verify AI's output); pre-AI reps are how discernment is built. Each named task has a clean 'when to delegate' cutoff.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Tight, junior-readable, examples land; would survive being repeated by the junior to their next teammate.",
        },
      ],
    },
    {
      id: "S2-009",
      format: "output_match",
      title: "Hidden Context",
      difficulty: "core",
      est_seconds: 210,
      target_output:
        "A two-sentence intro paragraph for a job-offer letter that mentions the candidate's specific accomplishment from interview round 3, their start date, and the team lead's name — warm, professional, no clichés.",
      task_description:
        "Write the reusable prompt block. The model never sees the candidate file. You must explicitly slot the missing context (accomplishment, start date, lead name) and forbid clichés ('thrilled', 'rockstar', 'family').",
      explanation:
        "Explicit slot variables for each piece of missing context, banned-words list, one gold example. Reusable on any candidate.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Explicit slot variables for each piece of missing context, banned-words list, one gold example. Reusable on any candidate.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses the AI's failure as fill-with-clichés-when-context-missing; closes BOTH the missing-context and the cliché paths.",
        },
      ],
    },
    {
      id: "S2-010",
      format: "output_match",
      title: "Calibrated Constraints",
      difficulty: "stretch",
      est_seconds: 240,
      target_output:
        "A product changelog entry that lists each shipped change in one line, marks user-visible vs internal, and ends with a one-line callout if anything is a breaking change — OR a single line saying 'no breaking changes' if none.",
      task_description:
        "Write the reusable prompt. The hard requirement: when there are no breaking changes, the output must SAY 'no breaking changes' rather than omitting the line. Many models silently drop sections that are empty — close that hole.",
      explanation:
        "Recognizes silent omission as the failure class and forces the empty-section literal — that's discernment-informed description.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Explicit format; the empty-section behavior is named; one example shows the no-breaking-changes case.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Recognizes silent omission as the failure class and forces the empty-section literal — that's discernment-informed description.",
        },
      ],
    },
    {
      id: "S2-011",
      format: "mental_model",
      title: "Worked Example > Adjective",
      difficulty: "core",
      est_seconds: 120,
      prompt:
        "Explain to a product manager why a SINGLE worked example in a prompt outperforms three adjectives ('be concise, professional, warm') for getting consistent AI output. Give one concrete prompt-rewrite that shows the swap.",
      explanation:
        "Captures: adjectives are interpreted on a wide prior; an example collapses the prior to a narrow target. The swap demonstrates the principle on a realistic task.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: adjectives are interpreted on a wide prior; an example collapses the prior to a narrow target. The swap demonstrates the principle on a realistic task.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "PM-readable; the rewrite is short and obviously better.",
        },
      ],
    },
    {
      id: "S2-012",
      format: "glitch_diagnosis",
      title: "Hallucinated Number",
      difficulty: "core",
      est_seconds: 150,
      transcript:
        "Prompt: \"What was Tesla's Q3 2025 free cash flow?\"\nOutput: \"Tesla's Q3 2025 free cash flow was approximately $3.4 billion, a 28% YoY increase, primarily driven by Cybertruck deliveries.\"\n(No source. The actual number is materially different.)",
      question:
        "What's the discernment failure here, and what's the ONE habit that prevents it from biting in real work?",
      options: [
        "The number sounds right — trust it",
        "Numbers without sources are guesses; require a primary-source link before quoting any number in real work",
        "Ask the model where it got the number",
        "Cross-check with another LLM",
      ],
      correctAnswer: 1,
      explanation:
        "Names the failure as confident-completion-without-grounding; the habit is 'no number without a source link, period.' Generalizes the rule.",
    },
    {
      id: "S2-013",
      format: "glitch_diagnosis",
      title: "Plausible Code",
      difficulty: "stretch",
      est_seconds: 180,
      transcript:
        "Prompt: \"Write a Python one-liner that returns the median of a list.\"\nOutput: \"import statistics; median = lambda lst: statistics.median(lst)\"\n(Works. But on the next call:)\nPrompt: \"Now extend it to handle a NumPy array.\"\nOutput: \"import statistics; median = lambda lst: statistics.median(lst)\\n# works for both lists and NumPy arrays out of the box\"\n(statistics.median on a NumPy array silently coerces and is much slower than np.median — and on some shapes, errors. The comment is wrong.)",
      question: "Discernment failure?",
      options: [
        "The code is fine, just trust it",
        "The output looks competent and was correct on round one, which makes the wrong claim in round two harder to catch — never trust drift across turns without re-testing",
        "Use a bigger model",
        "Read the docs after the fact",
      ],
      correctAnswer: 1,
      explanation:
        "Names: prior-round correctness is the trap — it inherits trust the new claim hasn't earned. Habit: every new claim is independently verified, regardless of past accuracy in the same chat.",
    },
    {
      id: "S2-014",
      format: "mental_model",
      title: "Confidence ≠ Accuracy",
      difficulty: "core",
      est_seconds: 150,
      prompt:
        "Explain to a journalist why the most confident, specific, well-formatted AI answers can be the MOST dangerous — and what one habit protects them. Use one short fictional example of a confident-and-wrong answer that would have made it into a real story without the habit.",
      explanation:
        "Names: confidence + specificity are signals of fluency, not truth; specifics make hallucinations look real; the habit is source-or-it-didn't-happen. Example is realistic and would have shipped.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names: confidence + specificity are signals of fluency, not truth; specifics make hallucinations look real; the habit is source-or-it-didn't-happen. Example is realistic and would have shipped.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Journalist-readable, one tight example, no jargon.",
        },
      ],
    },
    {
      id: "S2-015",
      format: "delegation_sim",
      title: "Privacy Tripwire",
      difficulty: "core",
      est_seconds: 150,
      scenario:
        "A teammate asks a public AI tool to: \"Summarize the attached doc and tell me which employees are flight risks.\" The doc is a confidential exit-interview compilation containing names, salaries, and DEI demographics.",
      task: "Stop the action and explain what went wrong, plus the corrected delegation.",
      explanation:
        "Names the privacy violation (uploading confidential PII to public AI), routes the work to a policy-approved environment OR redacts before any model touches it, and refuses the predictive 'flight risk' framing as a bias trap.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Names the privacy violation (uploading confidential PII to public AI), routes the work to a policy-approved environment OR redacts before any model touches it, and refuses the predictive 'flight risk' framing as a bias trap.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Explains: sensitive personnel data + predictive labels = compounded risk (privacy + algorithmic bias); diligence is the gate, not the prompt.",
        },
      ],
    },
    {
      id: "S2-016",
      format: "repair",
      title: "Attribution Chain",
      difficulty: "core",
      est_seconds: 180,
      broken_prompt:
        "Write a research brief on lithium battery supply chains, with citations.",
      observed_failure:
        "Output had 12 inline citations. 3 pointed at real papers, 4 at real journals with wrong volumes, 5 entirely fabricated.",
      task: "Fix the ask so the output is attributable end-to-end — even if that means fewer citations.",
      explanation:
        "Restricts citations to a provided source list or to URLs the model can retrieve and verify; explicitly permits 'no citation found' rather than fabrication; trades fewer citations for an attributable chain.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Restricts citations to a provided source list or to URLs the model can retrieve and verify; explicitly permits 'no citation found' rather than fabrication; trades fewer citations for an attributable chain.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names the failure as citation-shaped-hole filling — the citation slot pulls the model toward filling it; cure is changing the slot, not the politeness.",
        },
      ],
    },
    {
      id: "S2-017",
      format: "mental_model",
      title: "Stakes-Based Verification",
      difficulty: "stretch",
      est_seconds: 180,
      prompt:
        "Explain a verification policy a small team should adopt for AI-generated work, where the verification effort SCALES with stakes — light touch on low-stakes work, full second-set-of-eyes on high. Give the policy as three named tiers + the trigger between them.",
      explanation:
        "Three named tiers (e.g., spot-check / second-eyes / external-review) + a stakes-and-reversibility trigger; would survive a new task type the team hasn't seen.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Three named tiers (e.g., spot-check / second-eyes / external-review) + a stakes-and-reversibility trigger; would survive a new task type the team hasn't seen.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Policy fits on a sticky note; team will actually use it.",
        },
      ],
    },
    {
      id: "S2-018",
      format: "mental_model",
      title: "Why You Still Need to Read It",
      difficulty: "core",
      est_seconds: 120,
      prompt:
        "Explain to someone who 'doesn't have time to verify' the output of AI on routine work, why skimming-without-reading is actually the most expensive long-term move. Use a concrete cost story — what breaks when nobody reads carefully?",
      explanation:
        "Names the silent compounding cost: small wrongnesses get ratified into 'truths' over time, downstream decisions inherit them, the team loses the ability to even spot the original error. Concrete cost story lands.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Names the silent compounding cost: small wrongnesses get ratified into 'truths' over time, downstream decisions inherit them, the team loses the ability to even spot the original error. Concrete cost story lands.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Punchy, ~150 words, the cost story is the whole argument.",
        },
      ],
    },
    {
      id: "S2-019",
      format: "delegation_sim",
      title: "Risk-Tiered Delegation",
      difficulty: "stretch",
      est_seconds: 240,
      scenario:
        "A team operates these recurring tasks: (a) weekly investor update draft, (b) monthly payroll calculation, (c) customer feedback summarization, (d) quarterly board narrative, (e) bug triage, (f) press response to a security incident.",
      task: "Design a tiered delegation policy: which tier (auto / supervised / human-only) for each, AND the rule that decides tiers — not just task-by-task picks.",
      explanation:
        "Auto (c, e); supervised (a, b); human-only (d, f). Defends each placement against the criterion.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Policy is a small, scannable table — tier per task plus the criterion column ('reversibility', 'stakes', 'audience') — that someone else could apply to a new task without asking.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Auto (c, e); supervised (a, b); human-only (d, f). Defends each placement against the criterion.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Articulates: tier = stakes × reversibility × audience. The rule survives unseen tasks.",
        },
      ],
    },
    {
      id: "S2-020",
      format: "mental_model",
      title: "Source Triangulation",
      difficulty: "stretch",
      est_seconds: 180,
      prompt:
        "Explain to a research analyst the difference between 'verified' and 'cross-referenced' AI output, and when each is enough. Give one example of each, plus one example where neither is enough and a primary source must be consulted directly.",
      explanation:
        "Captures: 'verified' = grounded in one trusted source; 'cross-referenced' = consistent across independent sources; neither beats primary-source consultation when the claim is unique to one chain or when the source itself is a derivative. Examples land cleanly.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: 'verified' = grounded in one trusted source; 'cross-referenced' = consistent across independent sources; neither beats primary-source consultation when the claim is unique to one chain or when the source itself is a derivative. Examples land cleanly.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Analyst-readable, examples are tight, distinctions stay sharp.",
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// S3 — Agentic Engineering (20 cards)
// ─────────────────────────────────────────────────────────────────────────────
const S3: AgentSeason = {
  id: "S3",
  title: "Agentic Engineering",
  tagline: "Build the thing that does the task",
  thesis:
    "Stop doing the task. Build the thing that does the task — and the eval that tells you it worked.",
  traits: ["agentic_leverage", "eval_design", "system_decomposition"],
  cards: [
    {
      id: "S3-001",
      format: "spec_to_agent",
      title: "Decompose the Goal",
      difficulty: "intro",
      est_seconds: 240,
      goal: "Every morning, produce a one-page brief of overnight changes across our 3 competitors' pricing pages.",
      environment:
        "Agent has: web fetch, a scratch file store, and a daily cron trigger. No human present at run time.",
      task: "Write the step decomposition the agent will follow. Steps must be tool-shaped (each maps to one capability).",
      explanation:
        "Clean tool-shaped steps: fetch → store snapshot → diff vs yesterday → summarize only deltas → handle fetch-failure gracefully. Nothing requires a human.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Clean tool-shaped steps: fetch → store snapshot → diff vs yesterday → summarize only deltas → handle fetch-failure gracefully. Nothing requires a human.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Recognizes the agent runs unattended, so it must self-handle the no-change and fetch-fail branches and never block waiting on a human. Decomposition is robust to a bad night.",
        },
      ],
    },
    {
      id: "S3-002",
      format: "spec_to_agent",
      title: "Write the CLAUDE.md",
      difficulty: "core",
      est_seconds: 300,
      goal: "An agent that triages inbound recruiting emails: tag role-type, urgency, and draft a reply for human approval.",
      environment: "Runs in an inbox with send-after-approval. Mistakes are visible to candidates.",
      task: "Write the agent's operating doc (CLAUDE.md-style): role, what it MAY do autonomously, what needs approval, and its hard 'never' list.",
      explanation:
        "Lets it tag/draft autonomously, gates all sends on approval, and ring-fences anything irreversible/sensitive (offers, rejections, PII) to humans. The autonomy slider matches the stakes exactly.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Operating doc is structured and unambiguous: role, MAY-do, MUST-approve, NEVER lists are clean and an agent could follow them literally.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Lets it tag/draft autonomously, gates all sends on approval, and ring-fences anything irreversible/sensitive (offers, rejections, PII) to humans. The autonomy slider matches the stakes exactly.",
        },
      ],
    },
    {
      id: "S3-003",
      format: "output_match",
      title: "The Eval Is the Product",
      difficulty: "core",
      est_seconds: 300,
      target_output:
        "A set of pass/fail checks that would tell you, WITHOUT watching it run, whether the email-triage agent did its job correctly on a given day.",
      task_description:
        "Write the eval: 5-8 concrete, automatable checks. Each must be objectively gradeable — a script could decide pass/fail without a human reading the output.",
      explanation:
        "Checks are concrete + automatable (e.g., 'every email got a tag', 'no send fired without an approval record', 'reply cites the candidate's actual role'); covers the failure modes, not just the happy path.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Checks are concrete + automatable (e.g., 'every email got a tag', 'no send fired without an approval record', 'reply cites the candidate's actual role'); covers the failure modes, not just the happy path.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Targets the checks at where the agent is most likely to fail (silent send, wrong tag), not at trivial successes.",
        },
      ],
    },
    {
      id: "S3-004",
      format: "delegation_sim",
      title: "The Autonomy Slider",
      difficulty: "stretch",
      est_seconds: 210,
      scenario:
        "Same email-triage agent. For each action, set autonomy FULL (runs alone) / GATED (drafts, human approves) / OFF (human only):\n(a) apply tags, (b) reply to a scheduling email, (c) send a rejection, (d) escalate a legal threat, (e) update the ATS record.",
      task: "Set each slider and justify in one line.",
      explanation:
        "FULL on (a)(e) (reversible, low-stakes), GATED on (b), OFF on (c)(d) (irreversible/legal). Stakes-to-autonomy mapping is exact.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "FULL on (a)(e) (reversible, low-stakes), GATED on (b), OFF on (c)(d) (irreversible/legal). Stakes-to-autonomy mapping is exact.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "States the governing rule: autonomy is proportional to reversibility and inversely proportional to stakes.",
        },
      ],
    },
    {
      id: "S3-005",
      format: "mental_model",
      title: "The Ceiling",
      difficulty: "stretch",
      est_seconds: 150,
      prompt:
        "A founder wants to fully automate hiring decisions with an agent. Explain — to them, persuasively — where the agentic approach hits its ceiling and what must stay human, WITHOUT being anti-AI about it.",
      explanation:
        "Distinguishes high-leverage automation (sourcing, screening, scheduling, drafting) from judgment calls under uncertainty + accountability (final decisions, edge cases, bias risk); frames the human as the owner of the decision, not the labor. Pro-leverage, not anti-AI.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Distinguishes high-leverage automation (sourcing, screening, scheduling, drafting) from judgment calls under uncertainty + accountability (final decisions, edge cases, bias risk); frames the human as the owner of the decision, not the labor. Pro-leverage, not anti-AI.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Persuasive to a founder — concrete, confident, no hedging-slop.",
        },
      ],
    },
    {
      id: "S3-006",
      format: "spec_to_agent",
      title: "Tool-Shaped Steps",
      difficulty: "intro",
      est_seconds: 180,
      goal: "Keep an internal wiki page of 'who owns what service' up to date.",
      environment:
        "Agent has: read access to the code repo's CODEOWNERS files, a wiki write API, and a weekly trigger. No human at run time.",
      task: "Decompose into tool-shaped steps. Each step must map to exactly one of the available capabilities; flag anything the available tools can't do.",
      explanation:
        "Every step is one capability: read CODEOWNERS → parse owners → diff vs current wiki → write only changes → flag files with no owner. No magic steps.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Every step is one capability: read CODEOWNERS → parse owners → diff vs current wiki → write only changes → flag files with no owner. No magic steps.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Explicitly flags what the tools can't do (e.g., resolving an ambiguous owner) and routes it to a human note rather than guessing.",
        },
      ],
    },
    {
      id: "S3-007",
      format: "spec_to_agent",
      title: "Long-Running Memory",
      difficulty: "core",
      est_seconds: 300,
      goal: "An agent that runs a 2-week competitive-research project, building a report incrementally across ~30 sessions.",
      environment:
        "Each session is a fresh context window. Agent has a file store and a structured notes file it controls. No shared memory between sessions except what it writes down.",
      task: "Write the memory/context-engineering spec: what the agent must persist between sessions, what it should re-read at the start of each session, and what it should NOT carry forward.",
      explanation:
        "Spec names exactly what's persisted (decisions, open questions, sources), the start-of-session reload ritual, and what to drop (raw fetched HTML, dead ends). Implementable as-is.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Spec names exactly what's persisted (decisions, open questions, sources), the start-of-session reload ritual, and what to drop (raw fetched HTML, dead ends). Implementable as-is.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Treats each session as stateless and the notes file as the only memory; designs against context-window limits and stale-state pollution simultaneously.",
        },
      ],
    },
    {
      id: "S3-008",
      format: "spec_to_agent",
      title: "Failure Containment",
      difficulty: "core",
      est_seconds: 240,
      goal: "An agent that nightly reconciles two financial ledgers and posts a summary to Slack.",
      environment:
        "Agent has read access to both ledgers, a Slack post tool, and a cron trigger. A wrong reconciliation that looks right is worse than no reconciliation.",
      task: "Write the failure-containment section of the spec: what the agent does when a step fails, when data looks anomalous, and how it avoids posting a confidently-wrong summary.",
      explanation:
        "Names concrete failure branches: step-fail → halt + alert; anomaly past a threshold → post 'needs review' not a fake number; never post a summary it couldn't reconcile. Each branch is actionable.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Names concrete failure branches: step-fail → halt + alert; anomaly past a threshold → post 'needs review' not a fake number; never post a summary it couldn't reconcile. Each branch is actionable.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Treats a confident-wrong post as the worst outcome and designs the default toward silence/escalation over fabrication — matches the environment's stated risk.",
        },
      ],
    },
    {
      id: "S3-009",
      format: "spec_to_agent",
      title: "Idempotent Re-Runs",
      difficulty: "stretch",
      est_seconds: 270,
      goal: "An agent that sends onboarding emails to new signups.",
      environment:
        "The trigger can fire twice for the same batch (at-least-once delivery). Sending the same welcome email twice annoys users; sending zero is worse.",
      task: "Write the spec section that makes re-runs safe: how the agent knows what it already did, and what it does on a duplicate trigger.",
      explanation:
        "Designs a record of who's been emailed, checks it before sending, marks after sending, and makes the check-and-mark safe against the double-fire. Concrete.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Designs a record of who's been emailed, checks it before sending, marks after sending, and makes the check-and-mark safe against the double-fire. Concrete.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Correctly biases toward 'never double-send' while ensuring 'never zero-send' — names the asymmetry from the environment and designs to it.",
        },
      ],
    },
    {
      id: "S3-010",
      format: "spec_to_agent",
      title: "The Handoff Doc",
      difficulty: "core",
      est_seconds: 270,
      goal: "A 'researcher' agent gathers sources, then hands off to a 'writer' agent that drafts a brief. You're speccing the researcher's output contract.",
      environment:
        "The writer agent only sees what the researcher writes to a shared handoff file. The researcher cannot re-run on request.",
      task: "Write the researcher's output contract: the exact structure and content the handoff file must contain so the writer never has to guess or go back.",
      explanation:
        "Specifies a structured handoff (per-source: claim, citation, confidence, relevance) so the writer can work purely from the file — a clean inter-agent contract.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Specifies a structured handoff (per-source: claim, citation, confidence, relevance) so the writer can work purely from the file — a clean inter-agent contract.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Designs the contract around what the writer needs and the fact the researcher can't be re-queried — front-loads everything, including uncertainty.",
        },
      ],
    },
    {
      id: "S3-011",
      format: "output_match",
      title: "Regression Eval",
      difficulty: "core",
      est_seconds: 240,
      target_output:
        "A set of checks that fail loudly if a prompt/agent update breaks behavior that used to work — run before every deploy.",
      task_description:
        "Write 5-7 regression checks for the email-triage agent. They must pin behavior that is currently correct so a future change can't silently regress it. Each check is automatable.",
      explanation:
        "Checks pin specific known-good behaviors with concrete inputs and expected outputs; a diff in behavior trips them. Automatable.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Checks pin specific known-good behaviors with concrete inputs and expected outputs; a diff in behavior trips them. Automatable.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Pins the behaviors most likely to silently drift on an update (edge tags, approval gating), not the obvious happy path.",
        },
      ],
    },
    {
      id: "S3-012",
      format: "output_match",
      title: "Golden Set Generator",
      difficulty: "core",
      est_seconds: 240,
      target_output:
        "A prompt that generates a labeled golden test set (input + expected-label pairs) to evaluate the email-triage agent's tagging.",
      task_description:
        "Write a reusable prompt that produces a diverse golden set: common cases, edge cases, and adversarial cases, each with an unambiguous expected label. The set must be usable as ground truth without a human re-labeling it.",
      explanation:
        "Prompt yields balanced coverage (common/edge/adversarial), each with an unambiguous expected label and a rationale; the set is reusable ground truth.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Prompt yields balanced coverage (common/edge/adversarial), each with an unambiguous expected label and a rationale; the set is reusable ground truth.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Deliberately over-weights edge + adversarial cases because that's where eval signal lives — names that.",
        },
      ],
    },
    {
      id: "S3-013",
      format: "output_match",
      title: "Adversarial Eval",
      difficulty: "stretch",
      est_seconds: 240,
      target_output:
        "A set of checks designed to catch the agent's single most dangerous SILENT failure — the one that passes a naive eval but ships harm.",
      task_description:
        "For the financial-reconciliation agent (S3-008), write the adversarial eval: checks specifically engineered to catch a confidently-wrong reconciliation that a happy-path eval would wave through.",
      explanation:
        "Checks inject known-bad ledger states and assert the agent flags rather than posts; concrete, automatable, targets confident-wrong output.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Checks inject known-bad ledger states and assert the agent flags rather than posts; concrete, automatable, targets confident-wrong output.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Correctly identifies the most dangerous failure (a clean-looking wrong number) and engineers the eval to provoke it on purpose.",
        },
      ],
    },
    {
      id: "S3-014",
      format: "delegation_sim",
      title: "Deploy Agent Slider",
      difficulty: "stretch",
      est_seconds: 210,
      scenario:
        "A CI/CD agent can take these actions. Set autonomy FULL / GATED (human approves) / OFF (human only):\n(a) run the test suite, (b) merge a green PR to a feature branch, (c) merge to main, (d) deploy to production, (e) roll back a bad deploy, (f) delete a database backup.",
      task: "Set each slider and justify with a one-line risk rationale.",
      explanation:
        "FULL on (a)(e) (safe / recovery actions), GATED on (b)(c)(d), OFF on (f) (irreversible data loss). Recovery actions get MORE autonomy than destructive ones — names that inversion.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "FULL on (a)(e) (safe / recovery actions), GATED on (b)(c)(d), OFF on (f) (irreversible data loss). Recovery actions get MORE autonomy than destructive ones — names that inversion.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Articulates: autonomy tracks reversibility; recovery actions can be fast/auto because they reduce risk, destructive ones must be gated or off.",
        },
      ],
    },
    {
      id: "S3-015",
      format: "delegation_sim",
      title: "Refund Agent Slider",
      difficulty: "core",
      est_seconds: 180,
      scenario:
        "A customer-refund agent. Set autonomy FULL / GATED / OFF for each:\n(a) refund under ₹500 with a valid receipt, (b) refund ₹500-₹5000, (c) refund over ₹5000, (d) issue store credit, (e) ban a user for suspected fraud, (f) reply explaining a declined refund.",
      task: "Set each slider and give the threshold logic, not just per-case calls.",
      explanation:
        "FULL on (a)(d)(f) (low-value/reversible), GATED on (b), OFF on (c)(e) (high-value/irreversible-reputation). A monetary threshold drives the tiers.",
      rubric: [
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "FULL on (a)(d)(f) (low-value/reversible), GATED on (b), OFF on (c)(e) (high-value/irreversible-reputation). A monetary threshold drives the tiers.",
        },
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "States the rule: autonomy scales down as monetary value and irreversibility rise; the ban is off because reputation damage is unrecoverable.",
        },
      ],
    },
    {
      id: "S3-016",
      format: "mental_model",
      title: "Why Evals Beat Watching",
      difficulty: "core",
      est_seconds: 150,
      prompt:
        "Explain to an engineer who 'just watches the agent run a few times and ships it' why that doesn't scale and what to build instead. Make the case that the eval is the real deliverable, not the agent. Use one concrete cost story.",
      explanation:
        "Captures: watching scales O(n) with runs and misses rare failures; an eval is a reusable, automatable trust instrument that runs on every change. The agent without an eval is unfalsifiable. Cost story lands.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: watching scales O(n) with runs and misses rare failures; an eval is a reusable, automatable trust instrument that runs on every change. The agent without an eval is unfalsifiable. Cost story lands.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Engineer-credible, concrete, no slop; the cost story is the argument.",
        },
      ],
    },
    {
      id: "S3-017",
      format: "mental_model",
      title: "Leverage vs Labor",
      difficulty: "intro",
      est_seconds: 120,
      prompt:
        "Explain the mindset shift from 'using a model to do a task faster' to 'building an agent that does the class of task without you.' Give one concrete before/after from real knowledge work, and name what the human's job becomes in the 'after.'",
      explanation:
        "Captures: the shift is from doing-the-task to specifying-and-evaluating the thing that does the task; the human moves from labor to designing leverage + owning the eval. Before/after is concrete.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: the shift is from doing-the-task to specifying-and-evaluating the thing that does the task; the human moves from labor to designing leverage + owning the eval. Before/after is concrete.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Crisp, motivating, one clean before/after.",
        },
      ],
    },
    {
      id: "S3-018",
      format: "mental_model",
      title: "Context Engineering",
      difficulty: "stretch",
      est_seconds: 180,
      prompt:
        "Explain 'context engineering' for a long-running agent to a smart engineer who knows prompting but not agents. Why is deciding what goes INTO the context window each step (and what gets left out) the core skill — not the prompt wording? Use one concrete example of context curation done well vs badly.",
      explanation:
        "Captures: with limited context, the agent's competence is bounded by what you load each step; context engineering = curating the right state in and noise out; this dominates prompt wording at scale. Good/bad example is sharp.",
      rubric: [
        {
          dim: "D5",
          label: "Articulation",
          perfect:
            "Captures: with limited context, the agent's competence is bounded by what you load each step; context engineering = curating the right state in and noise out; this dominates prompt wording at scale. Good/bad example is sharp.",
        },
        {
          dim: "D3",
          label: "Craft",
          perfect: "Engineer-readable, the example carries the point.",
        },
      ],
    },
    {
      id: "S3-019",
      format: "repair",
      title: "Runaway Agent",
      difficulty: "core",
      est_seconds: 210,
      broken_prompt:
        "Agent loop: 'Read the next ticket, decide an action, take it, repeat until the queue is empty.'",
      observed_failure:
        "One mis-read ticket caused the agent to take a wrong action, which created a new ticket, which it then acted on — a cascade. It 'cleared' the queue by generating work.",
      task: "Redesign the loop so a single wrong step can't cascade — without requiring a human to watch it.",
      explanation:
        "Diagnoses the feedback-loop (acting on its own output) as the root cause and severs it; understands that more prompting can't fix an unbounded loop.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Adds a step budget / circuit breaker, refuses to act on self-generated tickets without review, and bounds the blast radius. Concrete and unattended-safe.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses the feedback-loop (acting on its own output) as the root cause and severs it; understands that more prompting can't fix an unbounded loop.",
        },
      ],
    },
    {
      id: "S3-020",
      format: "repair",
      title: "Silent Eval Gap",
      difficulty: "stretch",
      est_seconds: 210,
      broken_prompt:
        "Eval suite for the triage agent: 'Check that every email received a tag and a draft reply was generated.'",
      observed_failure:
        "The eval passes at 100% every day, yet candidates complain the replies are addressed to the wrong person and cite the wrong role. The eval is green; the agent is shipping harm.",
      task: "Fix the eval so it actually catches the failures users are experiencing — without just adding a human reviewer.",
      explanation:
        "Diagnoses the gap precisely: the eval tested existence ('a tag exists') not correctness ('the right tag'); the green-but-wrong state is the signature of a presence-only eval. Closes it.",
      rubric: [
        {
          dim: "D3",
          label: "Craft",
          perfect:
            "Adds checks that the reply's named person + cited role match the source email's actual fields — content correctness, not just presence. Automatable.",
        },
        {
          dim: "D4",
          label: "Judgment",
          perfect:
            "Diagnoses the gap precisely: the eval tested existence ('a tag exists') not correctness ('the right tag'); the green-but-wrong state is the signature of a presence-only eval. Closes it.",
        },
      ],
    },
  ],
};

export const AGENT_SEASONS: AgentSeason[] = [S0, S1, S2, S3];