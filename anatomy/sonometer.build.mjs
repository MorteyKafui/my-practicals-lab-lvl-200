/**
 * Anatomy figure: the sonometer.
 *   node anatomy/sonometer.build.mjs [--light]
 * Writes public/anatomy/sonometer(-light).html and sonometer.svg.
 *
 * What it explains: the wire between the bridges has a fundamental f₁ = (1/2l)√(T/μ). A 256 Hz fork
 * on the box drives it; only when the movable bridge sets l so that f₁ ≈ 256 Hz does the loop grow
 * large (resonance). Slide the bridge and watch the loop swell and die — resonance is a band.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as k from "../.claude/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "../.claude/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "public", "anatomy");
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 600;
const HEIGHT = 360;

// World units: 1 unit = 0.5 cm, so the 100 cm scale is 200 units long.
const CM = 2;
const X0 = -110; // 0 cm mark
const PLATE = { x: -140, y: -48, w: 290, d: 96, r: 8 };
const PLATE_H = 10;
const FOOT_H = 4;
const BOX = { x: -124, y: -20, w: 236, d: 40, r: 3 };
const BOX_H = 26;
const RULE = { x: X0, y: 8, w: 100 * CM, d: 8, r: 0.8 };
const WIRE_Y = -6;
const WIRE_Z = BOX_H + 9;
const FIXED_CM = 10;
const PEG_X = BOX.x + 8;
const PULLEY_X = BOX.x + BOX.w - 6;

// Physics: T = 39.2 N (4.0 kg), μ = 6.0 × 10⁻⁴ kg/m → c = 255.6 m/s; resonance with 256 Hz at l ≈ 49.9 cm.
const T = 39.2;
const MU = 6.0e-4;
const F = 256;
const Q = 60;
const C = Math.sqrt(T / MU);

const xOf = (cm) => X0 + cm * CM;

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [PULLEY_X + 10, 0, WIRE_Z + 10], [PULLEY_X + 10, 0, -60]], WIDTH, HEIGHT, {
  pad: 28,
  azimuth: 30,
  elevation: 32,
});

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of k.corners(PLATE, 16).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P))) {
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H, FOOT_H, P, 24), { tone: "lo" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 4), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 8);
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function box() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(BOX, -2), 0, 2.5, P, 6, 0.5), { tone: "lo" }));
  out.push(S(k.slabOf(BOX, 2.5, BOX_H - 2.5, P, 6, 1), { tone: "mid" }));
  out.push(L(k.sideSeam(BOX, BOX_H / 2, P), { tone: "faint" }));
  // Sound holes on the top.
  for (const x of [-60, 40]) {
    out.push(S(k.cylinder(x, -8, 5, BOX_H - 0.5, 0.5, P, 32), { tone: "lo", flat: true }));
    out.push(L(k.ring(x, -8, 6.5, BOX_H, P, 32), { tone: "mid" }));
  }
  // Metre rule strip with mm-style ticks every cm, majors every 10 cm.
  out.push(S(k.slabOf(RULE, BOX_H, 0.6, P, 3), { tone: "hi", crease: "none" }));
  const ticks = k.topTicks(RULE.x + 1, RULE.x + RULE.w - 1, CM, 10, RULE.y, BOX_H + 0.6, [2.2, 4.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // The graduation line the long ticks reach, edge to edge as on a real rule.
  out.push(L(k.lineOnTop([RULE.x, RULE.y + 4.6], [RULE.x + RULE.w, RULE.y + 4.6], BOX_H + 0.6, P), { tone: "lo" }));
  // Wire anchor peg and the pulley bracket.
  out.push(S(k.cylinder(PEG_X, WIRE_Y, 2.4, BOX_H, 11, P, 20), { tone: "mid" }));
  out.push(L(k.ring(PEG_X, WIRE_Y, 3.6, BOX_H, P, 20), { tone: "lo" }));
  out.push(S(k.slabOf({ x: PULLEY_X - 3, y: WIRE_Y - 6, w: 6, d: 12, r: 1 }, BOX_H, WIRE_Z - BOX_H - 3, P, 3, 0.4), { tone: "mid" }));
  out.push(L(k.sideRing([PULLEY_X + 2, WIRE_Y, WIRE_Z - 4], 5, "y", P, 24), { tone: "mid" }));
  return out.join("");
}

/** A hardwood bridge (a wedge across the box) with its edge where the wire rests. */
function bridge(xc, tone) {
  const plan = { x: xc - 3, y: WIRE_Y - 9, w: 6, d: 18, r: 1 };
  return S(k.slabOf(plan, BOX_H, WIRE_Z - BOX_H - 1.5, P, 3, 0.5), { tone, crease: "lo" });
}

/** The hanging load: hanger and slotted masses below the pulley. */
function load() {
  const x = PULLEY_X + 7;
  const out = [];
  for (let i = 0; i < 4; i++) out.push(S(k.cylinder(x, WIRE_Y, 7, -58 + i * 4.4, 4, P, 32, 0.4), { tone: i % 2 ? "mid" : "hi" }));
  out.push(S(k.cylinder(x, WIRE_Y, 1, -40.4, 8, P, 12), { tone: "mid" }));
  return out.join("");
}

const wirePath = (lCm, amp, phase) => {
  const x1 = xOf(FIXED_CM);
  const x2 = xOf(FIXED_CM + lCm);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    pts.push(at([x1 + (x2 - x1) * u, WIRE_Y, WIRE_Z + amp * Math.sin(Math.PI * u) * phase]));
  }
  return k.pathOf(pts);
};

const L_START = 30;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A sonometer: a hollow wooden box with a metre rule along its top, a wire fixed to a peg at one end, passing over a fixed bridge and a movable bridge, then over a pulley to a hanging load. Between the bridges the wire vibrates in one loop, which grows large only when its natural frequency matches the 256 Hz fork driving it.",
  body: [
    plate(),
    box(),
    bridge(xOf(FIXED_CM), "mid"),
    `<g data-part="bridge" transform="${k.translateAlong(P, [L_START * CM, 0, 0])}">${bridge(xOf(FIXED_CM), "hi")}</g>`,
    L(k.segment([PEG_X, WIRE_Y, BOX_H + 11], [xOf(FIXED_CM), WIRE_Y, WIRE_Z], P), { tone: "mid" }),
    D([at([PEG_X, WIRE_Y, BOX_H + 11])], { size: 0.7, tone: "hi" }),
    `<path data-part="loop" class="iso-line" data-tone="lit" d="${wirePath(L_START, 0, 0)}" style="stroke-width:1.2"/>`,
    `<path data-part="tail" class="iso-line" data-tone="mid" d="${k.segment([xOf(FIXED_CM + L_START), WIRE_Y, WIRE_Z], [PULLEY_X + 2, WIRE_Y, WIRE_Z + 1], P)}"/>`,
    L(k.segment([PULLEY_X + 7, WIRE_Y, WIRE_Z - 4], [PULLEY_X + 7, WIRE_Y, -32.4], P), { tone: "mid" }),
    load(),
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const CM = ${CM}, X0 = ${X0}, FIXED_CM = ${FIXED_CM}, WIRE_Y = ${WIRE_Y}, WIRE_Z = ${WIRE_Z}, PULLEY_X = ${PULLEY_X};
const C = ${C}, F = ${F}, Q = ${Q};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const bridgePart = svg.querySelector('[data-part="bridge"]');
const loop = svg.querySelector('[data-part="loop"]');
const tail = svg.querySelector('[data-part="tail"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const xOf = (cm) => X0 + cm * CM;
function wire(lCm, amp, phase) {
  const x1 = xOf(FIXED_CM), x2 = xOf(FIXED_CM + lCm), pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(iso([x1 + (x2 - x1) * u, WIRE_Y, WIRE_Z + amp * Math.sin(Math.PI * u) * phase], P)); }
  return pathOf(pts);
}
const f1 = (lCm) => C / (2 * lCm / 100);
const response = (lCm) => { const r = f1(lCm) / F; return 1 / Math.sqrt((1 - r * r) ** 2 + (r / Q) ** 2) / Q; };
let l = 30, target = 30, clock = 0, last = 0, frame = 0, visible = false, touring = true, idle = 0;
const tourAt = (t) => 50 + 22 * Math.sin(t / 3.2);
function draw() {
  const amp = Math.min(1, response(l)) * 7;
  loop.setAttribute("d", wire(l, amp, Math.sin(clock * 18)));
  bridgePart.setAttribute("transform", translateAlong(P, [l * CM, 0, 0]));
  tail.setAttribute("d", pathOf([iso([xOf(FIXED_CM + l), WIRE_Y, WIRE_Z], P), iso([PULLEY_X + 2, WIRE_Y, WIRE_Z + 1], P)]));
  const text = "l " + l.toFixed(1) + " cm · f₁ " + f1(l).toFixed(0) + " Hz" + (response(l) > 0.5 ? " · resonance" : "");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", l.toFixed(1));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring) target = tourAt(clock);
  l += (target - l) * (1 - Math.exp(-dt / 0.35));
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = Math.min(85, Math.max(20, next)); clearTimeout(idle); idle = setTimeout(() => { touring = true; run(); }, 6000); run(); if (still.matches) { l = target; draw(); } };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => { const box = svg.getBoundingClientRect(); steer(20 + ((event.clientX - box.left) / box.width) * 65); });
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 5 : 0.5;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") steer(target + step);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") steer(target - step);
  else return;
  event.preventDefault();
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 2",
  title: "Sonometer",
  hint: "Slide the bridge",
  readout: `l ${L_START.toFixed(1)} cm · f₁ ${(C / (2 * L_START / 100)).toFixed(0)} Hz`,
  keys: [
    { mark: "lit", label: "Vibrating length: one loop between the bridges, f₁ = (1/2l)√(T/μ)" },
    { mark: "raised", label: "Movable bridge: sets l, read on the metre rule" },
  ],
  caption:
    "The load hanging over the pulley sets the tension T. Between the bridges the wire's fundamental is f₁ = (1/2l)√(T/μ). A 256 Hz fork on the box drives the wire; the loop only grows large when the bridge sets l so that f₁ is close to 256 Hz (about 50 cm here), and it is large over a narrow band of lengths, not at a single point.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Sonometer: arrow keys slide the movable bridge" aria-valuemin="20" aria-valuemax="85" aria-valuenow="${L_START}">${svg}</div>`,
});

mkdirSync(OUT, { recursive: true });
const name = theme === "light" ? "sonometer-light.html" : "sonometer.html";
writeFileSync(join(OUT, name), k.pageHtml({ title: "Sonometer", theme, body, script: kitScript() + live }));
if (theme === "light") writeFileSync(join(OUT, "sonometer.svg"), k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Sonometer", body: [plate(), box(), bridge(xOf(FIXED_CM), "mid"), bridge(xOf(FIXED_CM + L_START), "hi"), load()], standalone: "light" }));
console.log("wrote", name);
