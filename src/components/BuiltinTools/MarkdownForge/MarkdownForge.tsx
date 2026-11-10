import { useMemo, useState } from "react";
import { Copy, Eraser, FileCode, Printer, Sparkles } from "lucide-react";
import { marked } from "marked";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const SAMPLE = `# OpenTab

> No paywalls. No signups. **No accounts.**

A growing arsenal of **234 tools** that run entirely in your browser.

## The stack

- Tailwind CSS v4
- TypeScript + Vite
- Zero backend

\`\`\`ts
const freedom = "the whole point";
console.log(freedom);
\`\`\`

[Grab a tool](/#/tools) →`;

marked.setOptions({ gfm: true, breaks: false });

export function MarkdownForge() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const html = useMemo(
    () => (input ? (marked.parse(input, { async: false }) as string) : ""),
    [input],
  );

  const copy = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="MARKDOWN-FORGE"
      title="The forge."
      tagline="Drop Markdown, walk out with HTML. Rendered live with GFM — headers, code blocks, tables, links."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Markdown in
            <FileCode className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={"# Heading\n\n**Bold** text and _italics_"}
            className="mt-4 h-80 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInput(SAMPLE);
              }}
              className="uppercase"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("")}
              className="uppercase"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!html}
              className="ml-auto uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy HTML"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.print()}
              disabled={!html}
              className="uppercase"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print / PDF
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] HTML out
          </h2>
          <div
            className="mt-4 h-80 flex-1 overflow-auto rounded-md border-2 border-ink bg-paper p-4 text-sm text-ink markdown-body"
            dangerouslySetInnerHTML={{ __html: html || "<p class='text-ink/30'>Rendered HTML appears here…</p>" }}
          />
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-ink bg-green" />
            {html ? `[ OK ] ${html.length.toLocaleString()} BYTES OF HTML` : "[ IDLE ] WRITE SOME MARKDOWN"}
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Rendered with marked — GitHub-flavored, in your tab. No data leaves.
      </p>

      {html && (
        <div className="md-print-sheet" aria-hidden="true">
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </ToolShell>
  );
}