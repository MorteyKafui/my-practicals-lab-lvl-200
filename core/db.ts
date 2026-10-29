import Dexie, { type EntityTable } from "dexie";

import type { Session } from "./session";

/** Everything is stored on the student's device. Nothing leaves it unless they export a .vlab file. */
class LabDatabase extends Dexie {
  sessions!: EntityTable<Session, "id">;

  constructor() {
    super("physics-bench");
    this.version(1).stores({
      sessions: "id, experimentId, updatedAt",
    });
  }
}

let db: LabDatabase | undefined;

export function getDb(): LabDatabase {
  db ??= new LabDatabase();
  return db;
}

export const VLAB_FORMAT = "physics-bench/session@1";

export interface VlabFile {
  format: typeof VLAB_FORMAT;
  exportedAt: string;
  session: Session;
}

export function toVlab(session: Session): VlabFile {
  return { format: VLAB_FORMAT, exportedAt: new Date().toISOString(), session };
}

export function fromVlab(data: unknown): Session {
  const file = data as Partial<VlabFile>;
  if (file?.format !== VLAB_FORMAT || !file.session?.id || !file.session.experimentId) {
    throw new Error("This file isn't a Physics Bench session.");
  }
  return file.session;
}
