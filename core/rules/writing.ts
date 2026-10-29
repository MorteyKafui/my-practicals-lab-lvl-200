import type { FeedbackRule, Finding } from "../feedback";

/**
 * Checklist feedback on the written sections. These never write for the student; they say
 * what a marker looks for. Optional AI critique (Settings) can go further when online.
 */

function items(text: string): string[] {
  return text
    .split(/\n|;|•|(?:^|\s)\d+[.)]\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

const precautions: FeedbackRule = {
  id: "write-precautions",
  stage: "discussion",
  check: ({ session }) => {
    const list = items(session.writing.precautions);
    if (list.length === 0) return [{ rule: "write-precautions", severity: "warning", stage: "discussion", key: "write.noPrecautions" }];
    const findings: Finding[] = [];
    if (list.length < 3) findings.push({ rule: "write-precautions", severity: "tip", stage: "discussion", key: "write.fewPrecautions", params: { n: list.length } });
    // A precaution is something you DID ("I ensured…", "readings were taken…"), not a wish.
    if (/\b(should|must|need to|ought)\b/i.test(session.writing.precautions))
      findings.push({ rule: "write-precautions", severity: "tip", stage: "discussion", key: "write.precautionsTense" });
    return findings;
  },
};

const sources: FeedbackRule = {
  id: "write-sources",
  stage: "discussion",
  check: ({ session }) => {
    const text = session.writing.sourcesOfError;
    if (items(text).length === 0) return [{ rule: "write-sources", severity: "warning", stage: "discussion", key: "write.noSources" }];
    if (/human error|mistakes?/i.test(text) && items(text).length < 2)
      return [{ rule: "write-sources", severity: "tip", stage: "discussion", key: "write.vagueSources" }];
    return [];
  },
};

const conclusion: FeedbackRule = {
  id: "write-conclusion",
  stage: "discussion",
  check: ({ session }) => {
    const text = session.writing.conclusion.trim();
    if (text === "") return [{ rule: "write-conclusion", severity: "warning", stage: "discussion", key: "write.noConclusion" }];
    if (!/\d/.test(text)) return [{ rule: "write-conclusion", severity: "tip", stage: "discussion", key: "write.conclusionNoValue" }];
    return [];
  },
};

export const WRITING_RULES: FeedbackRule[] = [precautions, sources, conclusion];
