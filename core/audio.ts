/**
 * Lab sounds, synthesised with the Web Audio API (no audio files, works offline).
 * A struck tuning fork is a pure tone decaying exponentially; struck on a hard bench it also
 * rings a short metallic overtone (~6.27 f, the fork's first clang mode). A resonating wire
 * adds a swelling tone at the drive frequency, so students can hear resonance as well as see it.
 */

let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

export interface StruckFork {
  /** 0–1: how strongly the wire is resonating right now (drives its loudness). */
  setResonance: (level: number) => void;
  stop: () => void;
}

export function strikeFork(frequency: number, opts: { onPad: boolean; tau: number; volume?: number }): StruckFork | undefined {
  const ac = audio();
  if (!ac) return undefined;
  const now = ac.currentTime;
  const volume = opts.volume ?? 0.18;
  const master = ac.createGain();
  master.gain.value = 1;
  master.connect(ac.destination);

  const tone = ac.createOscillator();
  tone.frequency.value = frequency;
  const toneGain = ac.createGain();
  toneGain.gain.setValueAtTime(0, now);
  toneGain.gain.linearRampToValueAtTime(volume, now + 0.008);
  toneGain.gain.setTargetAtTime(0, now + 0.008, opts.onPad ? opts.tau : opts.tau * 0.6);
  tone.connect(toneGain).connect(master);
  tone.start(now);
  tone.stop(now + opts.tau * 6);

  if (!opts.onPad) {
    const clang = ac.createOscillator();
    clang.frequency.value = frequency * 6.27;
    const clangGain = ac.createGain();
    clangGain.gain.setValueAtTime(volume * 0.7, now);
    clangGain.gain.setTargetAtTime(0, now, 0.12);
    clang.connect(clangGain).connect(master);
    clang.start(now);
    clang.stop(now + 1.5);
  }

  // The sonometer box and wire: same frequency, louder and a little warmer when resonating.
  const wire = ac.createOscillator();
  wire.type = "triangle";
  wire.frequency.value = frequency;
  const wireGain = ac.createGain();
  wireGain.gain.value = 0;
  wire.connect(wireGain).connect(master);
  wire.start(now);
  wire.stop(now + opts.tau * 6);

  return {
    setResonance: (level) => wireGain.gain.setTargetAtTime(Math.min(1, Math.max(0, level)) * volume * 0.9, ac.currentTime, 0.05),
    stop: () => {
      master.gain.setTargetAtTime(0, ac.currentTime, 0.03);
      setTimeout(() => master.disconnect(), 300);
    },
  };
}

/** Mains hum from an AC-driven wire: f and its second harmonic, louder as the wire resonates. */
export function startHum(frequency: number): StruckFork | undefined {
  const ac = audio();
  if (!ac) return undefined;
  const master = ac.createGain();
  master.gain.value = 0;
  master.gain.setTargetAtTime(1, ac.currentTime, 0.05);
  master.connect(ac.destination);
  const base = ac.createOscillator();
  base.frequency.value = frequency;
  const baseGain = ac.createGain();
  baseGain.gain.value = 0.03;
  const second = ac.createOscillator();
  second.frequency.value = frequency * 2;
  const secondGain = ac.createGain();
  secondGain.gain.value = 0.015;
  const wire = ac.createOscillator();
  wire.type = "triangle";
  wire.frequency.value = frequency;
  const wireGain = ac.createGain();
  wireGain.gain.value = 0;
  base.connect(baseGain).connect(master);
  second.connect(secondGain).connect(master);
  wire.connect(wireGain).connect(master);
  [base, second, wire].forEach((o) => o.start());
  return {
    setResonance: (level) => wireGain.gain.setTargetAtTime(Math.min(1, Math.max(0, level)) * 0.16, ac.currentTime, 0.05),
    stop: () => {
      master.gain.setTargetAtTime(0, ac.currentTime, 0.03);
      setTimeout(() => {
        [base, second, wire].forEach((o) => o.stop());
        master.disconnect();
      }, 300);
    },
  };
}
