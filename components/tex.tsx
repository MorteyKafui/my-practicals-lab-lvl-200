import katex from "katex";

/**
 * Renders text with $inline$ and $$display$$ maths through KaTeX. Content comes from our own
 * message files, never from students, so the generated HTML is trusted.
 */
export function Tex({ children, className }: { children: string; className?: string }) {
  const display = /^\s*\$\$([\s\S]+)\$\$\s*$/.exec(children);
  if (display) {
    return (
      <div
        className={className ?? "my-2 overflow-x-auto"}
        dangerouslySetInnerHTML={{ __html: katex.renderToString(display[1]!, { displayMode: true, throwOnError: false }) }}
      />
    );
  }
  const html = children
    .split(/(\$[^$]+\$)/g)
    .map((part) =>
      part.startsWith("$") && part.endsWith("$") && part.length > 2
        ? katex.renderToString(part.slice(1, -1), { throwOnError: false })
        : escapeHtml(part),
    )
    .join("");
  return <p className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
