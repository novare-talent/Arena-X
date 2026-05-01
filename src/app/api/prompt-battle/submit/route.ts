import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TIER_MAP = (score: number) => {
  if (score >= 91) return "Master";
  if (score >= 76) return "Expert";
  if (score >= 61) return "Practitioner";
  if (score >= 41) return "Apprentice";
  return "Novice";
};

const MODEL_ID: Record<string, string> = {
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4o":      "gpt-4o",
  "gemini-pro":  "gpt-4o-mini", // placeholder until Gemini SDK added
};

async function runPromptOnModel(model: string, prompt: string): Promise<string> {
  const modelId = MODEL_ID[model] ?? "gpt-4o-mini";
  const response = await openai.chat.completions.create({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content ?? "";
}

async function judgePrompt(
  task: { goal: string; input_material: string | null },
  promptText: string,
  modelOutput: string
): Promise<{
  score_goal: number;
  score_context: number;
  score_constraint: number;
  score_robustness: number;
  score_efficiency: number;
  feedback: string;
}> {
  const systemPrompt = `You are an expert prompt engineering judge. Score the user's prompt on 5 criteria (0-4 each) strictly per the rubric below.

RUBRIC:
1. Goal Specificity (0-4): Does the prompt clearly define what "done" looks like?
   0=No goal. 1=Goal implied only. 2=Goal stated but no success criteria. 3=Goal + success criteria. 4=Goal + success criteria + explicit non-goals.

2. Context Provisioning (0-4): Did the prompt supply the information an LLM needs?
   0=No context when required. 1=Context referenced but not supplied. 2=Partial context. 3=Complete context, unstructured. 4=Complete context with labeled sections/delimiters.
   Exception: generation tasks from scratch = auto 4.

3. Constraint Precision (0-4): Are format, length, tone, audience specified?
   0=No constraints. 1=One loose constraint. 2=2-3 constraints, some ambiguous. 3=Format+length+tone clear. 4=Format+length+tone+audience+exclusions.

4. Robustness (0-4): Does the prompt handle edge cases?
   0=Breaks on obvious edge cases. 1=Base case only. 2=Common edge cases implicit. 3=Explicit 1-2 edge cases or ambiguity rules. 4=Edge cases + ambiguity rules + fallback behavior.

5. Efficiency (0-4): Is every word earning its place?
   0=Bloated/contradictory/discredited tricks. 1=30%+ redundancy. 2=Some filler. 3=Tight. 4=Optimally tight.

SCORING RULES:
- Use the full 0-100 scale. Do NOT default to 65-80.
- Missing any of {explicit goal, format spec, audience/tone} CAPS at 60.
- Under 20 words = 0-25 range.
- "You are a world-class expert" type openers = -1 on Efficiency.
- Never award all 4s (that would be 100, which is reserved for publishable teaching examples).

Respond ONLY with valid JSON in this exact shape:
{
  "score_goal": <0-4 integer>,
  "score_context": <0-4 integer>,
  "score_constraint": <0-4 integer>,
  "score_robustness": <0-4 integer>,
  "score_efficiency": <0-4 integer>,
  "feedback": "<one specific, actionable sentence tied to the LOWEST scoring criterion, with a concrete example of what to add>"
}`;

  const userContent = `TASK GOAL: ${task.goal}

INPUT MATERIAL PROVIDED IN TASK:
${task.input_material ?? "(none — generation task)"}

USER'S PROMPT:
${promptText}

MODEL OUTPUT (for context only — judge the prompt, not the output quality):
${modelOutput.slice(0, 400)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  return {
    score_goal:       Math.min(4, Math.max(0, parseInt(parsed.score_goal) || 0)),
    score_context:    Math.min(4, Math.max(0, parseInt(parsed.score_context) || 0)),
    score_constraint: Math.min(4, Math.max(0, parseInt(parsed.score_constraint) || 0)),
    score_robustness: Math.min(4, Math.max(0, parseInt(parsed.score_robustness) || 0)),
    score_efficiency: Math.min(4, Math.max(0, parseInt(parsed.score_efficiency) || 0)),
    feedback: parsed.feedback ?? "Improve the weakest criterion.",
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { session_id, task_id, prompt_text, model, attempt_number = 1, is_pro_revision = false } = body;

  if (!session_id || !task_id || !prompt_text) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Fetch the task
  const { data: task } = await supabase
    .from("prompt_tasks")
    .select("goal, input_material")
    .eq("id", task_id)
    .single();

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Run prompt on chosen model
  let modelOutput = "";
  try {
    modelOutput = await runPromptOnModel(model, prompt_text);
  } catch {
    modelOutput = "(Model execution failed — scoring the prompt structurally)";
  }

  // Judge the prompt
  const scores = await judgePrompt(task, prompt_text, modelOutput);
  const raw = scores.score_goal + scores.score_context + scores.score_constraint + scores.score_robustness + scores.score_efficiency;
  const composite = raw * 5;
  const tier = TIER_MAP(composite);

  // Store attempt
  const { data: attempt } = await supabase
    .from("prompt_attempts")
    .insert({
      session_id,
      user_id: user.id,
      task_id,
      prompt_text,
      model_output: modelOutput,
      score_goal:       scores.score_goal,
      score_context:    scores.score_context,
      score_constraint: scores.score_constraint,
      score_robustness: scores.score_robustness,
      score_efficiency: scores.score_efficiency,
      composite_score: composite,
      tier,
      feedback: scores.feedback,
      attempt_number,
      is_pro_revision,
    })
    .select("id")
    .single();

  return NextResponse.json({
    score_goal:       scores.score_goal,
    score_context:    scores.score_context,
    score_constraint: scores.score_constraint,
    score_robustness: scores.score_robustness,
    score_efficiency: scores.score_efficiency,
    composite_score: composite,
    tier,
    feedback: scores.feedback,
    model_output: modelOutput,
    attempt_id: attempt?.id ?? null,
  });
}
