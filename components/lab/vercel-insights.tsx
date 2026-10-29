"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics and Speed Insights (active when deployed on Vercel). Query strings are
 * removed before anything is sent: workspace URLs carry the student's session id (?s=…), and
 * nothing about a student's work should leave their device.
 */
function withoutQuery<T extends { url: string }>(event: T): T {
  const url = new URL(event.url);
  url.search = "";
  return { ...event, url: url.toString() };
}

export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={withoutQuery} />
      <SpeedInsights beforeSend={withoutQuery} />
    </>
  );
}
