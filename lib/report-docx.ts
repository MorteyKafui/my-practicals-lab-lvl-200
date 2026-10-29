import { AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

import { texToText, type ReportModel, type SectionId, type TemplateSection } from "@/core/report";

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

function heading(n: number, title: string) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 80 }, children: [new TextRun(`${n}. ${title}`)] });
}

const para = (text: string) => new Paragraph({ spacing: { after: 80 }, children: [new TextRun(text || "—")] });
const bullets = (items: string[]) => (items.length ? items.map((t) => new Paragraph({ bullet: { level: 0 }, children: [new TextRun(t)] })) : [para("—")]);

export async function buildReportDocx(
  model: ReportModel,
  images: { diagram?: SVGSVGElement | null; graph?: SVGSVGElement | null },
  template: readonly TemplateSection[],
): Promise<Blob> {
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

  const body: Record<SectionId, () => Promise<(Paragraph | Table)[]>> = {
    date: async () => [para(model.date)],
    title: async () => [para(model.title)],
    aim: async () => [para(model.aim)],
    apparatus: async () => bullets(model.apparatus),
    diagram: () => picture(images.diagram),
    theory: async () => model.theory.map((p) => para(texToText(p))),
    method: async () => model.method.map((step, i) => para(`${i + 1}. ${step}`)),
    observations: async () => [...model.constants.map(para), table],
    graph: async () => [para(model.graphTitle), ...(await picture(images.graph))],
    calculation: async () => model.calculation.map(para),
    discussion: async () => model.discussion.split(/\n+/).map(para),
    precautions: async () => bullets(model.precautions),
    sources: async () => bullets(model.sourcesOfError),
    conclusion: async () => [para(model.conclusion)],
    references: async () => bullets(model.references),
  };
  const children: (Paragraph | Table)[] = [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(model.title)] }), ...(model.student ? [para(model.student)] : [])];
  let n = 0;
  for (const section of template.filter((t) => t.include)) {
    children.push(heading(++n, section.title), ...(await body[section.id]()));
  }
  children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: model.footer, size: 16, color: "777777" })] }));

  const doc = new Document({
    creator: model.student || "Physics Bench",
    title: model.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
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
