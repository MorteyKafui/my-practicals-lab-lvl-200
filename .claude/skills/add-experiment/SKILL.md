---
name: add-experiment
description: Add a new practical (experiment plugin) to Physics Bench — catalogue entry, physics model, definition with table/graph/results/feedback, golden tests, 3D bench, messages and report diagram. Use whenever someone asks to add, build or finish an experiment/practical in this app.
---

# Adding a practical to Physics Bench

Every practical is a plugin. The workspace (brief, bench, notebook, graph paper, calculations,
feedback, locked Compare, 15-section report) works from one `ExperimentDefinition`. Follow these
steps in order; `experiments/stretched-wire/` is the reference implementation for each one.

## 0. Method first

Use the standard university method for the practical (not one school's manual): what the student
sets, what they measure with which instrument, what they plot, what the slope/intercept give.
Write that down in one paragraph before any code. If the practical has common variants
(e.g. two resonance positions vs several forks), pick one as the default and note the others.

## 1. Catalogue entry — `experiments/catalogue.ts`

Already present for the original eight. Set `status: "ready"` only when steps 2–8 are done.

## 2. Physics model — `experiments/<id>/model.ts`

Pure TypeScript, no React. It holds the **hidden world**:

- `createWorld(seed, env)` builds apparatus values with real tolerances via `substream(seed, "<id>")`
  and `withTolerance` / `uniform` from `core/random.ts` (fork ±0.4 %, wire μ in a realistic range,
  coil turns, magnet strength…). Same seed → same world.
- Response functions the bench calls every frame (e.g. resonance excitation, induced emf,
  probe reading). **Resonance is a band, not a point** — use a damped driven response with Q.
- `idealReadings(world, …)` — what a careful student would record (feeds the Compare overlay).
- Room conditions come from `core/environment.ts` (`actualConditions`: temperature, g, mains Hz,
  Earth's field). Use `speedOfSound(θ)` and `MU_0` for accepted values.

## 3. Definition — `experiments/<id>/definition.ts`

Implement `ExperimentDefinition<World>` from `experiments/types.ts`:

- `constants` — values recorded once (load, temperature, current).
- `columns` — `measured` (with an `InstrumentSpec` from `core/instruments.ts` so precision is
  checked), `given` (fork frequency, mass setting), `derived` (with `derive(rowSI)`; the student
  computes these and the app checks their arithmetic).
- `graph` — x/y column ids, `throughOrigin`, slope and intercept symbols/units.
- `results` — `fromFit(studentSI, ctx)` from the student's OWN slope, `accepted(world, conditions)`
  (revealed only after feedback), `goodWithinPercent`.
- `rules` — experiment-specific `FeedbackRule`s (generic table/graph/calc/writing rules already
  run). Diagnose physics, not just arithmetic: wrong harmonic, unzeroed probe, end correction,
  frequency doubling. Use the action log (`ctx.actions`) for technique.
- `describeAction` (passive past tense, for the report Method), `logLine` (short, for the live log),
  `stepChecks` (tick instruction steps from the log), `reveal(world)` (hidden values for Compare).

Register it in `experiments/registry.ts`.

## 4. Messages — `messages/en.json`

Under `experiments.<id>`: `theory` (array; `$…$` / `$$…$$` LaTeX, read with `t.raw`),
`apparatus` ({id: "Name: description"}), `safety`, `steps`, `tips`.
Every feedback key a rule emits needs `feedback.<group>.<name>.{title,detail}` —
`core/messages.test.ts` fails otherwise. Feedback tells the student what to check and why;
it never gives the accepted answer before Compare.

## 5. Golden tests — `experiments/<id>/<id>.test.ts`

Build sessions from `idealReadings` quantised to the instrument resolution and assert:
the model matches the analytic formula; a careful run has **no errors** and recovers the hidden
value within a few %; each deliberately faulty dataset (unit slip, wrong harmonic, false precision,
too few rows, steep line, inverted slope, technique slips from the log) raises its specific key.
Run `bun run test`.

## 6. 3D bench — `experiments/<id>/bench.tsx` + `bench-ui.tsx`

- R3F scene: orthographic isometric camera, flat/toon-ish standard materials, `ContactShadows`
  (skip on low quality), callout labels via drei `Html`. Build apparatus procedurally (no
  downloaded models, no drei `Text` — it fetches fonts and breaks offline); draw scales on a
  `CanvasTexture`.
- **Never show the measured value as a number.** The student reads the instrument: provide an
  eye-level/close-up view for scales, a graticule for oscilloscopes, a needle for meters.
- Instrument cards (HTML over the canvas from md up, below it on phones) for the controls;
  every action calls `act({ kind, detail })`.
- Readings typed in perform mode are logged with the bench state (`components/workspace/bench-store.ts`)
  so rules can compare typed vs shown.
- Sound through `core/audio.ts` where the practical has it.
- No `performance.now()`/`Date.now()` during render and no ref writes during render
  (React Compiler lint) — keep timers in event handlers, animate in `useFrame`.

Register the bench in `components/workspace/stages/measure.tsx` (`BENCHES`).

## 7. Report diagram — `components/diagrams/`

A labelled schematic SVG (forwardRef to the `<svg>`) added to `DIAGRAMS`; it is embedded in the
printed report and the Word export. For a detailed apparatus view, use the `anatomy` skill.

## 8. Verify

`bunx tsc --noEmit`, `bun run lint`, `bun run test`, `bun run build`, then `bunx playwright test`
(extend `e2e/` with the new practical's bring-your-data flow), and look at the bench with
`bun scripts/screenshots.ts` at desktop and phone widths.
