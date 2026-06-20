// Model answers for all 61 open-ended cards.
// Keyed by card ID. MCQ cards (glitch_diagnosis, prediction) don't need entries here
// — their explanation is shown inline after the answer is selected.

export const MODEL_ANSWERS: Record<string, string> = {

  // ───────────────────────────────────────────────────────────────────────────
  // S0 — Mental Models
  // ───────────────────────────────────────────────────────────────────────────

  "S0-003": `Think of a brilliant actor who's memorised every movie script ever filmed. They can deliver a 10-minute Shakespearean monologue flawlessly — yet ask them how many syllables are in "strawberry" and they might get it wrong. Their knowledge is jagged, not graduated.

LLMs work the same way: they absorbed enormous patterns from text, so where text was dense and clear (algorithms, code tutorials, logical proofs), they're very capable. Where tasks require actual computation or character-level counting, they fall through the holes.

The surprising part: you can't predict the gaps from how "hard" something seems to a human — only from what the training data looked like. Merge sort = millions of examples online. Primary-school subtraction? Trivially easy for humans, almost never written out step-by-step in the training corpus.`,

  "S0-004": `**Fixed prompt:**

"Summarise what is known about [TOPIC] using ONLY the text I paste below. If I give you no text, say 'no source material provided.'

Do not cite any papers, authors, or studies unless they appear word-for-word in the text I give you. If you would normally reference an external source, write [source not provided] — do not invent one.

Separate what the source explicitly states from anything you're uncertain about.

[PASTE SOURCE TEXT HERE]"

**Why this works:** the fix is structural — it gives the model explicit permission to say "no source" instead of filling the citation-shaped hole with a fabricated one. Removing that hole removes the hallucination.`,

  "S0-009": `**Working prompt:**

"Output exactly this JSON object and nothing else — no code fences, no prose before or after, no trailing newline:
{"name": "alex", "age": 28, "skills": ["python", "sql"]}"

**Key moves:**
- "exactly ... and nothing else" suppresses the preamble the model normally adds
- Showing the target output directly is more reliable than describing it
- "no code fences" and "no trailing newline" close the two most common drift vectors`,

  "S0-010": `**Working prompt:**

"Output the markdown table and footnote below exactly as written. Start immediately with the pipe character — no preamble, no code fences, no explanation:

| Country | Capital | Note |
|---|---|---|
| India | New Delhi¹ | seat of government |
| Japan | Tokyo | |
| Brazil | Brasília | moved 1960 |

¹ technically the National Capital Territory."

**Key moves:** providing the template directly is more reliable than describing the format in prose. The model fills a template far more accurately than it interprets instructions like "use a footnote marker."`,

  "S0-011": `**Working prompt:**

"Answer with exactly one word. The word is: yes. No punctuation. No capital letter. No space before or after. Nothing else."

**Key moves:**
- "exactly one word" closes the length axis
- "no punctuation" and "no capital letter" close the formatting drift
- Demonstrating the exact desired output ("The word is: yes") collapses the prior to one token`,

  "S0-012": `**Fixed prompt:**

"Read the article below. Extract and return ONLY:
1. Three specific factual claims the author makes — quote key phrases directly
2. Any named organisations, people, or statistics mentioned
3. The author's main conclusion in ≤20 words, using their language not yours

No filler sentences. No 'the article discusses.' Every bullet must point to something specific in the text.

[ARTICLE HERE]"

**Why this works:** "summarise" is an under-constrained verb — the model defaults to hedged, generic language. Replacing it with explicit extraction targets (numbered claims, direct quotes, named entities) forces the model to go back to the source.`,

  "S0-013": `**Fixed prompt:**

SYSTEM: You output JSON only. Schema: {"answer": "<string>", "confidence": <0.0–1.0>}. Begin your response with { and end with }. No preamble, no explanation, no repetition of these instructions.

USER: What's the capital of France?

**Two key fixes:**
1. Strip the "helpful assistant" persona — it was the vector for the echo and the prose wrapper
2. Add explicit suppression: "begin with {" removes the preamble, "no repetition of these instructions" closes the echo loop`,

  "S0-014": `Temperature controls randomness, not creativity. At every step the model has a probability distribution over its next word — temperature reshapes that distribution.

Low temperature → always pick the most likely word → predictable, safe, sometimes repetitive.
High temperature → spread probability across many options → occasionally surprising, often incoherent.

**Analogy:** a playlist on shuffle. Maximum shuffle doesn't make the playlist more creative — it plays songs in a random order, including terrible combinations. The creativity lives in the songs themselves (the model's training), not in how randomly they're sequenced.

If output is boring, the problem is almost always the prompt, not the temperature. Creativity comes from richer context, better examples, and clearer goals — none of which temperature controls.`,

  "S0-015": `The model has no memory in the way you do. What looks like "remembering" is this: every time you send a message, the entire conversation so far is fed back to the model from scratch. It re-reads everything, every time.

The context window is the size limit of what it can re-read at once. Once your conversation grows beyond that limit, early messages are literally cut from the document the model receives. They're not forgotten — they were never stored anywhere. They just stopped being included in the input.

**Unlike human forgetting** (where memories fade gradually, some stronger than others), this is binary: in the window = perfectly available, out of the window = completely gone, as if it never happened. Calling it "forgetting" imports the wrong mental model entirely.`,

  // ───────────────────────────────────────────────────────────────────────────
  // S1 — The Daily Driver
  // ───────────────────────────────────────────────────────────────────────────

  "S1-002": `**Reusable standup prompt:**

"You are a standup formatter. Convert the brain-dump below into this exact 3-line format — nothing more:

Yesterday: [one sentence of what was shipped or unblocked]
Today: [one sentence of what's being worked on]
Blockers: [one sentence of what's in the way, or 'none']

Do not add context, explanations, or extra lines. If information for a line is missing, write 'not mentioned.'

[BRAIN-DUMP HERE]"

**Why it works:** pins the schema explicitly, handles missing information gracefully instead of hallucinating content, and is short enough to use daily without editing.`,

  "S1-003": `The fix is **model routing**, not prompt tuning. You can't prompt latency away on a reasoning model — it's doing extra work by design.

**Operating rule:** trivial, deterministic tasks (sort this list, reformat this CSV, convert this date) go to a fast, cheap model — or a code interpreter tool. Reserve reasoning mode for tasks that genuinely require multi-step inference: debugging subtle logic errors, evaluating tradeoffs, synthesising conflicting information.

A practical test: if a high-schooler with pencil and paper could do it in 30 seconds, don't use a reasoning model. Reasoning mode is expensive thinking; alphabetising a list doesn't need expensive thinking.`,

  "S1-004": `**The rule:** wipe when the thread is contaminated; keep when continuity is an asset.

**Start a new chat when:**
- You pasted something that's now outdated (old spec, changed requirements)
- The topic has shifted completely to something unrelated
- The model is giving inconsistent or strange answers — the thread is probably polluted
- You notice the model referencing something you explicitly corrected two turns ago

**Keep the same chat when:**
- You're iterating on the same document or the same problem
- You need the model to remember earlier decisions in this specific task

**Wipe example:** you spent 20 turns on Python API design; now you need to plan a marketing email. The Python context will silently bias every answer.
**Keep example:** you're refining a draft email and want the model to remember feedback you gave in turn 3.`,

  "S1-005": `**Reusable instruction block:**

"Answer from your training knowledge by default. Use web search ONLY when the question requires information that changes faster than your training: current prices, live system status, who currently holds a specific role, the latest version of a software package, today's news, or real-time data.

For stable questions — how a concept works, code syntax, historical facts, definitions — answer directly without searching. If a question could go either way, ask: would the answer be different if someone asked six months ago? If no, skip the search."

**Key:** the trigger is rate-of-change, not uncertainty. This prevents over-searching (which slows everything) and under-searching (which produces stale answers).`,

  "S1-010": `**Reusable weekly digest prompt:**

"You are a weekly digest compiler. Read the Slack messages below and produce this exact structure:

Shipped:
- <project name>: <one-line outcome>
At risk:
- <project name>: <one-line reason>
Decisions needed:
- <one-line ask, owner, deadline>

Rules:
- Ignore jokes, off-topic threads, and reactions
- Only include items with evidence in the messages — never invent an 'at risk' item
- If a section has no items, write: none (do not omit the section header)

[SLACK MESSAGES HERE]"

**Critical:** "if no items, write 'none'" closes the silent-omission failure where the model drops empty sections — and the hallucinated-at-risk failure where it fills them from thin air.`,

  "S1-011": `**Reusable triage instruction block:**

"Read each email below and classify it. Output one line per email in this exact format:

REPLY: <subject> | <one-line reason why it needs a response>
SNOOZE: <subject> | <reason to defer + when to revisit>
IGNORE: <subject> | <reason it needs no action>

Rules:
- Do not use importance flags from the email client — reason from message content and sender context only
- If an email lacks enough context to classify confidently, output no line for it (skip it — don't guess)
- No preamble, no summary at the end

[EMAILS HERE]"

**Key:** the explicit abstention rule ("skip it — don't guess") is what separates a useful classifier from a hallucinating one.`,

  "S1-012": `**Reusable calendar prompt:**

"Review my free-busy data and the constraint below. Return EXACTLY the available slots that fit, in this format:

Option 1: <Weekday>, <HH:MM–HH:MM TZ>
Option 2: <Weekday>, <HH:MM–HH:MM TZ>
Option 3: <Weekday>, <HH:MM–HH:MM TZ>

If fewer than three valid slots exist, return only as many as exist — never invent a slot. No preamble, no explanation, no commentary.

Constraint: [e.g. 45-min slot, after 11am IST, not Fridays]
Free-busy data: [PASTE HERE]"

**Key move:** "never invent a slot" explicitly closes the model's tendency to fill the template even when the data doesn't support it.`,

  "S1-013": `**Fix:** start a new chat. This cannot be fixed in-thread.

When a stale document is in the context window, the model re-reads it on every turn. Telling it "ignore the old spec" works for a turn or two — but the text is still there, being read, influencing answers. It's not a memory you can erase; it's a document in front of the model.

**Correct habit:**
1. Open a fresh chat
2. Paste only the current spec at the top
3. Continue from there

Optionally: save the current spec as a custom instruction or system prompt so it's automatically available in every new chat, reducing the risk of this happening again.`,

  "S1-014": `**Fixed instruction:**

"Use web search only for questions where the answer changes over time — current prices, live system status, who currently holds a role, the latest release of a software tool, today's news. For stable questions (how something works, code syntax, definitions, historical facts), answer from your training without searching. Default is no search; search triggers only on time-sensitivity."

**The diagnosis:** "always" was the bug — it over-triggered search on every query regardless of whether fresh data was needed. The fix carves out exactly the time-sensitive case rather than removing search entirely.`,

  "S1-015": `**Fix:** if you have the text, paste the text. Don't screenshot it.

Use image input only when the content is genuinely visual: a UI you want feedback on, a chart you want interpreted, a diagram, a physical handwritten note. For anything that exists as machine-readable text — terminal output, error logs, code, stack traces — paste it directly.

**Why:** OCR adds a noisy intermediate step. It silently corrupts the data you most need to be exact: hex addresses, line numbers, stack trace paths. When the model OCRs your screenshot and hallucinates a character in a memory address, it chases a phantom bug — and you spend 20 minutes on something that never existed.`,

  "S1-016": `**Fix:** scope your custom instructions by project or workspace, not per-prompt.

Most AI tools support separate projects or workspaces where custom instructions apply only within that context. Create one project for your horror novel (with the vivid/dark instructions) and a separate default workspace with neutral instructions for professional tasks.

If your tool doesn't support projects: disable custom instructions when switching task types. The two-second toggle is cheaper than editing every business email your horror writer persona contaminates.

**Root cause:** custom instructions are a global prior — they bias every response, including unrelated ones. The fix is at the platform level (scoping), not at the per-prompt level ("please ignore your custom instructions for this one").`,

  "S1-017": `Bigger models are better at tasks requiring complex multi-step reasoning, nuanced judgment, or novel synthesis. For everything else, the cost is real and the quality gain is zero.

**The useful frame:** quality saturates quickly on routine tasks. Once a model is good enough at "rewrite this in a friendlier tone" or "summarise this meeting," upgrading doesn't produce measurable improvement — just higher cost and slower responses.

**PM example:** writing a tweet-length summary of a meeting. A fast, small model handles this as well as the largest model 95% of the time. The extra 5% quality gain isn't worth 10× the cost and 5× the wait.

Reach for the big model when the task is genuinely hard: multi-step analysis, edge cases that require judgment, novel problems with no obvious template.`,

  "S1-018": `A standard model reads your question and immediately generates a response — one forward pass through the network. A reasoning model first generates a long internal "scratchpad" of intermediate thinking (like showing working on paper) before producing the final answer. That scratchpad costs tokens and time.

**Analogy:** asking someone a hard maths problem. A standard model blurts an answer immediately. A reasoning model works through it step-by-step on scratch paper first, then writes the answer.

**What it doesn't fix:** if the model doesn't know a fact, thinking harder won't produce the fact. Reasoning mode helps with logical steps and multi-step deduction — not with knowledge gaps, outdated training data, or hallucination. It's a better calculator, not a better encyclopaedia.`,

  "S1-019": `Every model choice sits on a triangle. You can optimise for any two corners, but not all three simultaneously.

**Latency** (how fast you get a response): push this for real-time features — live chat, autocomplete, voice interface. Trade: smaller or cheaper model, some quality loss.

**Cost** (per-call price): push this for high-volume, batch, or background tasks — nightly reports, bulk classification, data enrichment. Trade: may be slower or less nuanced.

**Quality** (accuracy, reasoning depth): push this for high-stakes, low-frequency tasks — legal document review, complex analysis, anything where wrong = expensive. Trade: slower and costlier.

**For your next spec:** ask "which corner is non-negotiable?" and explicitly accept the trade on the other two. A real-time chat feature cannot also be the cheapest and the most accurate. Pick one.`,

  "S1-020": `**Custom Instructions** = what you tell the model once, permanently, about yourself and how you want it to behave. You write them. They don't change until you change them. Think: standing briefing.

**Memory** = notes the model writes automatically from your conversations, retrieved in future chats. It evolves without you managing it.

**Rule:** Custom Instructions for stable preferences; Memory for evolving context.

**Custom Instructions example:** "I'm a backend engineer. Be concise. Avoid inline comments in code." That's stable — write it once, leave it alone.

**Memory example:** "I started a new project called ArenaX using Supabase." The model should track this as it evolves across sessions — let Memory handle it, not a custom instruction you'd have to manually update.`,

  // ───────────────────────────────────────────────────────────────────────────
  // S2 — The 4D Operator
  // ───────────────────────────────────────────────────────────────────────────

  "S2-001": `| Task | Decision | Reason |
|---|---|---|
| (a) Pull 3 comparable valuations | DELEGATE | Retrieval + formatting — AI executes this in seconds with no judgment required |
| (b) Write cold emails | DELEGATE first draft, then own | AI drafts; you edit for relationship context and send |
| (c) Decide the round size | KEEP | Irreversible, high-stakes, accountability-bearing — no AI output should be the proximate cause of this number |
| (d) Format the cap table | DELEGATE | Pure formatting, zero judgment |

**Principle:** delegate retrieval, formatting, and first drafts. Keep decisions where you're accountable for the outcome and the consequences are hard to reverse.`,

  "S2-002": `**Reusable prompt + context block:**

"Write a rejection email to a candidate for the role of {{role_title}}. Keep it under 90 words.

Required elements:
- Open by referencing this specific strength from their interview: {{interview_highlight}}
- Decline clearly — no ambiguity about the outcome
- Mention we'd welcome them to apply again in {{timeframe, e.g. '12 months'}}
- Close with {{team_lead_name}}'s name

Tone: direct, human, no corporate filler ('we regret to inform you', 'at this time', 'unfortunately'). Flowing prose — no bullet points in the output."

**Why this lands:** fills the model's knowledge gap (interview specifics) before it has to write, bans the clichés it defaults to when context is thin, and sets a concrete length constraint.`,

  "S2-004": `| Task | Decision | Reason |
|---|---|---|
| (1) Draft LinkedIn post | FULL DELEGATE | Low stakes, easily edited, external audience but reversible |
| (2) Summarise medical disclosure | DO NOT DELEGATE (to public AI) | Named employees + health data + DEI demographics = PII that must not leave a controlled environment |
| (3) Write NDA boilerplate | DRAFT THEN VERIFY | AI produces a serviceable first draft; a lawyer must review before signing |
| (4) Diagnose FEMA payment issue | DRAFT THEN VERIFY | AI maps the likely cause; a compliance specialist must confirm before action |

**Principle:** sensitivity (personal data, health, DEI) and regulation (financial compliance, legal instruments) always require a human gate. The question isn't "can the AI do it?" — it's "who is accountable if it's wrong?"`,

  "S2-005": `**Redesigned ask:**

"Step 1: find verified YC S26 companies using only grounded sources — YC's public batch page or Crunchbase. List only companies you can link to a real public profile.

Step 2: for each company, find the founder's publicly listed contact. If no public email exists, write 'no public contact found' — do not guess, interpolate, or try common email patterns.

Output per company:
- Company: [name]
- Source: [URL]
- Founder email: [found address] OR [no public contact found]

Return fewer than 5 entries if that's all that are verifiable. Do not fill 5 slots by inventing."

**Root cause fixed:** the original ask had an answer-shaped hole (5 companies + emails). The model filled it. The fix separates retrieval from guess, and gives explicit permission to return fewer results or say "not found."`,

  "S2-006": `**Split for the 6-hour task:**

**Do with AI (3–4 hrs):**
- AI reads all 20 tickets and clusters them by complaint type, with supporting quotes per cluster
- AI drafts a 1-page summary of the top clusters
- AI generates 5–8 potential fix directions based on the clusters

**Do alone (2–3 hrs):**
- You validate whether the clusters are real patterns or AI-imposed groupings (requires product knowledge)
- You select and refine the 3 fixes that are actually buildable given the real roadmap
- You write the recommendation with the rationale you'll stake your name on

**Handoff point:** the moment the task shifts from "what does the data say" to "what should we build." The first is retrieval + synthesis; AI does that well. The second is judgment + accountability; that's yours.`,

  "S2-007": `| Task | Decision | Reason |
|---|---|---|
| (1) Draft board update | DRAFT THEN VERIFY | AI structures and writes; founder reviews for accuracy and tone |
| (2) Write termination letter | DRAFT THEN VERIFY | AI drafts; HR and legal must review — never send without human sign-off |
| (3) Summarise Slack | FULL DELEGATE | Retrieval and summarisation, low stakes |
| (4) Decide on 20% layoff | DO NOT DELEGATE | Careers, livelihoods, legal exposure — this carries human accountability that cannot be transferred |

**Principle:** AI can draft anything. Only humans can own irreversible, emotionally-loaded, accountability-bearing decisions. The question for (4) isn't "can AI analyse the data?" — it can. The question is "who answers for this decision?" That must be a person.`,

  "S2-008": `Do these unaided for your first 6 months:

**1. Write first-draft analysis** (memos, strategy docs, client summaries)
*Why:* you need to build the internal model of what "good" analysis looks like in your domain before you can verify AI's version.
*Cutoff:* when you can read an AI draft in 30 seconds and know whether it's substantively right or just fluent.

**2. Debug your own code**
*Why:* debugging builds pattern recognition. Without enough reps, you can't spot when AI's fix is plausible-but-wrong.
*Cutoff:* when you've seen enough bug patterns that an AI suggestion feels obviously right or wrong, not just "might work."

**3. Structure your own arguments**
*Why:* you need to feel what a good structure is before you can judge AI's outline.
*Cutoff:* when you can tell in one read whether an AI-generated outline is logically sound or just confident-looking.

**Underlying principle:** do unaided the things you must judge later. Pre-AI reps are how discernment is built.`,

  "S2-009": `**Reusable prompt block:**

"Write an intro paragraph — exactly 2 sentences — for a job offer letter. Tone: warm, specific, professional.

Banned words: 'thrilled', 'excited to offer', 'rockstar', 'family', 'passionate'.

Use these slots exactly:
- Accomplishment from round 3 interview: {{interview_highlight}}
- Start date: {{start_date}}
- Team lead's name: {{team_lead}}

Example output:
'After your impressive [interview_highlight] in round three, we'd love for you to join us starting [start_date]. You'll be working directly with [team_lead] on a team that values [relevant quality from interview].'"

**What makes this work:** explicit slot variables prevent the model from being generic when context is missing, the banned-words list closes the cliché path, and the example collapses the model's prior to the exact tone and length you want.`,

  "S2-010": `**Reusable prompt:**

"Format each shipped change as one line: [scope] [description] [user-visible or internal].

End the list with a breaking-changes section:
- If any changes are breaking: 'Breaking: [one-line description]'
- If no changes are breaking: write the line 'No breaking changes.' — do not omit this line, do not write 'N/A', do not leave it blank.

[CHANGELOG ITEMS HERE]"

**The critical fix:** explicitly mandating the empty-section literal ("No breaking changes.") prevents the silent-omission failure where the model drops sections it has nothing to say. Presence-only checks in the eval would miss this — which is exactly what this card trains you to see.`,

  "S2-011": `Adjectives like "concise" or "professional" sit on a wide distribution — each reader interprets them differently, and so does the model. An example collapses that distribution to a narrow target: the model calibrates to exactly the style, length, and tone you demonstrated.

**Before:** "Write a concise, professional, warm rejection email."

**After:** "Write a rejection email in this style and length:
'Hi [name] — thank you for your time on Thursday. We've decided to move forward with another candidate for this role. I'd love to stay in touch and would welcome your application again next year. Best, [team]'"

The second prompt produces consistent output across many runs. The first produces something different every time — and "concise" to the model might be 200 words, while yours is 40.`,

  "S2-014": `The most dangerous AI outputs aren't the obviously wrong ones — those are easy to catch. The dangerous ones are specific, confidently worded, and well-formatted — because those signals are normally associated with truth. The model has learned to write like a reliable source even when it's making things up.

**The habit:** source-or-it-didn't-happen. If a specific fact (a number, a quote, a date, a name) isn't traceable to a primary source you can click, it doesn't go in the story.

**Fictional example that would have shipped without the habit:** "According to a 2023 WHO report, 1.4 billion people lack access to safe surgical care." Specific, plausible, well-formatted — and the report may not exist. Without the habit, it's in print by Thursday.`,

  "S2-015": `**Stop the action. Two separate problems:**

**1. PII violation:** uploading a document containing employee names, salaries, and DEI demographics to a public AI tool likely violates your company's data handling policy and potentially employment law. This data must not leave a controlled, policy-approved environment.

**2. Bias trap:** asking an AI to identify "flight risks" from exit interviews is a discriminatory classification task on sensitive personal attributes. The output would be unreliable and could create legal liability.

**Corrected delegation:**
- Anonymise or aggregate before any AI touches the data (remove names, salaries, demographics)
- Ask for themes only: "What are the most common themes in these responses?" — not "who is at risk"
- Do this in an on-premises or enterprise-tier tool with appropriate data processing agreements in place`,

  "S2-016": `**Fixed prompt:**

"Write a research brief on lithium battery supply chains. Use ONLY the sources I provide below.

For each claim, add an inline citation: [Source N]. If you would normally include a fact but have no source for it from my list, write [source needed] instead — do not include the claim as if it's verified. If you have no relevant sources for a section, write 'no sources provided for this section.'

[PASTE SOURCES HERE]

Output: brief with inline citations throughout + numbered sources list at the end."

**Root cause:** the original ask had 12 citation-shaped holes. The model filled every one. The fix changes the slot — instead of requiring a citation, it permits "source needed" — and restricts input to provided sources rather than the model's training data.`,

  "S2-017": `**Three-tier verification policy:**

**Tier 1 — Spot-check:** you read it, it looks right, you move on.
*Applies to:* internal drafts, first-pass summaries, low-stakes Slack messages.
*Trigger:* reversible if wrong; no one acts on it without seeing the source.

**Tier 2 — Second eyes:** a colleague reviews before it goes anywhere.
*Applies to:* client-facing content, numbers informing a decision, anything in a customer email.
*Trigger:* someone will act on this without consulting the original source.

**Tier 3 — Expert review:** a domain specialist signs off.
*Applies to:* legal documents, financial projections used in decisions, medical or safety-adjacent content.
*Trigger:* wrong = expensive, irreversible, or creates liability.

**The trigger between tiers:** stakes × reversibility. One step up when either doubles.`,

  "S2-018": `Skimming AI output without reading it creates a compounding tax. Today you approve a slightly wrong summary. Next week a colleague builds on that summary. Next month a decision is made that cites it. Three months from now, when the decision turns out to be based on a wrong premise, no one can trace it back to the AI output — it's just "what everyone knows."

**The cost of not reading** isn't the error you missed today. It's the organisational scar tissue that forms as small errors get ratified into institutional truth. And by the time it becomes expensive, the team has also lost the ability to spot similar errors — they've been approving them for months.

The person who "doesn't have time to verify" is actually choosing to pay a large deferred cost instead of a small immediate one.`,

  "S2-019": `| Task | Tier | Key criterion |
|---|---|---|
| (c) Customer feedback summary | Auto | Reversible, low-stakes, no external audience |
| (e) Bug triage | Auto | Reversible, technical, easily overridden by engineer |
| (a) Investor update draft | Supervised | External audience; reviewed before sending |
| (b) Payroll calculation | Supervised | High-stakes; must be human-verified before processing |
| (d) Board narrative | Human-only | Accountability-bearing; irreversible reputational impact |
| (f) Security incident press response | Human-only | Legal and PR risk; irreversible once public |

**Tier rule:** Tier = f(stakes × reversibility × audience size). Auto when all three are low; Human-only when any one is high. Supervised is the middle — high on one axis, low on others.`,

  "S2-020": `**Verified** = grounded in one trusted primary source you can point to.
Enough for: stable facts with a clear authoritative source — a law, a published standard, a company's own official announcement.

**Cross-referenced** = the claim appears consistently across multiple independent sources.
Enough for: facts where one source could be wrong but the pattern is strong — widely reported historical dates, mainstream scientific consensus.

**Neither is enough when:**
- The claim originates from a chain of AI-summarised-from-AI content (even if consistent, it shares one root)
- The "primary source" is itself a derivative — a Wikipedia article, a news piece citing an unnamed official, a blog post
- The claim is unique and high-stakes (a specific legal clause, a precise financial figure)

In these cases: trace to the original document — the regulation text, the raw dataset, the paper itself — and read it directly.`,

  // ───────────────────────────────────────────────────────────────────────────
  // S3 — Agentic Engineering
  // ───────────────────────────────────────────────────────────────────────────

  "S3-001": `**Agent step decomposition:**

**Step 1 — FETCH** *(web-fetch tool × 3)*
Fetch each competitor's pricing page. Store raw content to scratch file: competitor_A_today.txt, competitor_B_today.txt, competitor_C_today.txt.

**Step 2 — LOAD YESTERDAY** *(file-read tool × 3)*
Read yesterday's snapshots. If no file exists for a competitor, note "first run — no diff available" and skip that competitor's diff.

**Step 3 — DIFF** *(no tool — text comparison)*
For each competitor with both files, extract only the sections that changed. If no changes, record "no changes detected."

**Step 4 — SUMMARISE DELTAS** *(language model call)*
Write 1–2 sentences per competitor covering only what changed. Skip competitors with no changes.

**Step 5 — COMPOSE BRIEF** *(file-write tool)*
Assemble: date header + three competitor sections + any fetch-failure notes. Write to brief_YYYY-MM-DD.txt.

**Error branches:** fetch failure on any competitor → note "fetch failed for [competitor], skipped" in the brief; do not halt the entire run.`,

  "S3-002": `# Email Triage Agent — Operating Doc

## Role
You triage inbound recruiting emails: apply a role-type tag, apply an urgency tag, and draft a reply for human review. You do not send anything.

## MAY do autonomously
- Apply role-type tag: engineering / design / PM / ops / other
- Apply urgency tag: urgent / normal / low
- Draft a reply for every tagged email
- Mark an email as "no action needed" if it is clearly spam or recruiter outreach to us (not from a candidate)

## MUST wait for human approval before
- Any message goes to a candidate
- Any change to an existing draft after initial creation

## NEVER
- Send any email directly under any circumstances
- Make any reference to salary, equity, or timelines in a draft
- Identify or reference a candidate's demographic information
- Draft a rejection without flagging it as a rejection in a separate field for explicit human review
- Access information about a candidate beyond the email currently being processed`,

  "S3-003": `**Pass/fail eval checks for the email-triage agent:**

1. Every email in the inbox has exactly one role-type tag and one urgency tag — zero untagged emails
2. Every tagged email has a draft reply in the outbox — no tags without a corresponding draft
3. The sent-messages folder contains zero emails without a matching human-approval timestamp in the approval log
4. For a test input where the candidate's name is "Priya Sharma": draft reply contains "Priya" in the opening — not a generic placeholder
5. For a test input stating the role is "senior data scientist": draft and tag reference "data scientist" or "DS" — not a default generic role
6. Emails with no discernible candidate inquiry (spam, internal mails) are tagged "no action" with no draft generated
7. No email with a received timestamp more than 4 hours ago remains unprocessed in the inbox during business hours

Every check is a database query, log comparison, or string match — a script decides pass/fail with no human reading required.`,

  "S3-004": `| Action | Autonomy | Reason |
|---|---|---|
| (a) Apply tags | FULL | Fully reversible, no external visibility, trivially correctable |
| (b) Reply to scheduling email | GATED | External-facing — draft and wait for approval |
| (c) Send a rejection | OFF | Irreversible emotional impact; must be human-written and reviewed |
| (d) Escalate a legal threat | OFF | Legal risk; no automated response on anything legal |
| (e) Update ATS record | FULL | Internal system, reversible, low stakes |

**Rule:** autonomy is proportional to reversibility and inversely proportional to stakes.
- Low stakes + reversible (tags, internal records) → full auto
- External-facing but low-stakes → gated (human sees it before it goes)
- Irreversible or high-stakes → off (human originates it)`,

  "S3-005": `An agent can take over the entire pipeline *up to* the hiring decision itself: source candidates from job boards, screen CVs against criteria, schedule interviews, send confirmations, collect feedback, summarise interview notes, and draft offer or rejection letters.

The ceiling is the final hire/no-hire call. Not because AI can't pattern-match on candidate data — it can. It's because hiring decisions involve three things that can't be delegated:

1. **Accountability** — someone answers for a bad hire
2. **Edge-case judgment** — the unconventional candidate with a gap year who turns out exceptional
3. **Bias risk** — automated scoring on proxies for demographic attributes creates legal and ethical exposure

The right frame: the agent makes the human's decision faster and better-informed. It doesn't replace the decision. The human moves from doing the pipeline work to owning the judgment call at the end.`,

  "S3-006": `**Tool-shaped step decomposition:**

**Step 1 — READ** *(repo-read tool)*
Fetch CODEOWNERS file from repository root.

**Step 2 — PARSE** *(text processing — no tool)*
Extract owner-per-path mappings. Build list: [{path, owner}].

**Step 3 — LOAD WIKI** *(wiki-read tool)*
Fetch current "who owns what service" page.

**Step 4 — DIFF** *(text comparison — no tool)*
Compare parsed CODEOWNERS against wiki. Identify: new paths, removed paths, changed owners.

**Step 5 — WRITE** *(wiki-write tool)*
Update only the changed entries. Preserve all unchanged lines exactly.

**Edge case:** if a path has no owner in CODEOWNERS → write the entry as "[owner: unassigned — human review needed]". Do not guess, do not leave blank.

**Capability gap flagged:** resolving who *should* own an unassigned path requires organisational knowledge this agent doesn't have — route to a human.`,

  "S3-007": `**Memory / context-engineering spec for a 30-session research agent:**

**Persist between sessions (written to notes.md at session end):**
- All decisions made and their rationale
- Open questions not yet answered, with why they're still open
- Sources found: URL, title, key claim, relevance score (1–5)
- Current report outline with section status: [complete / in progress / not started]
- The 2–3 concrete next steps planned for the next session

**Re-read at session start:**
- The full notes.md (decisions, open questions, outline, next steps)
- Do NOT re-read raw fetched content — only processed summaries
- The partial report draft if editing an existing section

**Do NOT carry forward:**
- Raw HTML from fetched pages (noise)
- Dead-end sources already marked as not useful
- Duplicate summaries of the same source
- Superseded plans or abandoned approaches

**Design principle:** each session starts from a structured state file, not from scratch and not from a dump of everything accumulated. The notes file is the agent's only memory; treating it carelessly is how long-running agents go off the rails.`,

  "S3-008": `**Failure-containment section:**

**If any read step fails:**
Halt immediately — do not attempt reconciliation with incomplete data.
Post to Slack: "Reconciliation halted: [ledger name] unreadable at [timestamp]. Human review needed before next run."

**If data anomaly detected** (delta > 15% from prior period, impossible negative balance, total mismatch between ledgers):
Do not post a "balanced" summary.
Post: "Anomaly flagged in [field]: observed [value], expected [range]. Reconciliation paused — review needed."

**If reconciliation completes but totals don't match:**
Do not post a reconciliation summary that implies the books are balanced.
Post: "Discrepancy found: [amount] unresolved. Do not act on financials until reviewed."

**If everything checks out:**
Post summary as normal.

**Default principle:** when uncertain, post a flagged alert rather than a confident wrong number. A silent night with an alert is far safer than a wrong Slack post that gets acted on before anyone reads it carefully.`,

  "S3-009": `**Idempotency spec:**

**Before sending any email:**
1. Query the sent-log store: has [user_id] been emailed for [batch_id]?
2. If YES: skip entirely — do not send, do not log again
3. If NO: proceed to send

**After a successful send:**
Write {user_id, batch_id, timestamp, send_status: success} to the sent-log.

**On send failure:**
Do NOT write to the sent-log. The user has not been emailed; the next trigger should retry them.

**On duplicate trigger:**
The agent re-runs the same loop. The sent-log check at step 1 gates every send — already-processed users are automatically skipped. No special duplicate-trigger handling needed.

**The asymmetry principle:** double-send is annoying but recoverable (an apology email can follow). Zero-send is a broken onboarding promise. The spec biases toward sending on first-time sends; the log prevents duplicates. Do not over-engineer the dedup at the expense of reliability.`,

  "S3-010": `**Researcher output contract — handoff file schema:**

\`\`\`
research_brief:
  topic: [string]
  date: [ISO 8601]
  status: complete | partial (note why if partial)

sources:
  - id: S1
    url: [url]
    title: [title]
    retrieved: [ISO 8601 date]
    key_claims:
      - claim: [exact quote or close paraphrase]
        confidence: high | medium | low
        relevance_to_brief: [one sentence why this matters]
  - id: S2
    ...

open_questions:
  - [question the researcher couldn't answer, with why it's still open]

recommended_structure:
  - section: [name]
    status: ready to write | needs more research
    primary_sources: [S1, S3, ...]
\`\`\`

**Writer contract:** the writer works only from this file — it cannot re-query the researcher. Every claim used in the brief must reference a source ID. If confidence is low, the writer must flag it in the output. Open questions are surfaced to the human, not resolved by guessing.`,

  "S3-011": `**Regression checks for the email-triage agent:**

1. **Spam guard:** input: obvious spam email → expected: tag "no action", zero drafts generated *(tests that spam handling hasn't regressed)*
2. **Role tag accuracy:** input: "We're hiring a senior iOS engineer" → expected: role-type = "engineering" *(pins basic classification)*
3. **Urgency tag accuracy:** input: email marked urgent in body → expected: urgency = "urgent" *(pins urgency signal detection)*
4. **No unauthorised sends:** input: any email → expected: zero entries in sent-folder without matching approval record within 10 minutes *(pins the most critical safety behaviour)*
5. **Personalisation check:** input: email from "Priya Sharma <priya@co.com>" → expected: draft reply contains "Priya" — not "[name]" or "Hi there" *(pins name extraction)*
6. **Role specificity check:** input: email for "product manager" role → expected: draft mentions "product manager" or "PM" — not "engineer" or a blank placeholder *(pins role-referencing)*
7. **Null case:** input: email with no discernible role type → expected: role-type = "other", not null or empty *(pins the fallback path)*`,

  "S3-012": `**Prompt to generate the golden test set:**

"Generate 15 labeled examples for evaluating an email-triage agent's tagging. Each example must include:
- input: [email subject + 2–3 sentence body]
- expected_role_tag: engineering | design | PM | ops | other
- expected_urgency_tag: urgent | normal | low
- label_rationale: [one sentence explaining why this label is unambiguous from the email text alone]
- category: common | edge | adversarial

Distribution:
- 5 common cases: clear role signal, clear urgency
- 5 edge cases: ambiguous role title (e.g. 'growth' — is it PM or ops?), mixed urgency signals
- 5 adversarial cases: a developer who describes their work in PM language; an email with 'URGENT!!' in the subject that's actually a newsletter; a role so niche the agent might default to 'engineering'

Every expected label must be derivable from the email text alone — no external knowledge required to verify correctness. This set is used as ground truth without re-labelling."`,

  "S3-013": `**Adversarial eval checks for the financial reconciliation agent:**

1. **Off-by-one injection:** ledger A total = ₹1,000,000, ledger B total = ₹1,000,001 → expected: agent flags discrepancy, does NOT post "balanced" summary *(targets silent rounding acceptance)*

2. **Unmatched line item:** one entry in ledger A has no matching entry in ledger B → expected: agent flags the unmatched line, does not summarise as reconciled *(targets silent suppression of orphan entries)*

3. **Impossible negative balance:** ledger B shows a negative balance in an account that cannot go negative → expected: agent posts an anomaly alert, not a summary *(targets confident posting of invalid data)*

4. **Corrupted input:** ledger A file is missing 20% of rows → expected: agent halts and alerts, does not proceed with partial data *(targets partial-data false positives)*

5. **True no-change (control):** both ledgers exactly match yesterday's figures → expected: agent posts "no discrepancy detected" without false-positive flagging *(ensures the adversarial checks don't over-fire on clean data)*

Each test: known-bad or edge-state input → exact expected output. The silent confident-wrong post is the failure we're hunting.`,

  "S3-014": `| Action | Autonomy | Risk rationale |
|---|---|---|
| (a) Run test suite | FULL | Safe, diagnostic, no side effects — just reads and reports |
| (b) Merge green PR to feature branch | GATED | Code goes somewhere permanent; context matters |
| (c) Merge to main | GATED | Wider blast radius; harder to undo cleanly |
| (d) Deploy to production | GATED | Customer-facing, potentially revenue-impacting |
| (e) Roll back bad deploy | FULL | Recovery action — speed is critical here; human approval is a dangerous bottleneck |
| (f) Delete database backup | OFF | Irreversible data loss — no automation should ever touch this |

**Key inversion:** (e) the rollback gets MORE autonomy than (d) the deploy. Recovery actions *reduce* risk — slowing them down makes the incident worse. Destructive or high-impact actions get gated or off. Reversibility, not just stakes, determines the floor.`,

  "S3-015": `| Action | Autonomy | Threshold logic |
|---|---|---|
| (a) Refund under ₹500 with valid receipt | FULL | Below low-value threshold + policy-clear |
| (b) Refund ₹500–₹5,000 | GATED | Above routine threshold; needs human sign-off |
| (c) Refund over ₹5,000 | OFF | High-value financial action; fraud risk; human decision |
| (d) Issue store credit | FULL | Non-cash, low-value, easily reversed |
| (e) Ban user for fraud | OFF | Irreversible reputational damage + legal exposure |
| (f) Reply explaining declined refund | FULL | Informational, reversible by follow-up |

**Threshold rule:** full autonomy below ₹500 (low value + clear policy); gated ₹500–₹5,000 (medium risk, human verifies); human-only above ₹5,000 or any irreversible action.

The ban (e) is OFF not because of the monetary value but because reputation damage is unrecoverable — the stakes axis overrides the value axis.`,

  "S3-016": `Watching the agent run a few times is an O(n) trust strategy: each new version, each new edge case, each new input type requires you to watch again. It doesn't scale, it can't run on every deploy, and it reliably misses rare failures — because you only see what happened to run during your watch.

An eval is a trust instrument you build once and run automatically forever. It covers the cases you've seen, the edge cases you've thought through, and it fires on every change. The agent without an eval is unfalsifiable — you can never know if a change broke something you didn't happen to test.

**Cost story:** your agent handles 1,000 emails a day. You watch 5 test runs after launch — all fine. Week 3, emails with attachments start misfiring silently. You don't find out for 10 days because you stopped watching. An eval covering "email with attachment" catches this on the very next deploy, before it reaches a single candidate.`,

  "S3-017": `**Labor:** "I need a competitive analysis. I'll use Claude to help me write it faster." The human is still doing the work — the AI speeds up each instance of the task.

**Leverage:** "I need a competitive analysis every week. I'll build an agent that fetches competitor pricing pages, identifies changes, and drafts the section automatically." The human defines the task once, evaluates the output, and decides what to act on. The AI does the work every week without being asked.

**The shift:** from doing-faster to specifying-and-evaluating.

**In the "after," the human's job becomes:**
- Designing what the agent tracks (and what it ignores)
- Setting the quality bar and reviewing the output critically
- Deciding what to act on

Less repetitive execution, more design and judgment. The human moves from labor to owning the system.`,

  "S3-018": `Prompting is about the words in your message. Context engineering is about what information is in the context window at all — and at scale, it completely dominates.

At each step of a long-running agent, the context window is finite. What you load determines what the agent knows. Load the wrong things (raw HTML, completed steps, superseded plans) and you burn window on noise. Load the right things (current state, open questions, relevant prior decisions) and the agent has exactly what it needs.

**Good curation:** at the start of each session, the agent loads its structured notes file (decisions, open questions, next steps) and the current draft outline. Nothing else. It knows exactly where it left off.

**Bad curation:** at the start of each session, the agent loads the full conversation history from all prior sessions. By session 10, the window is full of dead ends, raw data, and superseded thinking — the useful state is buried in noise, and the agent starts making decisions based on what it happened to see most recently rather than what matters.`,

  "S3-019": `**Three structural fixes — no prompting required:**

**Fix 1 — Step budget:** the agent gets a maximum of N actions per run (e.g., 50 ticket actions). When the budget is exhausted, it stops and reports: "processed N tickets, [count] remain for next run."

**Fix 2 — Self-created ticket filter:** before acting on any ticket, check if it was created *after* the current run started. If yes, flag it for the next run — the agent never acts on its own output in the same session.

**Fix 3 — Queue-size circuit breaker:** at the end of each processing batch, compare queue size to the start. If the queue grew, halt and alert: "queue size increased during run — possible feedback loop detected."

**Root cause:** the model was acting on its own output (a feedback loop). More prompting can't fix a structural loop — you need to sever it at the data level (filter self-created tickets) and bound it structurally (step budget). The fix is architectural, not lexical.`,

  "S3-020": `**The problem:** the eval tested *existence* ("a tag exists") not *correctness* ("the right tag"). The agent always tags and always drafts — so the eval is always green. A broken agent that tags every email "engineering" and addresses every candidate "Hi [name]" passes perfectly.

**Fixed eval adds content-correctness checks:**

1. Extract the candidate's name from the From field. Assert: draft reply opens with "Hi [that name]" — not "Hi there", not "[name]", not the wrong name.

2. Extract the stated role from the email body. Assert: the role-type tag and draft body reference that specific role — not a default.

3. Weekly regression: run 5 known-labeled test inputs through the live agent. Assert: each tag matches the expected label from when the agent was last validated.

4. Assert: no draft addresses a candidate by a name that doesn't appear anywhere in the source email.

**The lesson:** presence checks tell you the pipeline ran. Correctness checks tell you it worked. An eval that only tests presence is green by default — which is indistinguishable from an eval that's actually passing.`,
};
