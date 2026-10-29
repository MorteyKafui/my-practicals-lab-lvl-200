import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

import { texToText, type ReportModel } from "@/core/report";

const SECTIONS = [
  "Date",
  "Title",
  "Aim",
  "Apparatus",
  "Diagram",
  "Theory",
  "Method",
  "Observations",
  "Graph",
  "Calculation",
  "Discussion",
  "Precautions",
  "Sources of error",
  "Conclusion",
  "References",
] as const;

/** Render an on-screen SVG (graph, diagram) to PNG bytes for embedding in Word. */
export async function svgToPng(svg: SVGSVGElement, width = 1200): Promise<{ data: Uint8Array; width: number; height: number }> {
  const box = svg.viewBox.baseVal;
  const height = Math.round((width * box.height) / box.width);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  // Inline the CSS variables the drawing uses so it renders the same outside the page.
  const styles = getComputedStyle(document.documentElement);
  const css = ["--data", "--reference", "--negative", "--select", "--text-primary", "--text-muted", "--text-secondary"]
    .map((v) => `${v}:${styles.getPropertyValue(v)}`)
    .join(";");
  clone.setAttribute("style", `${css};font-family:Inter,Arial,sans-serif;background:#fff`);
  clone.querySelectorAll("[class]").forEach((el) => {
    const cls = el.getAttribute("class") ?? "";
    if (cls.includes("fill-text-primary")) el.setAttribute("fill", styles.getPropertyValue("--text-primary"));
    if (cls.includes("fill-text-muted")) el.setAttribute("fill", styles.getPropertyValue("--text-muted"));
    if (cls.includes("fill-text-secondary")) el.setAttribute("fill", styles.getPropertyValue("--text-secondary"));
  });
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render the drawing"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, width, height);
    g.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function heading(n: number) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 }, children: [new TextRun(`${n}. ${SECTIONS[n - 1]}`)] });
}

const para = (text: string) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun(text || "—")] });
const bullets = (items: string[]) => (items.length ? items.map((t) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(t)] })) : [para("—")]);

export async function buildReportDocx(model: ReportModel, images: { diagram?: SVGSVGElement | null; graph?: SVGSVGElement | null }): Promise<Blob> {
  const picture = async (svg: SVGSVGElement | null | undefined) => {
    if (!svg) return [para("—")];
    const png = await svgToPng(svg);
    const w = 600;
    return [new Paragraph({ children: [new ImageRun({ type: "png", data: png.data, transformation: { width: w, height: Math.round((w * png.height) / png.width) } })] })];
  };

  const border = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [model.table.headers, ...model.table.rows].map(
      (cells, r) =>
        new TableRow({
          children: cells.map(
            (c) =>
              new TableCell({
                borders: { top: border, bottom: border, left: border, right: border },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: c || "", bold: r === 0 })] })],
              }),
          ),
        }),
    ),
  });

  const doc = new Document({
    creator: model.student || "Physics Bench",
    title: model.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(model.title)] }),
          ...(model.student ? [para(model.student)] : []),
          heading(1),
          para(model.date),
          heading(2),
          para(model.title),
          heading(3),
          para(model.aim),
          heading(4),
          ...bullets(model.apparatus),
          heading(5),
          ...(await picture(images.diagram)),
          heading(6),
          ...model.theory.map((p) => para(texToText(p))),
          heading(7),
          ...model.method.map((s, i) => para(`${i + 1}. ${s}`)),
          heading(8),
          ...model.constants.map(para),
          table,
          heading(9),
          para(model.graphTitle),
          ...(await picture(images.graph)),
          heading(10),
          ...model.calculation.map(para),
          heading(11),
          ...model.discussion.split(/\n+/).map(para),
          heading(12),
          ...bullets(model.precautions),
          heading(13),
          ...bullets(model.sourcesOfError),
          heading(14),
          para(model.conclusion),
          heading(15),
          ...bullets(model.references),
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: model.footer, size: 16, color: "777777" })] }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
