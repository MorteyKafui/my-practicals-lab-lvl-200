/**
 * Per-frame values shared between a bench's driver and its 3D parts (one bench is on screen at
 * a time). Written in useFrame, read in useFrame — never rendered from, so it is not React state.
 */
export const benchSignal = {
  /** Excitation of the vibrating wire (≥ 1 throws the rider). */
  excitation: 0,
};
