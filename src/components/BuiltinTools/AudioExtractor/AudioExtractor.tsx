import { useRef, useState } from "react";
import { AudioLines, FileDown, Music, Play, Square } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Accept plain seconds ("90"), m:ss ("1:30"), h:mm:ss, or shorthand ("1h2m3s"). */
const parseTimestamp = (raw: string): number | null => {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.max(0, Number(t));
  const hms = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/.exec(t);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return (Number(hms[1] ?? 0) * 3600) + (Number(hms[2] ?? 0) * 60) + Number(hms[3] ?? 0);
  }
  if (/^[\d:.]+$/.test(t)) {
    const parts = t.split(":").map(Number);
    if (parts.length <= 3 && parts.every((n) => Number.isFinite(n) && n >= 0)) {
      return parts.reduce((acc, n) => acc * 60 + n, 0);
    }
  }
  return null;
};

const encodeWav = (buffer: AudioBuffer): Blob => {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const sr = buffer.sampleRate;
  const bytes = len * numCh * 2;
  const ab = new ArrayBuffer(44 + bytes);
  const dv = new DataView(ab);
  const ws = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i));
  };
  ws(0, "RIFF");
  dv.setUint32(4, 36 + bytes, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * numCh * 2, true);
  dv.setUint16(32, numCh * 2, true);
  dv.setUint16(34, 16, true);
  ws(36, "data");
  dv.setUint32(40, bytes, true);
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
};

export function AudioExtractor() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [startText, setStartText] = useState("00:00");
  const [endText, setEndText] = useState("00:00");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);

  const onFile = (f: File) => {
    setName(f.name);
    setError(null);
    fileRef.current = f;
    setStart(0);
    setStartText("00:00");
    setEndText("00:00");
    if (url) URL.revokeObjectURL(url);
    const u = URL.createObjectURL(f);
    setUrl(u);
    const v = videoRef.current;
    if (v) {
      v.src = u;
      v.load();
    }
  };

  const extract = async () => {
    const v = videoRef.current;
    const f = fileRef.current;
    if (!v || !url || !f) return;
    if (end - start < 0.05) {
      setError("Pick a range longer than a blink.");
      return;
    }
    if (end - start > 3600) {
      setError("That range is over an hour — split it with the audio splitter first, then extract each part.");
      return;
    }
    setError(null);
    setBusy(true);
    v.pause();
    setPlaying(false);
    try {
      // Decode the file straight to samples — no playback, no media-element
      // hacks (createMediaElementSource does not exist on OfflineAudioContext).
      const buf = await f.arrayBuffer();
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const actx = new AC();
      let decoded: AudioBuffer;
      try {
        decoded = await actx.decodeAudioData(buf);
      } finally {
        await actx.close().catch(() => undefined);
      }
      // Slice [start, end) and resample to 48 kHz stereo via a buffer source,
      // which OfflineAudioContext fully supports.
      const s0 = Math.max(0, Math.floor(start * decoded.sampleRate));
      const s1 = Math.min(decoded.length, Math.ceil(end * decoded.sampleRate));
      const dur = Math.max(0.01, (s1 - s0) / decoded.sampleRate);
      const ctx = new OfflineAudioContext(2, Math.ceil(dur * 48000), 48000);
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      src.connect(ctx.destination);
      src.start(0, s0 / decoded.sampleRate, dur);
      const buffer = await ctx.startRendering();
      const blob = encodeWav(buffer);
      const out = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = out;
      a.download = `${name.replace(/\.[^.]+$/, "")}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(out), 60_000);
    } catch {
      setError("Could not decode that file — DRM-protected or corrupt files won't decode. Try another file.");
    } finally {
      setBusy(false);
      setPlaying(false);
    }
  };

  const commitStartText = () => {
    const parsed = parseTimestamp(startText);
    if (parsed === null) {
      setStartText(fmt(start));
      return;
    }
    const t = Math.max(0, Math.min(parsed, Math.max(end - 0.05, 0)));
    setStart(t);
    setStartText(fmt(t));
    const v = videoRef.current;
    if (v && Number.isFinite(t)) v.currentTime = t;
  };

  const commitEndText = () => {
    const parsed = parseTimestamp(endText);
    if (parsed === null) {
      setEndText(fmt(end));
      return;
    }
    const t = Math.min(Math.max(parsed, start + 0.05), Math.max(duration, start + 0.05));
    setEnd(t);
    setEndText(fmt(t));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <ToolShell
      crumb="AUDIO-EXTRACTOR"
      title="The soundtrack."
      tagline="Pull the audio out of any video and cut it to the exact moment you want — clean 48 kHz WAV, rendered offline, never uploaded. The converter sites queue your file for hours and cap the bitrate; this one is instant."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Source
            <Music className="h-4 w-4" aria-hidden="true" />
          </h2>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 w-full rounded-lg border-[3px] border-dashed border-ink bg-surface-muted px-4 py-8 text-center transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
          >
            <p className="font-mono text-sm font-bold uppercase tracking-widest text-ink">
              {name ? "Pick another video or audio" : "Drop or pick a video / audio file"}
            </p>
          </button>

          {url && (
            <div className="mt-4 overflow-hidden rounded-md border-2 border-ink bg-ink">
              <video ref={videoRef} src={url} className="w-full" onLoadedMetadata={(e) => {
                const d = e.currentTarget.duration;
                setDuration(d);
                setEnd(d);
                setEndText(fmt(d));
              }} />
              <button
                type="button"
                onClick={togglePlay}
                className="flex w-full items-center justify-center gap-2 bg-ink px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-paper transition-colors duration-200 ease-brutal hover:bg-ink/80"
              >
                {playing ? <Square className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
                {playing ? "Pause" : "Preview"}
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Start</span>
              <input
                type="text"
                value={startText}
                onChange={(e) => setStartText(e.target.value)}
                onBlur={commitStartText}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="0:00"
                spellCheck={false}
                inputMode="decimal"
                aria-label="Start timestamp — seconds or m:ss"
                className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
              />
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                value={start}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  const clamped = Math.min(s, end - 0.05);
                  setStart(clamped);
                  setStartText(fmt(clamped));
                  const v = videoRef.current;
                  if (v) v.currentTime = clamped;
                }}
                aria-label="Start slider"
                className="mt-2 w-full accent-ink"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">End</span>
              <input
                type="text"
                value={endText}
                onChange={(e) => setEndText(e.target.value)}
                onBlur={commitEndText}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="0:00"
                spellCheck={false}
                inputMode="decimal"
                aria-label="End timestamp — seconds or m:ss"
                className="mt-2 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
              />
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.01)}
                step={0.05}
                value={end}
                onChange={(e) => {
                  const en = Number(e.target.value);
                  const clamped = Math.min(Math.max(en, start + 0.05), duration);
                  setEnd(clamped);
                  setEndText(fmt(clamped));
                }}
                aria-label="End slider"
                className="mt-2 w-full accent-ink"
              />
            </label>
          </div>
          <p className="mt-2 font-mono text-[9px] font-semibold uppercase tracking-widest text-ink/40">
            Type exact stamps — `90`, `1:30` or `1h2m3s` — Enter jumps the preview
          </p>

          {error && (
            <p className="mt-4 rounded-md border-2 border-ink bg-red/20 px-3 py-3 font-mono text-xs font-bold uppercase tracking-widest text-ink">
              [ ERROR ] {error}
            </p>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] Extract
            <AudioLines className="h-4 w-4" aria-hidden="true" />
          </h2>

          <div className="mt-4 flex-1 rounded-md border-2 border-ink bg-surface-muted p-4">
            <dl className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-dashed border-ink/20 pb-2">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Source</dt>
                <dd className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">{name || "—"}</dd>
              </div>
              <div className="flex items-center justify-between border-b-2 border-dashed border-ink/20 pb-2">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Range</dt>
                <dd className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                  {fmt(start)} → {fmt(end)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-b-2 border-dashed border-ink/20 pb-2">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Length</dt>
                <dd className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">{fmt(Math.max(end - start, 0))}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Format</dt>
                <dd className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">WAV · 48 kHz · 16-bit · stereo</dd>
              </div>
            </dl>
          </div>

          <Button onClick={extract} disabled={!url || busy} className="mt-4 w-full uppercase">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            {busy ? "Rendering offline…" : "Extract WAV"}
          </Button>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Rendered offline — an audio file this clean usually costs a subscription.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Extracted locally with OfflineAudioContext — no queue, no caps, no watermark.
      </p>
    </ToolShell>
  );
}