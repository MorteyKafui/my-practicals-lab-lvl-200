import { getRequestConfig } from "next-intl/server";

// English only for now; every string already goes through next-intl so more
// locales can be added by dropping a file into /messages.
export const DEFAULT_LOCALE = "en";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import(`../messages/${DEFAULT_LOCALE}.json`)).default,
}));
