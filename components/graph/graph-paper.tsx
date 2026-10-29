"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type { Point } from "@/core/analysis/regression";
import type { GraphState } from "@/core/session";
import { formatSigFigs } from "@/core/sigfigs";

/**
 * Virtual graph paper: 2 cm large squares with 2 mm small squares, like the paper students use.
 * The student owns every decision on it — scale, line, triangle. Handles move with pointer or
 * keyboard (arrow keys; Shift for bigger steps).
 */

const SQ = 48; // px per large square
const M = { left: 64, right: 20, top: 40, bottom: 48 };

type Line = NonNullable<GraphState["line"]>;
type Handle = "l1" | "l2" | "t1" | "t2";

export interface GraphPaperProps {
  graph: GraphState;
  squaresX: number;
  squaresY: number;
  points: Point[];
  /** Points to mark (outliers). */
  flagged?: Set<number>;
  /** Compare: a careful run, drawn dashed. */
  overlay?: { points: Point[]; line?: { slope: number; intercept: number } };
  interactive?: boolean;
  onLine?: (line: Line) => void;
  onTriangle?: (tri: Line) => void;
  ariaLabel: string;
}

export function GraphPaper({ graph, squaresX, squaresY, points, flagged, overlay, interactive, onLine, onTriangle, ariaLabel }: GraphPaperProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Handle | null>(null);
  const W = squaresX * SQ;
  const H = squaresY * SQ;
  const ready = graph.x.perSquare > 0 && graph.y.perSquare > 0;

  const px = (x: number) => M.left + ((x - graph.x.start) / graph.x.perSquare) * SQ;
  const py = (y: number) => M.top + H - ((y - graph.y.start) / graph.y.perSquare) * SQ;
  const dataAt = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current!;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      const sx = Math.min(Math.max(p.x, M.left), M.left + W);
      const sy = Math.min(Math.max(p.y, M.top), M.top + H);
      return {
        x: graph.x.start + ((sx - M.left) / SQ) * graph.x.perSquare,
        y: graph.y.start + ((M.top + H - sy) / SQ) * graph.y.perSquare,
      };
    },
    [graph.x.start, graph.x.perSquare, graph.y.start, graph.y.perSquare, W, H],
  );

  const line = graph.line;
  const tri = graph.triangle;
  const slope = line && line.x2 !== line.x1 ? (line.y2 - line.y1) / (line.x2 - line.x1) : undefined;
  const onLineY = (x: number) => (line && slope !== undefined ? line.y1 + slope * (x - line.x1) : 0);

  const move = (handle: Handle, p: { x: number; y: number }) => {
    if (!line) return;
    if (handle === "l1") onLine?.({ ...line, x1: p.x, y1: p.y });
    if (handle === "l2") onLine?.({ ...line, x2: p.x, y2: p.y });
    // Triangle corners slide along the student's own line.
    if (tri && handle === "t1") onTriangle?.({ ...tri, x1: p.x, y1: onLineY(p.x) });
    if (tri && handle === "t2") onTriangle?.({ ...tri, x2: p.x, y2: onLineY(p.x) });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (drag) move(drag, dataAt(e.clientX, e.clientY));
  };

  const keyMove = (handle: Handle, e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.5 : 0.05; // in large squares
    const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
    const dy = e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    const current =
      handle === "l1" ? { x: line!.x1, y: line!.y1 } : handle === "l2" ? { x: line!.x2, y: line!.y2 } : handle === "t1" ? { x: tri!.x1, y: tri!.y1 } : { x: tri!.x2, y: tri!.y2 };
    move(handle, { x: current.x + dx * graph.x.perSquare, y: current.y + dy * graph.y.perSquare });
  };

  const clipId = "paper-clip";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W + M.left + M.right} ${H + M.top + M.bottom}`}
      className="h-auto w-full touch-none select-none"
      role="img"
      aria-label={ariaLabel}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={M.left} y={M.top} width={W} height={H} />
        </clipPath>
      </defs>

      {/* Paper */}
      <rect x={M.left} y={M.top} width={W} height={H} fill="#fbfdf8" />
      {Array.from({ length: squaresX * 10 + 1 }, (_, i) => (
        <line key={`vx${i}`} x1={M.left + (i * SQ) / 10} x2={M.left + (i * SQ) / 10} y1={M.top} y2={M.top + H} stroke={i % 10 === 0 ? "#9cc8a3" : i % 5 === 0 ? "#c7e2cb" : "#e3f0e4"} strokeWidth={i % 10 === 0 ? 1 : 0.6} />
      ))}
      {Array.from({ length: squaresY * 10 + 1 }, (_, i) => (
        <line key={`hy${i}`} y1={M.top + (i * SQ) / 10} y2={M.top + (i * SQ) / 10} x1={M.left} x2={M.left + W} stroke={i % 10 === 0 ? "#9cc8a3" : i % 5 === 0 ? "#c7e2cb" : "#e3f0e4"} strokeWidth={i % 10 === 0 ? 1 : 0.6} />
      ))}

      {/* Title */}
      <text x={M.left} y={22} className="fill-text-primary" fontSize={15} fontWeight={600}>
        {graph.title || "—"}
      </text>

      {ready && (
        <>
          {/* Axes and tick labels at every 2nd large square */}
          <line x1={M.left} x2={M.left + W} y1={M.top + H} y2={M.top + H} stroke="#111" strokeWidth={1.5} />
          <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + H} stroke="#111" strokeWidth={1.5} />
          {Array.from({ length: Math.floor(squaresX / 2) + 1 }, (_, i) => (
            <text key={`tx${i}`} x={M.left + i * 2 * SQ} y={M.top + H + 18} textAnchor="middle" fontSize={11} className="figure fill-text-muted">
              {trim(graph.x.start + i * 2 * graph.x.perSquare)}
            </text>
          ))}
          {Array.from({ length: Math.floor(squaresY / 2) + 1 }, (_, i) => (
            <text key={`ty${i}`} x={M.left - 8} y={M.top + H - i * 2 * SQ + 4} textAnchor="end" fontSize={11} className="figure fill-text-muted">
              {trim(graph.y.start + i * 2 * graph.y.perSquare)}
            </text>
          ))}
          <text x={M.left + W} y={M.top + H + 38} textAnchor="end" fontSize={12} className="fill-text-secondary">
            {graph.x.label}
          </text>
          <text x={M.left - 48} y={M.top - 10} fontSize={12} className="fill-text-secondary">
            {graph.y.label}
          </text>

          <g clipPath={`url(#${clipId})`}>
            {/* Compare overlay: a careful run, dashed in the reference colour */}
            {overlay?.line && (
              <line
                x1={M.left}
                y1={py(overlay.line.slope * graph.x.start + overlay.line.intercept)}
                x2={M.left + W}
                y2={py(overlay.line.slope * (graph.x.start + squaresX * graph.x.perSquare) + overlay.line.intercept)}
                stroke="var(--reference)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            )}
            {overlay?.points.map((p, i) => (
              <circle key={`o${i}`} cx={px(p.x)} cy={py(p.y)} r={3.5} fill="none" stroke="var(--reference)" strokeWidth={1.2} />
            ))}

            {/* The student's points as crosses */}
            {points.map((p, i) => (
              <g key={`p${i}`} stroke={flagged?.has(i) ? "var(--negative)" : "var(--data)"} strokeWidth={1.8}>
                <line x1={px(p.x) - 5} y1={py(p.y) - 5} x2={px(p.x) + 5} y2={py(p.y) + 5} />
                <line x1={px(p.x) - 5} y1={py(p.y) + 5} x2={px(p.x) + 5} y2={py(p.y) - 5} />
              </g>
            ))}

            {/* The student's line, extended across the paper */}
            {line && slope !== undefined && (
              <line
                x1={M.left}
                y1={py(onLineY(graph.x.start))}
                x2={M.left + W}
                y2={py(onLineY(graph.x.start + squaresX * graph.x.perSquare))}
                stroke="#111"
                strokeWidth={1.6}
              />
            )}

            {/* Slope triangle */}
            {tri && (
              <g stroke="#111" strokeWidth={1} fill="none">
                <polyline points={`${px(tri.x1)},${py(tri.y1)} ${px(tri.x2)},${py(tri.y1)} ${px(tri.x2)},${py(tri.y2)}`} strokeDasharray="4 3" />
                <text x={(px(tri.x1) + px(tri.x2)) / 2} y={py(tri.y1) + 16} textAnchor="middle" fontSize={11} stroke="none" className="figure fill-text-primary">
                  Δx = {formatSigFigs(tri.x2 - tri.x1, 3)}
                </text>
                <text x={px(tri.x2) + 6} y={(py(tri.y1) + py(tri.y2)) / 2} fontSize={11} stroke="none" className="figure fill-text-primary">
                  Δy = {formatSigFigs(tri.y2 - tri.y1, 3)}
                </text>
              </g>
            )}
          </g>

          {interactive && line && (
            <>
              <DragHandle cx={px(line.x1)} cy={py(line.y1)} label="Line start" onDown={() => setDrag("l1")} onKey={(e) => keyMove("l1", e)} />
              <DragHandle cx={px(line.x2)} cy={py(line.y2)} label="Line end" onDown={() => setDrag("l2")} onKey={(e) => keyMove("l2", e)} />
            </>
          )}
          {interactive && tri && (
            <>
              <DragHandle cx={px(tri.x1)} cy={py(tri.y1)} label="Triangle corner 1" small onDown={() => setDrag("t1")} onKey={(e) => keyMove("t1", e)} />
              <DragHandle cx={px(tri.x2)} cy={py(tri.y2)} label="Triangle corner 2" small onDown={() => setDrag("t2")} onKey={(e) => keyMove("t2", e)} />
            </>
          )}
        </>
      )}
    </svg>
  );
}

function DragHandle({ cx, cy, label, small, onDown, onKey }: { cx: number; cy: number; label: string; small?: boolean; onDown: () => void; onKey: (e: React.KeyboardEvent) => void }) {
  return (
    <g
      role="slider"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        onDown();
      }}
      onKeyDown={onKey}
      className="cursor-grab outline-none focus-visible:[&>circle:last-child]:stroke-[var(--ring)]"
    >
      <circle cx={cx} cy={cy} r={18} fill="transparent" />
      <circle cx={cx} cy={cy} r={small ? 5 : 7} fill="#fff" stroke="var(--select)" strokeWidth={2.5} />
    </g>
  );
}

function trim(v: number) {
  return Number(v.toPrecision(6)).toString();
}
