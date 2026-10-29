"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";

import { getDb } from "@/core/db";
import { DEFAULT_ENVIRONMENT } from "@/core/environment";
import { newSeed } from "@/core/random";
import { emptyWriting, newRowId, type Mode, type Session } from "@/core/session";
import { readPref } from "@/lib/prefs";

/** TanStack Query over IndexedDB: one key per session, one per experiment's session list. */
export const sessionKeys = {
  all: ["sessions"] as const,
  forExperiment: (experimentId: string) => ["sessions", "experiment", experimentId] as const,
  one: (id: string) => ["sessions", "one", id] as const,
};

export function useAllSessions() {
  return useQuery({
    queryKey: sessionKeys.all,
    queryFn: () => getDb().sessions.orderBy("updatedAt").reverse().toArray(),
  });
}

export function useExperimentSessions(experimentId: string) {
  return useQuery({
    queryKey: sessionKeys.forExperiment(experimentId),
    queryFn: async () =>
      (await getDb().sessions.where("experimentId").equals(experimentId).toArray()).sort((a, b) => b.updatedAt - a.updatedAt),
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.one(id ?? ""),
    queryFn: async () => (await getDb().sessions.get(id!)) ?? null,
    enabled: Boolean(id),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ experimentId, mode }: { experimentId: string; mode: Mode }) => {
      const now = Date.now();
      const session: Session = {
        id: crypto.randomUUID(),
        experimentId,
        mode,
        seed: newSeed(),
        environment: readPref("environment") ?? DEFAULT_ENVIRONMENT,
        createdAt: now,
        updatedAt: now,
        stage: "brief",
        actions: [],
        constants: {},
        constantUnits: {},
        units: {},
        rows: Array.from({ length: 6 }, () => ({ id: newRowId(), cells: {} })),
        answers: {},
        writing: emptyWriting(),
      };
      await getDb().sessions.add(session);
      return session;
    },
    onSuccess: (session) => {
      qc.setQueryData(sessionKeys.one(session.id), session);
      void qc.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getDb().sessions.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

/**
 * Edit a session: the cache updates immediately (optimistic) and IndexedDB is written
 * shortly after, so typing in a table cell never waits on storage.
 */
export function useUpdateSession(id: string) {
  const qc = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return useCallback(
    (update: (session: Session) => Session) => {
      const current = qc.getQueryData<Session | null>(sessionKeys.one(id));
      if (!current) return;
      const next = { ...update(current), updatedAt: Date.now() };
      qc.setQueryData(sessionKeys.one(id), next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void getDb()
          .sessions.put(qc.getQueryData<Session>(sessionKeys.one(id)) ?? next)
          .then(() => qc.invalidateQueries({ queryKey: sessionKeys.all, refetchType: "none" }));
      }, 250);
    },
    [id, qc],
  );
}
