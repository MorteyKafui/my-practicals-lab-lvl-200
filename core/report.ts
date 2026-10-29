import type { LabAction } from "./action-log";

/**
 * The lab report in the 15-section format:
 *   Date · Title · Aim · Apparatus · Diagram · Theory · Method · Observations · Graph ·
 *   Calculation · Discussion · Precautions · Sources of error · Conclusion · References
 * Facts are filled from the session; the written sections are the student's own words.
 */

export interface ReportModel {
  student: string;
  date: string;
  title: string;
  aim: string;
  apparatus: string[];
  theory: string[];
  method: string[];
  constants: string[];
  table: { headers: string[]; rows: string[][] };
  graphTitle: string;
  calculation: string[];
  discussion: string;
  precautions: string[];
  sourcesOfError: string[];
  conclusion: string;
  references: string[];
  footer: string;
}

/**
 * Method in the passive past tense, from what the student actually did. Repeated sentences
 * (the same step done for each fork) are stated once, in the order first done.
 */
export function methodFromActions(actions: readonly LabAction[], describe: (a: LabAction) => string | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const action of actions) {
    const sentence = describe(action);
    if (sentence && !seen.has(sentence)) {
      seen.add(sentence);
      out.push(sentence);
    }
  }
  return out;
}

/** Split a written list (one per line, or numbered) into items. */
export function listItems(text: string): string[] {
  return text
    .split(/\n/)
    .map((s) => s.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** LaTeX to readable plain text for the Word export (KaTeX renders it on screen). */
export function texToText(s: string): string {
  let out = s.replace(/\$\$?/g, "");
  for (let i = 0; i < 3; i++) {
    out = out
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
  }
  const symbols: Record<string, string> = {
    "\\mu": "μ",
    "\\lambda": "λ",
    "\\propto": "∝",
    "\\pi": "π",
    "\\theta": "θ",
    "\\varepsilon": "ε",
    "\\Phi": "Φ",
    "\\times": "×",
    "\\approx": "≈",
    "\\,": " ",
  };
  for (const [k, v] of Object.entries(symbols)) out = out.split(k).join(v);
  return out.replace(/\^\{2\}|\^2/g, "²").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}
