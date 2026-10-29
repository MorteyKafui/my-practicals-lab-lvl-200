/**
 * The do-it-yourself set-up: the student picks the apparatus from a shelf (which also holds
 * things this practical does not need) and, for circuits, wires it terminal to terminal.
 * A circuit is right when its nets — groups of terminals joined by wires — match the
 * required ones, however the student routed the wires.
 */

export interface SetupItem {
  id: string;
  /** Whether this practical needs it. Text (name, why) lives in messages: experiments.<id>.setup.items.<item>. */
  needed: boolean;
}

export interface SetupPart {
  /** Item id on the shelf this part of the circuit belongs to. */
  item: string;
  terminals: { id: string; label: string }[];
}

export interface SetupSpec {
  items: SetupItem[];
  /** Circuit to wire, if the practical has one. */
  circuit?: {
    parts: SetupPart[];
    /** Wires of one correct circuit; any wiring with the same nets is accepted. */
    wires: [string, string][];
    /** Terminal id → message key (experiments.<id>.setup.hints.<key>) shown when that terminal is wrong. */
    hints?: Record<string, string>;
  };
}

export interface SetupState {
  placed: string[];
  wires: [string, string][];
  done: boolean;
}

export const emptySetup = (): SetupState => ({ placed: [], wires: [], done: false });

/** Group terminals into nets (connected components) from a list of wires. */
export function nets(terminals: readonly string[], wires: readonly [string, string][]): Map<string, string> {
  const parent = new Map(terminals.map((t) => [t, t]));
  const find = (t: string): string => {
    let r = t;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(t, r);
    return r;
  };
  for (const [a, b] of wires) {
    if (!parent.has(a) || !parent.has(b)) continue;
    parent.set(find(a), find(b));
  }
  return new Map(terminals.map((t) => [t, find(t)]));
}

/** Terminals whose net differs from the required circuit (empty when the circuit is right). */
export function wrongTerminals(spec: NonNullable<SetupSpec["circuit"]>, wires: readonly [string, string][]): string[] {
  const terminals = spec.parts.flatMap((p) => p.terminals.map((t) => t.id));
  const want = nets(terminals, spec.wires);
  const have = nets(terminals, wires);
  const members = (m: Map<string, string>, t: string) =>
    terminals
      .filter((x) => m.get(x) === m.get(t))
      .sort()
      .join("|");
  return terminals.filter((t) => members(want, t) !== members(have, t));
}

export function sameWire(a: readonly [string, string], b: readonly [string, string]) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}
