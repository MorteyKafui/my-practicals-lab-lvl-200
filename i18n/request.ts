import { getRequestConfig } from "next-intl/server";

import { MESSAGES_EN } from "@/experiments/messages";

// English only for now; every string goes through next-intl so more locales can be added by
// adding message files (the app's and each practical's).
export const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: MESSAGES_EN,
}));
