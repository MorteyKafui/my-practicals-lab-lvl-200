import type { FeedbackRule, Finding } from "../feedback";

/** Feedback from the do-it-yourself set-up, read from the action log. */
export const SETUP_RULES: FeedbackRule[] = [
  {
    id: "setup-picks",
    stage: "setup",
    check: ({ actions }) => {
      const wrong = new Set(actions.filter((a) => a.kind === "setup-pick" && a.detail?.needed === false).map((a) => String(a.detail?.item)));
      const findings: Finding[] = [];
      if (wrong.size) findings.push({ rule: "setup-picks", severity: "tip", stage: "setup", key: "setup.wrongPicks", params: { n: wrong.size } });
      const failed = actions.filter((a) => a.kind === "setup-check" && a.detail?.ok === false).length;
      if (failed >= 2) findings.push({ rule: "setup-picks", severity: "tip", stage: "setup", key: "setup.circuitAttempts", params: { n: failed } });
      if (actions.some((a) => a.kind === "setup-check" && a.detail?.ok === true) && wrong.size === 0 && failed === 0)
        findings.push({ rule: "setup-picks", severity: "good", stage: "setup", key: "setup.clean" });
      return findings;
    },
  },
];
