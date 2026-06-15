// OpenAI gpt-4o judge for a Forge submission against its per-challenge rubric.
// Returns rubric scores (0..max_score per dimension), a weighted overall
// score (0..100), and short markdown feedback for the learner.

import OpenAI from "openai";
import type { RubricDimension } from "./challenges";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.FORGE_JUDGE_MODEL || "gpt-4o";

export interface JudgeChallenge {
  title: string;
  brief: string;
  skill_forced: string;
  rubric: RubricDimension[];
}

export interface JudgeResult {
  rubric_scores: Record<string, number>;
  overall_score: number;
  feedback: string;
  judge_model: string;
}

function buildSystemPrompt(c: JudgeChallenge): string {
  const rubricLines = c.rubric.map((d) =>
    `- ${d.dimension} (weight ${d.weight}, 0..${d.max_score}): ${d.description}`
  ).join("\n");

  return `You are a strict, calibrated judge for the Forge Weekly Challenge — an async, build-it-at-home capstone for learners building real systems with LLMs.

CHALLENGE: ${c.title}
WHAT IT FORCES: ${c.skill_forced}

YOU JUDGE THE SUBMISSION AGAINST THIS RUBRIC:
${rubricLines}

CALIBRATION:
- Use the full 0..max_score range. The MEDIAN submission scores around 50% of max on each dimension.
- A perfect score on a dimension means the submission is a teaching example — usable as next week's reference solution.
- A zero means the submission did not even attempt that dimension.
- Be specific in feedback. Point to one concrete thing the learner should improve.
- If the artifact body is missing, truncated, or unreadable, score conservatively (do not give benefit of the doubt) and note the issue in feedback.
- For 'link' submissions where you cannot fetch the URL, score what you can verify from notes and any visible artifact text. Penalize 'shipping_velocity'-style dimensions if the link cannot be verified to be live.

RESPOND WITH JSON ONLY. Exact shape:
{
  "rubric_scores": { "<dimension_name>": <0..max_score number>, ... },
  "overall_score": <0..100 weighted total — you compute it: sum of (score / max_score * weight * 100) >,
  "feedback": "<2-4 sentences of markdown feedback, addressed to the learner, naming the lowest-scoring dimension and one concrete fix>"
}`;
}

export async function judgeSubmission(
  challenge: JudgeChallenge,
  artifactText: string,
): Promise<JudgeResult> {
  const systemPrompt = buildSystemPrompt(challenge);

  const userContent = `CHALLENGE BRIEF:
${challenge.brief}

----- SUBMISSION ARTIFACT -----
${artifactText}
----- END ARTIFACT -----

Judge the submission against the rubric. JSON only.`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: { rubric_scores?: Record<string, unknown>; overall_score?: unknown; feedback?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Judge returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  // Normalize + clamp rubric scores against the declared rubric.
  const rubric_scores: Record<string, number> = {};
  let weightedTotal = 0;
  let totalWeight = 0;
  for (const dim of challenge.rubric) {
    const raw = Number(parsed.rubric_scores?.[dim.dimension] ?? 0);
    const clamped = Math.max(0, Math.min(dim.max_score, isFinite(raw) ? raw : 0));
    rubric_scores[dim.dimension] = clamped;
    weightedTotal += (clamped / dim.max_score) * dim.weight * 100;
    totalWeight += dim.weight;
  }
  // Defend against the model returning weights that don't sum to 1.
  const overall = totalWeight > 0 ? weightedTotal / totalWeight : 0;

  const feedback = typeof parsed.feedback === "string"
    ? parsed.feedback.slice(0, 2000)
    : "Judge did not return feedback.";

  return {
    rubric_scores,
    overall_score: Math.round(overall * 10) / 10,
    feedback,
    judge_model: MODEL,
  };
}
