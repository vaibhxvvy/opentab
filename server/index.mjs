/**
 * OpenTab — local backend. Runs ONLY on your machine (127.0.0.1).
 *
 * What it does: YouTube metadata + file downloads via yt-dlp, with optional
 * server-side trimming (--download-sections, exact cuts via ffmpeg).
 * What it never does: listen on your LAN, run anything as shell, accept
 * non-YouTube URLs, or send your links anywhere except YouTube itself.
 *
 *   npm run backend          (from repo root)
 *   PORT=3001 node server/index.mjs
 *
 * Env: PORT (default 3001), YT_DLP_PATH (override binary), YT_DLP_ARGS (extra
 * space-separated args appended to every yt-dlp call, e.g. "--cookies cookies.txt").
 */
import { createServer } from "node:http";
import { execFile, spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { promisify } from "node:util";

import { ensureYtdlp } from "./scripts/fetch-ytdlp.mjs";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT ?? 3001);
const HOST = "127.0.0.1";
const MAX_JOBS = 2;

const BIN_NAMES = { win32: "yt-dlp.exe", darwin: "yt-dlp_macos", linux: "yt-dlp" };
const HERE = new URL(".", import.meta.url).pathname;
let YTDLP = process.env.YT_DLP_PATH ?? null;
let YTDLP_VERSION = null;
let activeJobs = 0;

const EXTRA_ARGS = (process.env.YT_DLP_ARGS ?? "").split(" ").filter(Boolean);

// ---------- helpers ----------

function send(res, status, body, type = "application/json") {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function toHMS(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Accept only YouTube watch/shorts/embed/live/youtu.be URLs; return canonical URL or null. */
function canonicalYouTubeUrl(input) {
  if (!input || typeof input !== "string" || input.length > 500) return null;
  const s = input.trim();
  let id = null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) {
    id = s;
  } else {
    try {
      const u = new URL(s.startsWith("http") ? s : `https://${s}`);
      const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
      if (host === "youtu.be") {
        const cand = u.pathname.slice(1).split("/")[0];
        if (/^[A-Za-z0-9_-]{11}$/.test(cand)) id = cand;
      } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
        const v = u.searchParams.get("v");
        if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) id = v;
        else {
          const m = /^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
          if (m) id = m[2];
        }
      } else return null;
    } catch {
      return null;
    }
  }
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitize(name) {
  return (
    String(name)
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "video"
  );
}

async function resolveYtdlp() {
  if (YTDLP && existsSync(YTDLP)) return YTDLP;
  const local = join(HERE, "bin", BIN_NAMES[process.platform] ?? "yt-dlp");
  if (existsSync(local)) {
    YTDLP = local;
    return local;
  }
  // PATH fallback
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execFileAsync(cmd, ["yt-dlp"], { timeout: 10_000, windowsHide: true });
    const found = String(stdout).split(/\r?\n/)[0]?.trim();
    if (found && existsSync(found)) {
      YTDLP = found;
      return found;
    }
  } catch { /* not on PATH */ }
  return null;
}

async function ytdlpVersion(bin) {
  try {
    const { stdout } = await execFileAsync(bin, ["--version"], { timeout: 30_000, windowsHide: true });
    return String(stdout).trim().split(/\r?\n/)[0];
  } catch {
    return "unknown";
  }
}

function ffmpegPresent() {
  return new Promise((resolve) => {
    const cmd = process.platform === "win32" ? "where" : "which";
    execFile(cmd, ["ffmpeg"], { timeout: 10_000, windowsHide: true }, (err) => resolve(!err));
  });
}

// ---------- routes ----------

async function handleHealth(_query, res) {
  const bin = await resolveYtdlp();
  send(res, 200, {
    ok: Boolean(bin),
    ytdlp: bin ? (YTDLP_VERSION ??= await ytdlpVersion(bin)) : null,
    ffmpeg: await ffmpegPresent(),
    jobs: activeJobs,
    hint: bin ? undefined : "yt-dlp missing — it downloads automatically on boot, or run: node server/scripts/fetch-ytdlp.mjs",
  });
}

async function handleMeta(query, res) {
  const url = canonicalYouTubeUrl(query.get("url") ?? "");
  if (!url) return send(res, 400, { error: "Pass a valid YouTube watch/shorts/youtu.be URL or video ID." });
  const bin = await resolveYtdlp();
  if (!bin) return send(res, 503, { error: "yt-dlp is not ready yet — retry in a few seconds." });
  try {
    const { stdout } = await execFileAsync(
      bin,
      ["--dump-single-json", "--no-playlist", "--no-warnings", "--socket-timeout", "15", ...EXTRA_ARGS, url],
      { timeout: 45_000, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
    );
    const d = JSON.parse(stdout);
    const seen = new Map();
    for (const f of d.formats ?? []) {
      if (!f.vcodec || f.vcodec === "none" || !f.height) continue;
      if (!["mp4", "webm"].includes(f.ext)) continue;
      const key = `${f.ext}:${f.height}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: f.format_id,
          ext: f.ext,
          height: f.height,
          fps: f.fps ?? null,
          size: f.filesize ?? f.filesize_approx ?? null,
        });
      }
    }
    const qualities = [...seen.values()].sort((a, b) => b.height - a.height).slice(0, 6);
    send(res, 200, {
      id: d.id,
      title: d.title ?? "Untitled video",
      author: d.uploader ?? d.channel ?? "",
      duration: d.duration ?? null,
      thumbnail: d.thumbnail ?? null,
      qualities,
    });
  } catch (e) {
    send(res, 502, { error: `Could not read that video (${e.killed ? "timed out" : "unavailable, private, or age-restricted"}).` });
  }
}

const AUDIO_FORMATS = new Set(["mp3", "ogg", "m4a", "flac", "wav", "opus"]);
const VIDEO_FORMATS = new Set(["mp4", "webm"]);

async function handleDownload(query, res, req) {
  const url = canonicalYouTubeUrl(query.get("url") ?? "");
  const format = String(query.get("format") ?? "mp4").toLowerCase();
  if (!url) return send(res, 400, { error: "Pass a valid YouTube URL or video ID." });
  if (!AUDIO_FORMATS.has(format) && !VIDEO_FORMATS.has(format)) {
    return send(res, 400, { error: `format must be one of: ${[...VIDEO_FORMATS, ...AUDIO_FORMATS].join(", ")}` });
  }
  const bin = await resolveYtdlp();
  if (!bin) return send(res, 503, { error: "yt-dlp is not ready yet — retry in a few seconds." });
  if (activeJobs >= MAX_JOBS) return send(res, 429, { error: "Backend is busy (2 downloads max) — try again when one finishes." });

  const start = Math.max(0, num(query.get("start"), 0));
  const end = num(query.get("end"), 0);
  const wantCut = end > start + 0.5 && end - start <= 3 * 3600;
  const quality = Math.min(2160, Math.max(144, Math.round(num(query.get("quality"), 720))));

  activeJobs += 1;
  const dir = join(tmpdir(), "opentab-backend");
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `dl-${Date.now()}-${Math.random().toString(36).slice(2)}.${format}`);
  let child = null;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    activeJobs = Math.max(0, activeJobs - 1);
    try { unlinkSync(tmp); } catch { /* already gone */ }
  };
  req.on("close", () => {
    if (!done && child) {
      try { child.kill("SIGKILL"); } catch { /* ignore */ }
    }
    finish();
  });

  try {
    // title first (for a clean filename)
    let title = "video";
    try {
      const { stdout } = await execFileAsync(
        bin, ["--get-title", "--no-playlist", "--no-warnings", "--socket-timeout", "15", ...EXTRA_ARGS, url],
        { timeout: 30_000, windowsHide: true },
      );
      if (stdout.trim()) title = stdout.trim().split(/\r?\n/)[0];
    } catch { /* fall back to generic name */ }
    const suffix = wantCut ? `-${toHMS(start).replaceAll(":", "")}-${toHMS(end).replaceAll(":", "")}` : "";
    const filename = `${sanitize(title)}${suffix}.${format}`;

    const args = ["--no-playlist", "--no-warnings", "--socket-timeout", "30", ...EXTRA_ARGS];
    if (VIDEO_FORMATS.has(format)) {
      args.push("-f", `bv*[height<=${quality}]+ba/b[height<=${quality}]/b`, "--merge-output-format", format);
    } else {
      args.push("-f", "ba", "-x", "--audio-format", format);
      if (!["wav", "flac"].includes(format)) args.push("--audio-quality", "192K");
    }
    if (wantCut) args.push("--download-sections", `*${toHMS(start)}-${toHMS(end)}`, "--force-keyframes-at-cuts");
    args.push("-o", tmp, url);

    await new Promise((resolve, reject) => {
      child = spawn(bin, args, { windowsHide: true, timeout: 30 * 60 * 1000 });
      let stderr = "";
      child.stderr.on("data", (c) => { stderr += String(c).slice(-2000); });
      child.on("error", reject);
      child.on("close", (code) => (code === 0 ? resolve(null) : reject(new Error(stderr || `yt-dlp exited ${code}`))));
    });

    const { size } = await import("node:fs/promises").then((m) => m.stat(tmp));
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": size,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    });
    const stream = createReadStream(tmp);
    stream.on("close", finish);
    stream.on("error", () => { finish(); try { res.destroy(); } catch { /* ignore */ } });
    stream.pipe(res);
  } catch (e) {
    finish();
    const msg = String(e?.message ?? e);
    const status = /busy|429/.test(msg) ? 429 : 502;
    if (!res.headersSent) {
      send(res, status, {
        error: /Private|Login|Sign in|age|cookies/i.test(msg)
          ? "YouTube refused this one (private, login-walled, or age-gated). Public videos work; gated ones need cookies — see YT_DLP_ARGS."
          : `Download failed: ${msg.slice(0, 300)}`,
      });
    }
  }
}

// ---------- boot ----------

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }
  if (req.method !== "GET") return send(res, 405, { error: "GET only." });
  const u = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  const query = u.searchParams;
  if (u.pathname === "/api/health") return void handleHealth(query, res).catch((e) => send(res, 500, { error: String(e) }));
  if (u.pathname === "/api/meta") return void handleMeta(query, res).catch((e) => send(res, 500, { error: String(e) }));
  if (u.pathname === "/api/download") return void handleDownload(query, res, req).catch((e) => {
    if (!res.headersSent) send(res, 500, { error: String(e) });
  });
  send(res, 404, { error: "Unknown endpoint. Try /api/health." });
});

server.listen(PORT, HOST, () => {
  console.log(`[+] opentab local backend on http://${HOST}:${PORT} (loopback only)`);
});

// Fetch yt-dlp in the background so the first /api/health already answers.
resolveYtdlp().then(async (bin) => {
  if (bin) {
    YTDLP = bin;
    YTDLP_VERSION = await ytdlpVersion(bin);
    console.log(`[+] yt-dlp: ${bin} (${YTDLP_VERSION})`);
    return;
  }
  try {
    YTDLP = await ensureYtdlp();
    YTDLP_VERSION = await ytdlpVersion(YTDLP);
  } catch (e) {
    console.error(`[X] yt-dlp auto-fetch failed: ${e.message} — run: node server/scripts/fetch-ytdlp.mjs`);
  }
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
