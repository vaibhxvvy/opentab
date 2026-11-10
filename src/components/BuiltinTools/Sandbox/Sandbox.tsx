import { useCallback, useEffect, useRef, useState } from "react";
import { AppWindow, Eraser, Play, RotateCcw } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const TEMPLATE = `// opentab sandbox
// Runs in a sandboxed iframe — no DOM, no network.
// console.log lands below.
const walls = 234;
const paywall = "no thanks";
console.log("walls to crack:", walls);
console.log("paywalls:", paywall);
for (let i = 1; i <= 3; i++) console.log("iteration", i);`;

interface LogLine {
  text: string;
  kind: "log" | "error";
}

function serialize(x: unknown): string {
  if (typeof x === "string") return x;
  if (x === null) return "null";
  if (x === undefined) return "undefined";
  if (typeof x === "function") return `[Function ${x.name || "anonymous"}]`;
  if (typeof x === "symbol") return String(x);
  if (typeof x === "object" && x instanceof Error) return `${x.name}: ${x.message}`;
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

const FRAME_SRC = (code: string) => `<!doctype html><html><body>
<script>
  const send = (kind, args) => parent.postMessage({ kind, args: args.map(serialize) }, "*");
  const serialize = (x) => {
    if (typeof x === "string") return x;
    if (x === null) return "null";
    if (x === undefined) return "undefined";
    if (typeof x === "function") return "[Function " + (x.name || "anonymous") + "]";
    if (typeof x === "object" && x instanceof Error) return x.name + ": " + x.message;
    try { return JSON.stringify(x); } catch { return String(x); }
  };
  console.log = (...a) => send("log", a);
  console.error = (...a) => send("error", a);
  console.warn = (...a) => send("log", a);
  console.info = (...a) => send("log", a);
  window.onerror = (msg, src, line) => send("error", [String(msg) + " (line " + line + ")"]);
  try {
    new Function("console", ${JSON.stringify(code)})(console);
    send("done", []);
  } catch (e) {
    send("error", [e.name + ": " + e.message]);
    send("done", []);
  }
</script></body></html>`;

export function Sandbox() {
  const [code, setCode] = useState(TEMPLATE);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameHolderRef = useRef<HTMLDivElement>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    const data = event.data as { kind?: string; args?: unknown[] } | null;
    if (!data || typeof data !== "object") return;
    if (data.kind === "log") {
      setLogs((prev) => [...prev.slice(-199), { text: data.args?.map(serialize).join(" ") ?? "", kind: "log" }]);
    } else if (data.kind === "error") {
      setLogs((prev) => [...prev.slice(-199), { text: data.args?.map(serialize).join(" ") ?? "", kind: "error" }]);
    } else if (data.kind === "done") {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  const run = () => {
    setLogs([]);
    setRunning(true);
    if (frameHolderRef.current) {
      frameHolderRef.current.innerHTML = "";
      const frame = document.createElement("iframe");
      frame.sandbox = "allow-scripts";
      frame.setAttribute("aria-hidden", "true");
      frame.setAttribute("tabindex", "-1");
      frame.className = "hidden";
      frameHolderRef.current.appendChild(frame);
      frame.srcdoc = FRAME_SRC(code);
      frameRef.current = frame;
    }
    window.setTimeout(() => {
      if (frameRef.current) {
        frameRef.current.remove();
        frameRef.current = null;
      }
      setRunning(false);
    }, 3000);
  };

  return (
    <ToolShell
      crumb="MINI-SANDBOX"
      title="The sandbox."
      tagline="Write a bit of JavaScript, run it right here. Console output, errors, the lot — in a real sandbox."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Script
            <AppWindow className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="// write some JS…"
            className="mt-4 h-80 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={run} disabled={running} className="uppercase">
              <Play className="h-4 w-4" aria-hidden="true" />
              {running ? "Running…" : "Run"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCode(TEMPLATE)} className="uppercase">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCode("")} className="uppercase">
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear
            </Button>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Console
            <AppWindow className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 h-80 flex-1 overflow-auto rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed">
            {logs.length === 0 && <p className="text-paper/40">console.log output lands here…</p>}
            {logs.map((l, i) => (
              <p key={i} className={cn("whitespace-pre-wrap break-all", l.kind === "error" ? "text-red" : "text-green")}>
                {l.text}
              </p>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
            <span
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                running ? "animate-pulse bg-yellow" : logs.some((l) => l.kind === "error") ? "bg-red" : "bg-green",
              )}
            />
            {running ? "[ RUNNING ]" : logs.some((l) => l.kind === "error") ? "[ ERR ] FINISHED WITH ERRORS" : "[ IDLE ] READY"}
          </p>
        </section>
      </div>

      <div ref={frameHolderRef} />

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Runs in a sandboxed iframe — no DOM, no network, no parent access. Killed after 3 seconds.
      </p>
    </ToolShell>
  );
}