import { useMemo, useState } from "react";
import { Braces, Copy, Eraser, Minimize2, Sparkles } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const SAMPLE = {
  name: "OpenTab",
  mission: "Collect the keys",
  stats: { tools: 234, walls: 0, accounts: 0 },
  tags: ["open-source", "in-browser", "no-signup"],
  active: true,
};

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const info = useMemo(() => {
    if (!output) return null;
    try {
      const parsed = JSON.parse(output);
      const keys = Array.isArray(parsed)
        ? `${parsed.length} ITEMS`
        : `${Object.keys(parsed).length} KEYS`;
      return { keys, bytes: new Blob([output]).size };
    } catch {
      return null;
    }
  }, [output]);

  const run = (mode: "format" | "minify") => {
    setError(null);
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, mode === "format" ? 2 : 0));
    } catch (e) {
      setOutput("");
      setError(`INVALID JSON — ${(e as Error).message}`);
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="JSON-FORMATTER"
      title="The formatter."
      tagline="Paste minified chaos, get readable order. Validate, format, minify — all in your browser."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Raw input
            <Braces className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder='{"paste":"your","json":"here"}'
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => run("format")} className="uppercase">
              Format
            </Button>
            <Button variant="secondary" size="sm" onClick={() => run("minify")} className="uppercase">
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
              Minify
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInput(JSON.stringify(SAMPLE));
                setOutput("");
                setError(null);
              }}
              className="uppercase"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Sample
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput("");
                setOutput("");
                setError(null);
              }}
              className="uppercase"
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Output
          </h2>
          <textarea
            readOnly
            value={output}
            spellCheck={false}
            placeholder="Formatted JSON lands here…"
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!output}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                  error ? "bg-red" : output ? "bg-green" : "bg-ink/20",
                )}
              />
              {error
                ? "[ ERR ] INVALID JSON"
                : info
                  ? `[ OK ] VALID // ${info.keys} // ${info.bytes} B`
                  : "[ IDLE ] WAITING FOR INPUT"}
            </span>
          </div>
        </section>
      </div>

      {error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          {error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Everything runs locally — your JSON never leaves this tab.
      </p>
    </ToolShell>
  );
}