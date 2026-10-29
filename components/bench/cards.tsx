"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

import { InstrumentCard, Nudge, Readout } from "./kit";

/** A DC supply with a rheostat knob and the ammeter in series (the student reads the ammeter). */
export function SupplyCard({
  on,
  knob,
  max,
  ammeter,
  onToggle,
  onKnob,
  children,
}: {
  on: boolean;
  /** Current the rheostat is set for, A. */
  knob: number;
  max: number;
  /** What the ammeter shows, A. */
  ammeter: number;
  onToggle: () => void;
  onKnob: (a: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <InstrumentCard title="Supply · ammeter">
      <Readout value={on ? ammeter.toFixed(2) : "0.00"} unit="A" label="Ammeter" />
      <input type="range" min={0} max={max} step={0.005} value={knob} onChange={(e) => onKnob(Number(e.target.value))} aria-label="Rheostat (current)" className="w-full accent-[var(--select)]" />
      <div className="flex gap-1">
        <Nudge label="Less current" onClick={() => onKnob(knob - 0.01)}>
          <MinusIcon />
        </Nudge>
        <Button size="sm" className="flex-1" variant={on ? "default" : "outline"} aria-pressed={on} onClick={onToggle}>
          {on ? "Supply on" : "Supply off"}
        </Button>
        <Nudge label="More current" onClick={() => onKnob(knob + 0.01)}>
          <PlusIcon />
        </Nudge>
      </div>
      {children}
    </InstrumentCard>
  );
}
