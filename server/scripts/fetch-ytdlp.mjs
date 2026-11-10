/**
 * Download the standalone yt-dlp binary for this platform into server/bin/.
 * Zero dependencies — plain node. Safe to re-run (skips if already present).
 *
 * Usage: node scripts/fetch-ytdlp.mjs
 * Env:   YT_DLP_VERSION (default: latest release tag, e.g. "2025.01.01" or "latest")
 */
import { createWriteStream, existsSync, mkdirSync, chmodSync, unlinkSync } from "node:fs";
import { get } from "node:https";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const binDir = join(here, "..", "bin");

const ASSETS = {
  win32: "yt-dlp.exe",
  darwin: "yt-dlp_macos",
  linux: "yt-dlp",
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: { "User-Agent": "opentab-local-backend" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        resolve(download(res.headers.location, dest));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`download failed: HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const out = createWriteStream(dest);
      res.pipe(out);
      out.on("finish", () => out.close(resolve));
      out.on("error", (e) => {
        try { unlinkSync(dest); } catch { /* ignore */ }
        reject(e);
      });
    });
    req.on("error", reject);
    req.setTimeout(120_000, () => req.destroy(new Error("download timed out")));
  });
}

export async function ensureYtdlp() {
  const asset = ASSETS[process.platform];
  if (!asset) throw new Error(`unsupported platform: ${process.platform}`);
  mkdirSync(binDir, { recursive: true });
  const dest = join(binDir, asset);
  if (existsSync(dest)) return dest;
  const version = process.env.YT_DLP_VERSION ?? "latest";
  const base =
    version === "latest"
      ? "https://github.com/yt-dlp/yt-dlp/releases/latest/download"
      : `https://github.com/yt-dlp/yt-dlp/releases/download/${version}`;
  console.log(`[*] fetching yt-dlp (${asset})…`);
  await download(`${base}/${asset}`, dest);
  if (process.platform !== "win32") chmodSync(dest, 0o755);
  const ver = await new Promise((resolve) => {
    execFile(dest, ["--version"], { timeout: 30_000, windowsHide: true }, (err, stdout) =>
      resolve(err ? "unknown" : String(stdout).trim()),
    );
  });
  console.log(`[+] yt-dlp ready: ${dest} (${ver})`);
  return dest;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  ensureYtdlp().catch((e) => {
    console.error(`[X] ${e.message}`);
    process.exit(1);
  });
}
