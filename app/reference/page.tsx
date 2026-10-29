import { SigFigTrainer } from "@/components/lab/sigfig-trainer";

export const metadata = { title: "Reference" };

const REPORT: [string, string][] = [
  ["Date", "The day the practical was performed."],
  ["Title", "What was investigated, in a few words."],
  ["Aim / purpose", "What the practical sets out to find or show."],
  ["Apparatus", "Every instrument and item used."],
  ["Diagram", "A labelled drawing of the set-up, drawn with a ruler."],
  ["Theory", "The physics and equations the method rests on."],
  ["Method", "What was done, in the passive past tense: “the rider was placed…”."],
  ["Observations", "The readings in a table: quantity and unit in each column header."],
  ["Graph", "Title, axes labelled with units, a reasonable scale, the best straight line, the intercept."],
  ["Calculation", "Slope from a large triangle, then the result with its unit."],
  ["Discussion", "Analysis, interpretation, expected vs obtained, experimental error, theory, similar investigations."],
  ["Precautions", "What was done to make the readings reliable."],
  ["Sources of error", "Effects that could make the result differ from the true value."],
  ["Conclusion", "The aim answered, with the result and its unit."],
  ["References", "Books, manuals and sources used."],
];

const SIG_FIGS: [string, string, string][] = [
  ["Non-zero digits are always significant.", "45.3", "3 s.f."],
  ["Zeros between two significant digits are significant.", "1002", "4 s.f."],
  ["Trailing zeros in the decimal part are significant.", "2.50", "3 s.f."],
  ["Leading zeros only place the decimal point.", "0.0045", "2 s.f."],
  ["Trailing zeros in a whole number are ambiguous — use standard form.", "1200 → 1.20 × 10³", "3 s.f."],
];

export default function ReferencePage() {
  return (
    <div className="grid max-w-[1200px] gap-12 px-4 py-6 md:px-8 md:py-8 lg:grid-cols-2">
      <section aria-labelledby="ref-report">
        <h1 className="text-ds-heading-3">Reference</h1>
        <h2 id="ref-report" className="mt-6 mb-2 text-ds-heading-5">
          Format for experimental report writing
        </h2>
        <ol className="border-t border-rule">
          {REPORT.map(([name, what], i) => (
            <li key={name} className="grid grid-cols-[2rem_9rem_1fr] gap-x-3 border-b border-rule py-2 text-ds-body-sm">
              <span className="figure text-text-muted">{i + 1}</span>
              <span className="text-ds-label-md">{name}</span>
              <span className="text-text-secondary">{what}</span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="ref-sf" className="lg:pt-[52px]">
        <h2 id="ref-sf" className="mb-2 text-ds-heading-5">
          Significant figures
        </h2>
        <table className="w-full border-collapse text-ds-body-sm">
          <thead>
            <tr className="border-b border-sheet-edge text-left text-text-muted">
              <th className="py-2 font-normal">Rule</th>
              <th className="py-2 text-right font-normal">Example</th>
              <th className="py-2 text-right font-normal">Figures</th>
            </tr>
          </thead>
          <tbody>
            {SIG_FIGS.map(([rule, example, n]) => (
              <tr key={rule} className="border-b border-rule">
                <td className="py-2 pr-4 text-text-secondary">{rule}</td>
                <td className="figure py-2 text-right whitespace-nowrap">{example}</td>
                <td className="figure py-2 text-right whitespace-nowrap text-text-muted">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8">
          <SigFigTrainer />
        </div>
        <h2 className="mt-8 mb-2 text-ds-heading-5">Recording readings</h2>
        <p className="text-ds-body-sm text-text-secondary">
          Record every reading to the precision of the instrument: a metre rule with millimetre divisions read in centimetres gives one decimal place (45.0 cm, not 45 cm or 45.03 cm). A result keeps about as many significant figures as the least precise reading it came from.
        </p>
      </section>
    </div>
  );
}
