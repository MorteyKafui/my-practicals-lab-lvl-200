import Anthropic from "@anthropic-ai/sdk";

/**
 * Optional AI critique of the student's written sections, using the student's own Claude API
 * key (stored only on this device). Claude gives formative feedback — what is missing, unclear
 * or wrong — and never writes text for the student to copy. It is not told the accepted values,
 * so it cannot leak them before Compare is unlocked.
 */

const MODEL = "claude-opus-5-5";

const SYSTEM = `You are a physics laboratory demonstrator giving formative feedback on a university student's lab report.

Rules:
- Never write or rewrite any part of the report, and never give sentences the student could copy. Point out what is missing, unclear or physically wrong, and ask questions that lead the student to improve it.
- You do not know the accepted value for this practical. Do not state one or guess one.
- Judge each section against what a marker looks for:
  Discussion: analysis of the graph, interpretation in terms of the theory, expected versus obtained behaviour, analysis of experimental error, explanation using the theory, comparison with similar investigations.
  Precautions: things the student actually did to make readings reliable, stated in the past tense.
  Sources of error: specific physical effects (not "human error"), ideally with the direction they push the result.
  Conclusion: answers the aim, with the result and its unit.
- Be encouraging and specific. Use at most 8 short bullet points in total, grouped under the section names. Plain text only.`;

export interface CritiqueInput {
  apiKey: string;
  practical: string;
  aim: string;
  /** The student's own results, e.g. "μ = 7.12 × 10⁻⁴ kg m⁻¹". */
  results: string[];
  writing: { discussion: string; precautions: string; sourcesOfError: string; conclusion: string };
}

export class CritiqueError extends Error {}

export async function critiqueWriting(input: CritiqueInput): Promise<string> {
  const client = new Anthropic({ apiKey: input.apiKey, dangerouslyAllowBrowser: true });
  const report = [
    `Practical: ${input.practical}`,
    `Aim: ${input.aim}`,
    `The student's results: ${input.results.length ? input.results.join("; ") : "(not yet calculated)"}`,
    "",
    `DISCUSSION:\n${input.writing.discussion || "(empty)"}`,
    `PRECAUTIONS:\n${input.writing.precautions || "(empty)"}`,
    `SOURCES OF ERROR:\n${input.writing.sourcesOfError || "(empty)"}`,
    `CONCLUSION:\n${input.writing.conclusion || "(empty)"}`,
  ].join("\n");

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: `Give feedback on these sections of my lab report.\n\n${report}` }],
    });
    if (response.stop_reason === "refusal") throw new CritiqueError("Claude could not give feedback on this text.");
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new CritiqueError("Claude returned no feedback. Try again.");
    return text;
  } catch (error) {
    if (error instanceof CritiqueError) throw error;
    if (error instanceof Anthropic.AuthenticationError) throw new CritiqueError("Your Claude API key was not accepted. Check it in Settings.");
    if (error instanceof Anthropic.RateLimitError) throw new CritiqueError("Too many requests just now — wait a minute and try again.");
    if (error instanceof Anthropic.APIConnectionError) throw new CritiqueError("Could not reach Claude. AI feedback needs an internet connection.");
    if (error instanceof Anthropic.APIError) throw new CritiqueError(`Claude returned an error (${error.status}).`);
    throw error;
  }
}
