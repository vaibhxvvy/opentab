import { useEffect, useMemo, useState } from "react";
import { AudioWaveform, Copy, Play, Square } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....",
  "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.",
  "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
  "+": ".-.-.", "-": "-....-", "_": "..--.-", '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};

const REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k]),
);

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((ch) => {
      if (ch === " ") return "/";
      return MORSE[ch] ?? "";
    })
    .filter((c, i, arr) => !(c === "" && arr[i - 1] === ""))
    .join(" ")
    .trim();
}

function morseToText(morse: string): string {
  return morse
    .trim()
    .split(/\s{2,}/)
    .map((word) =>
      word
        .split(" ")
        .map((code) => REVERSE[code] ?? "")
        .join(""),
    )
    .join(" ");
}

export function Morse() {
  const [text, setText] = useState("SOS — opentab");
  const [morse, setMorse] = useState("");
  const [mode, setMode] = useState<"enc" | "dec">("enc");
  const [wpm, setWpm] = useState(20);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useMemo(() => ({ ctx: null as AudioContext | null, timer: 0 as number }), []);

  useEffect(() => {
    return () => {
      window.clearTimeout(audioRef.timer);
      void audioRef.ctx?.close();
    };
  }, [audioRef]);

  const run = () => {
    if (mode === "enc") setMorse(textToMorse(text));
    else setText(morseToText(morse));
  };

  const play = () => {
    if (!morse || playing) return;
    const ctx = audioRef.ctx ?? new AudioContext();
    audioRef.ctx = ctx;
    void ctx.resume();
    const unit = 1.2 / wpm;
    const dot = unit * 60 / 1000;
    const freq = 600;
    const timeline: { tone: boolean; dur: number }[] = [];
    for (const ch of morse) {
      if (ch === ".") timeline.push({ tone: true, dur: dot });
      else if (ch === "-") timeline.push({ tone: true, dur: dot * 3 });
      else if (ch === " ") timeline.push({ tone: false, dur: dot * 3 });
      else if (ch === "/") timeline.push({ tone: false, dur: dot * 7 });
      timeline.push({ tone: false, dur: dot });
    }
    let t = ctx.currentTime + 0.05;
    let total = 0;
    for (const step of timeline) {
      if (step.tone) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + step.dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + step.dur + 0.01);
      }
      t += step.dur;
      total += step.dur;
    }
    setPlaying(true);
    audioRef.timer = window.setTimeout(() => setPlaying(false), (total + 0.2) * 1000);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(mode === "enc" ? morse : text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolShell
      crumb="MORSE"
      title="The telegraph."
      tagline="Text ⇄ Morse code, with real beeping. Learn the dots and dashes without a signup."
    >
      <div className="mt-10 flex flex-wrap gap-2">
        {(
          [
            ["enc", "Text → Morse"],
            ["dec", "Morse → Text"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={cn(
              "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,shadow] duration-200 ease-brutal",
              mode === value ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] {mode === "enc" ? "Text" : "Morse"}
            <AudioWaveform className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={mode === "enc" ? text : morse}
            onChange={(e) => (mode === "enc" ? setText(e.target.value) : setMorse(e.target.value))}
            spellCheck={false}
            rows={6}
            placeholder={mode === "enc" ? "Type text…" : "Paste morse with / between words…"}
            className="mt-4 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-sm leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <Button size="sm" onClick={run} className="mt-3 uppercase">
            Translate
          </Button>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] {mode === "enc" ? "Morse" : "Text"}
          </h2>
          <textarea
            readOnly
            value={mode === "enc" ? morse : text}
            spellCheck={false}
            rows={6}
            placeholder="Translation lands here…"
            className="mt-4 w-full resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-sm leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => void copy()} disabled={!morse && !text} className="uppercase">
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="secondary" size="sm" onClick={play} disabled={!morse || playing} className="uppercase">
              {playing ? <Square className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
              {playing ? "Playing…" : "Play"}
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="morse-wpm" className="font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                Speed {wpm} wpm
              </label>
              <input
                id="morse-wpm"
                type="range"
                min={8}
                max={40}
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="w-28 accent-yellow"
              />
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
          [03] The chart
        </h2>
        <div className="mt-4 grid max-h-64 grid-cols-4 gap-2 overflow-auto sm:grid-cols-6 lg:grid-cols-8">
          {Object.entries(MORSE).map(([ch, code]) => (
            <div key={ch} className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 text-center">
              <p className="font-display text-lg font-bold text-ink">{ch}</p>
              <p className="font-mono text-[10px] font-semibold text-ink/60">{code}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Beeps are synthesized with WebAudio in your tab — no signals leave.
      </p>
    </ToolShell>
  );
}