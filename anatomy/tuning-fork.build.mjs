/**
 * Anatomy figure: a tuning fork standing on its resonance box.
 * Built with the anatomy skill's kit (bunx skills add wheresryan22/anatomy):
 *   node anatomy/tuning-fork.build.mjs [--light]
 * Writes public/anatomy/tuning-fork(-light).html and tuning-fork.svg.
 *
 * What it explains: the prongs swing in antiphase while the stem pumps up and down at the same
 * frequency — that stem motion is what drives the box (or a sonometer) when the stem is pressed
 * on it. A fork's frequency rises as its prongs get shorter: f ∝ 1/L² for a cantilever, so the
 * 512 Hz fork's prongs are 1/√2 the length of the 256 Hz fork's. Each strike decays away.
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
const HEIGHT = 380;

const FORKS = [256, 288, 320, 341.3, 384, 426.7, 480, 512];
const L0 = 92; // prong length of the 256 Hz fork
const prongLength = (f) => L0 * Math.sqrt(256 / f); // f ∝ 1/L²

const PLATE = { x: -140, y: -70, w: 280, d: 140, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const BOX = { x: -96, y: -34, w: 150, d: 68, r: 3 };
const BOX_H = 40;
const HOLE = [-40, 0];
const SOCKET = { x: 8, y: -9, w: 18, d: 18, r: 2 };
const SOCKET_H = 8;
const STEM = [17, 0];
const STEM_R = 2.6;
const STEM_TOP = BOX_H + SOCKET_H + 16;
const YOKE = { x: 3, y: -3, w: 28, d: 6, r: 2.5 };
const YOKE_H = 7;
const PRONG_Z = STEM_TOP + YOKE_H;
const PRONG = { w: 5, d: 6 };
const PRONG_X = [3, 26]; // left edges of the two prongs

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [STEM[0], 0, PRONG_Z + L0 + 4]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 40 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // Ruler strip along the front edge (the prong-length scale).
  const strip = { x: -120, y: PLATE.y + PLATE.d - 15, w: 240, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // The rubber striking pad on the plate.
  const pad = { x: 80, y: -50, w: 34, d: 26, r: 4 };
  out.push(S(k.slabOf(pad, 0, 5, P, 6, 0.8), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(pad, 3), 5, P), { tone: "faint" }));
  return out.join("");
}

function box() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BOX, 2), 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  // Base rail, body and a lid set in by a bevel: a hollow wooden sound box.
  out.push(S(k.slabOf(k.insetPlan(BOX, -2), 0, 3, P, 6, 0.6), { tone: "lo" }));
  out.push(S(k.slabOf(BOX, 3, BOX_H - 3, P, 6, 1.2), { tone: "mid" }));
  out.push(L(k.sideSeam(BOX, 3 + (BOX_H - 3) / 2, P), { tone: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(BOX, 4), BOX_H, P), { tone: "lo" }));
  // Sound hole: a dark disc with a turned rim.
  out.push(S(k.cylinder(HOLE[0], HOLE[1], 13, BOX_H - 0.6, 0.6, P, 40), { tone: "lo", flat: true }));
  out.push(L(k.ring(HOLE[0], HOLE[1], 15.5, BOX_H, P, 48), { tone: "mid" }));
  // Label plate with three rule lines, and corner screws.
  const label = { x: BOX.x + 12, y: BOX.y + BOX.d - 16, w: 30, d: 10, r: 1 };
  out.push(S(k.slabOf(label, BOX_H, 0.5, P, 3), { tone: "hi", crease: "none" }));
  for (const t of [0.3, 0.5, 0.7]) out.push(L(k.lineOnTop([label.x + 4, label.y + label.d * t], [label.x + label.w - 6, label.y + label.d * t], BOX_H + 0.5, P), { tone: "lo", free: "both" }));
  const screws = k.corners(BOX, 6);
  out.push(D(screws.map(([x, y]) => at([x, y, BOX_H])), { size: 0.45 }));
  // Socket block the stem stands in, with a clamp screw.
  out.push(S(k.slabOf(SOCKET, BOX_H, SOCKET_H, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.ring(STEM[0], STEM[1], STEM_R + 1.2, BOX_H + SOCKET_H, P, 20), { tone: "lo" }));
  out.push(D([at([SOCKET.x + 3, SOCKET.y + 3, BOX_H + SOCKET_H]), at([SOCKET.x + SOCKET.w - 3, SOCKET.y + 3, BOX_H + SOCKET_H])], { size: 0.4 }));
  return out.join("");
}

function stem() {
  const z0 = BOX_H + SOCKET_H - 4;
  return [
    S(k.cylinder(STEM[0], STEM[1], STEM_R, z0, STEM_TOP - z0, P, 24), { tone: "hi", crease: "none" }),
    L(k.sideArc(STEM[0], STEM[1], STEM_R, STEM_TOP - 6, P, 12), { tone: "faint" }),
    S(k.slabOf(YOKE, STEM_TOP, YOKE_H, P, 6, 1.2), { tone: "hi", crease: "lo" }),
    L(k.planOutline(k.insetPlan(YOKE, 1.5), STEM_TOP + YOKE_H, P, 4), { tone: "faint" }),
  ].join("");
}

/** One prong of length len at left edge x, drawn as a polished bar with an end chamfer. */
function prong(x, len) {
  const plan = { x, y: -PRONG.d / 2, w: PRONG.w, d: PRONG.d, r: 0.8 };
  return [
    S(k.slabOf(plan, PRONG_Z, len, P, 3, 0.5), { tone: "hi", crease: "lo", lit: true }),
    L(k.planOutline(k.insetPlan(plan, 1), PRONG_Z + len, P, 3), { tone: "faint" }),
  ].join("");
}

const f0 = FORKS[0];
const len0 = prongLength(f0);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A tuning fork standing in a socket on a hollow wooden resonance box with a sound hole, on a surface plate with a rubber striking pad. When struck, the two prongs swing towards and away from each other while the stem moves up and down, driving the box. Shorter prongs give a higher frequency.",
  body: [
    plate(),
    box(),
    `<g data-part="stem">${stem()}</g>`,
    `<g data-part="prong-a">${prong(PRONG_X[0], len0)}</g>`,
    `<g data-part="prong-b">${prong(PRONG_X[1], len0)}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const FORKS = ${JSON.stringify(FORKS)};
const L0 = ${L0}, PRONG_Z = ${PRONG_Z}, PRONG_X = ${JSON.stringify(PRONG_X)}, PW = ${PRONG.w}, PD = ${PRONG.d};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const prongs = [svg.querySelector('[data-part="prong-a"]'), svg.querySelector('[data-part="prong-b"]')];
const stemPart = svg.querySelector('[data-part="stem"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const prongLength = (f) => L0 * Math.sqrt(256 / f);
function prongSvg(x, len) {
  const plan = { x, y: -PD / 2, w: PW, d: PD, r: 0.8 };
  return solidSvg(slabOf(plan, PRONG_Z, len, P, 3, 0.5), { tone: "hi", crease: "lo", lit: true }) +
    lineSvg(planOutline(insetPlan(plan, 1), PRONG_Z + len, P, 3), { tone: "faint" });
}
let index = 0, struck = -10, clock = 0, last = 0, frame = 0, visible = false, touring = true, idle = 0;
const TAU = 2.4;
function setFork(i) {
  index = (i + FORKS.length) % FORKS.length;
  const len = prongLength(FORKS[index]);
  prongs[0].innerHTML = prongSvg(PRONG_X[0], len);
  prongs[1].innerHTML = prongSvg(PRONG_X[1], len);
}
function strike() { struck = clock; }
function draw() {
  const f = FORKS[index];
  const amp = clock - struck < 0 ? 0 : Math.exp(-(clock - struck) / TAU);
  // Slowed to be visible: the picture runs at f/256 × 3 Hz, the fork itself at f.
  const phase = Math.sin(2 * Math.PI * (f / 256) * 3 * clock);
  const swing = amp * 2.2 * phase;
  prongs[0].setAttribute("transform", translateAlong(P, [-swing, 0, 0]));
  prongs[1].setAttribute("transform", translateAlong(P, [swing, 0, 0]));
  stemPart.setAttribute("transform", translateAlong(P, [0, 0, -0.6 * swing]));
  const text = f + " Hz · prongs " + prongLength(f).toFixed(0) + " · " + Math.round(amp * 100) + "%";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(f));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring && clock - struck > 5.5) { setFork(index + 1); strike(); }
  draw();
  frame = visible && !still.matches ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible && !still.matches) { last = 0; frame = requestAnimationFrame(tick); } };
const pause = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = true; run(); }, 8000); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointerenter", () => { pause(); strike(); run(); });
stage.addEventListener("keydown", (event) => {
  let handled = true;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") setFork(index + 1);
  else if (event.key === "ArrowLeft" || event.key === "ArrowDown") setFork(index - 1);
  else if (event.key === "Enter" || event.key === " ") strike();
  else handled = false;
  if (!handled) return;
  event.preventDefault();
  pause();
  if (event.key.startsWith("Arrow")) strike();
  run();
  if (still.matches) draw();
});
strike();
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Tuning fork on its resonance box",
  hint: "Hover to strike · arrows: fork",
  readout: `${f0} Hz · prongs ${len0.toFixed(0)} · 100%`,
  keys: [
    { mark: "lit", label: "Prongs: swing in antiphase; shorter prongs, higher frequency (f ∝ 1/L²)" },
    { mark: "raised", label: "Stem: moves up and down at the same frequency and drives the box" },
  ],
  caption:
    "Strike the fork on the rubber pad and its prongs swing towards and away from each other. The stem moves up and down at the same frequency; pressed on a box or a sonometer, it drives that too. The 512 Hz fork's prongs are 1/√2 as long as the 256 Hz fork's, because a prong's frequency goes as 1/L². The sound dies away as the prongs lose energy.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Tuning fork: arrow keys choose a fork, Enter strikes it" aria-valuemin="256" aria-valuemax="512" aria-valuenow="256">${svg}</div>`,
});

mkdirSync(OUT, { recursive: true });
const name = theme === "light" ? "tuning-fork-light.html" : "tuning-fork.html";
writeFileSync(join(OUT, name), k.pageHtml({ title: "Tuning fork", theme, body, script: kitScript() + live }));
if (theme === "light") {
  writeFileSync(join(OUT, "tuning-fork.svg"), k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Tuning fork on its resonance box", body: [plate(), box(), stem(), prong(PRONG_X[0], len0), prong(PRONG_X[1], len0)], standalone: "light" }));
}
console.log("wrote", name);
