type Json = Record<string, unknown>;

/** Deep-merge plain JSON objects (later wins); used to combine per-practical message files. */
export function deepMerge<T extends Json>(base: T, ...parts: Json[]): T {
  const out: Json = { ...base };
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      const current = out[key];
      out[key] =
        value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object" && !Array.isArray(current)
          ? deepMerge(current as Json, value as Json)
          : value;
    }
  }
  return out as T;
}
