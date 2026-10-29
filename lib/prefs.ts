"use client";

import { useSyncExternalStore } from "react";

/**
 * Per-device UI conveniences (a dismissed dialog, a quality setting) kept in localStorage.
 * Storage can be missing or throw (private windows, blocked site data), so every access
 * is guarded and the app behaves as if nothing was saved.
 */
const PREFIX = "physics-bench:";
const EVENT = "physics-bench:pref";

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function readPref<T>(key: string): T | undefined {
  const raw = typeof window === "undefined" ? null : readRaw(key);
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not saved; the preference simply won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A preference as reactive state. Undefined on the server and until the client reads storage. */
export function usePref<T>(key: string): T | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** A CSS media query as reactive state (false on the server). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
