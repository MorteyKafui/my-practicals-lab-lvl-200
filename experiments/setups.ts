import type { SetupSpec } from "@/core/setup";

/**
 * The do-it-yourself set-up for each practical: what is on the shelf (needed items and
 * plausible distractors) and the circuit to wire. Text lives in messages: apparatus.<item>
 * and experiments.<id>.setup.{why,hints}.
 */

const items = (needed: string[], distractors: string[]) => [
  ...needed.map((id) => ({ id, needed: true })),
  ...distractors.map((id) => ({ id, needed: false })),
];

/** Supply, rheostat, ammeter and a load in one series loop (with ammeter polarity). */
function seriesLoop(load: { item: string; a: string; b: string }): NonNullable<SetupSpec["circuit"]> {
  return {
    parts: [
      { item: "dc-supply", terminals: [{ id: "psu+", label: "+" }, { id: "psu-", label: "−" }] },
      { item: "rheostat", terminals: [{ id: "rh1", label: "1" }, { id: "rh2", label: "2" }] },
      { item: "dc-ammeter", terminals: [{ id: "am+", label: "+" }, { id: "am-", label: "−" }] },
      { item: load.item, terminals: [{ id: "load1", label: load.a }, { id: "load2", label: load.b }] },
    ],
    wires: [
      ["psu+", "rh1"],
      ["rh2", "am+"],
      ["am-", "load1"],
      ["load2", "psu-"],
    ],
    hints: { "psu+": "loop", "psu-": "loop", rh1: "rheostatSeries", rh2: "rheostatSeries", "am+": "ammeterSeries", "am-": "ammeterSeries", load1: "loop", load2: "loop" },
  };
}

export const SETUPS: Record<string, SetupSpec> = {
  "stretched-wire": {
    items: items(["sonometer", "tuning-forks", "rubber-pad", "paper-rider", "slotted-masses"], ["voltmeter", "stopwatch", "horseshoe-magnet"]),
  },
  "ac-sonometer": {
    items: items(
      ["sonometer", "step-down-transformer", "switch", "horseshoe-magnet", "paper-rider", "slotted-masses"],
      ["tuning-forks", "dc-supply", "voltmeter"],
    ),
    circuit: {
      parts: [
        { item: "step-down-transformer", terminals: [{ id: "t1", label: "~1" }, { id: "t2", label: "~2" }] },
        { item: "switch", terminals: [{ id: "s1", label: "1" }, { id: "s2", label: "2" }] },
        { item: "sonometer", terminals: [{ id: "w1", label: "wire A" }, { id: "w2", label: "wire B" }] },
      ],
      wires: [
        ["t1", "s1"],
        ["s2", "w1"],
        ["w2", "t2"],
      ],
      hints: { t1: "loop", t2: "loop", s1: "loop", s2: "loop", w1: "loop", w2: "loop" },
    },
  },
  "resonance-tube-two": {
    items: items(["resonance-tube", "tuning-forks", "rubber-pad", "thermometer", "metre-rule"], ["signal-generator", "measuring-cylinder", "stopwatch"]),
  },
  "resonance-tube-forks": {
    items: items(["resonance-tube", "tuning-forks", "rubber-pad", "thermometer", "metre-rule"], ["signal-generator", "measuring-cylinder", "stopwatch"]),
  },
  helmholtz: {
    items: items(["flask-resonator", "measuring-cylinder", "signal-generator", "loudspeaker", "thermometer"], ["tuning-forks", "metre-rule", "oscilloscope"]),
    circuit: {
      parts: [
        { item: "signal-generator", terminals: [{ id: "g1", label: "out" }, { id: "g2", label: "⏚" }] },
        { item: "loudspeaker", terminals: [{ id: "sp1", label: "+" }, { id: "sp2", label: "−" }] },
      ],
      wires: [
        ["g1", "sp1"],
        ["g2", "sp2"],
      ],
      hints: { g1: "speaker", g2: "speaker", sp1: "speaker", sp2: "speaker" },
    },
  },
  faraday: {
    items: items(["signal-generator", "ac-ammeter", "solenoid", "search-coil", "oscilloscope"], ["dc-ammeter", "bar-magnet", "voltmeter"]),
    circuit: {
      parts: [
        { item: "signal-generator", terminals: [{ id: "g1", label: "out" }, { id: "g2", label: "⏚" }] },
        { item: "ac-ammeter", terminals: [{ id: "a1", label: "A" }, { id: "a2", label: "COM" }] },
        { item: "solenoid", terminals: [{ id: "p1", label: "1" }, { id: "p2", label: "2" }] },
        { item: "search-coil", terminals: [{ id: "c1", label: "1" }, { id: "c2", label: "2" }] },
        { item: "oscilloscope", terminals: [{ id: "y1", label: "Y" }, { id: "y2", label: "⏚" }] },
      ],
      wires: [
        ["g1", "a1"],
        ["a2", "p1"],
        ["p2", "g2"],
        ["c1", "y1"],
        ["c2", "y2"],
      ],
      hints: { g1: "primaryLoop", g2: "primaryLoop", p1: "primaryLoop", p2: "primaryLoop", a1: "ammeterSeries", a2: "ammeterSeries", c1: "coilToScope", c2: "coilToScope", y1: "coilToScope", y2: "coilToScope" },
    },
  },
  slinky: {
    items: items(["slinky", "dc-supply", "rheostat", "dc-ammeter", "hall-probe", "metre-rule"], ["voltmeter", "step-down-transformer", "compass"]),
    circuit: seriesLoop({ item: "slinky", a: "end A", b: "end B" }),
  },
  "current-balance": {
    items: items(
      ["top-pan-balance", "magnets-yoke", "copper-rod", "dc-supply", "rheostat", "dc-ammeter", "ruler"],
      ["voltmeter", "step-down-transformer", "slotted-masses"],
    ),
    circuit: seriesLoop({ item: "copper-rod", a: "end A", b: "end B" }),
  },
};
