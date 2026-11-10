import { useMemo, useState } from "react";
import { Binary, Copy, Eraser, KeyRound, RotateCcw, ShieldCheck } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";
import { cn } from "../../../utils/cn";

type Encoding = "utf8" | "base64" | "hex" | "url" | "base64url" | "base32" | "octal" | "fcuk";
type WrapOption = 0 | 8 | 16 | 32 | 64 | 76;
type LengthOption = 0 | 8 | 16 | 32 | 64;

const DEFAULT_FCUK_KEY = "FCUK-PAYWALLS-77-NOVA-DEFAULT";

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (clean.length % 2 !== 0) throw new Error("odd hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

function base32ToBytes(input: string): Uint8Array {
  const clean = input.trim().replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  if (clean.length === 0) return new Uint8Array(0);
  if (/[^A-Z2-7]/.test(clean)) throw new Error("invalid base32");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function bytesToOctal(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(8).padStart(3, "0")).join(" ");
}

function octalToBytes(input: string): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) return new Uint8Array(0);
  const parts = trimmed.includes(" ") || trimmed.includes("\n") || trimmed.includes("\t")
    ? trimmed.split(/\s+/).filter(Boolean)
    : (trimmed.match(/.{1,3}/g) ?? []);
  const out = new Uint8Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!/^[0-7]{1,3}$/.test(p)) throw new Error("invalid octal");
    const v = parseInt(p, 8);
    if (v > 255) throw new Error("octal byte overflow");
    out[i] = v;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// FCUK-77 · NOVA — hard-to-crack variable-length codec
// No “====” spam. Any output length via keyed expansion.
// ──────────────────────────────────────────────────────────────────────────────
const STD_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function deriveKeyBytes(passphrase: string): Uint8Array {
  const str = passphrase || DEFAULT_FCUK_KEY;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // expand to 32 bytes via xorshift mixing
  const out = new Uint8Array(32);
  let seed = h >>> 0;
  for (let i = 0; i < 32; i++) {
    seed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    seed ^= seed >>> 13;
    seed = Math.imul(seed, 0xc2b2ae35) >>> 0;
    seed ^= seed >>> 16;
    out[i] = seed & 0xff;
    // churn seed with passphrase
    seed = (seed + str.charCodeAt(i % str.length) * 131) >>> 0;
  }
  // 3 extra diffusion rounds
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 32; i++) {
      out[i] ^= out[(i + 7) % 32];
      out[i] = (out[i] * 37 + 11) & 0xff;
    }
  }
  return out;
}

function shuffledAlphabet(keyBytes: Uint8Array): string {
  const arr = STD_B64.split("");
  let seed = 0;
  for (const b of keyBytes) seed = (seed * 131 + b) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ 0x6d2b79f5, 0x45d9f3b) >>> 0;
    seed ^= seed >>> 16;
    seed = Math.imul(seed, 0x119de1f3) >>> 0;
    const j = seed % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr.join("");
}

function keystream(keyBytes: Uint8Array, nonce: Uint8Array, len: number): Uint8Array {
  const out = new Uint8Array(len);
  let state = 0x811c9dc5 >>> 0;
  for (const b of keyBytes) state = (Math.imul(state ^ b, 0x01000193) >>> 0);
  for (const b of nonce) state = (Math.imul(state ^ b, 0x01000193) >>> 0);
  for (let i = 0; i < len; i++) {
    state = Math.imul(state ^ 0x9e3779b1, 0x85ebca6b) >>> 0;
    state ^= state >>> 13;
    state = Math.imul(state, 0xc2b2ae35) >>> 0;
    state ^= state >>> 16;
    // mix key byte for key dependence
    out[i] = (state ^ keyBytes[i % keyBytes.length] ^ (state >>> 8)) & 0xff;
    // feedback
    state = (state + out[i] * 131 + i) >>> 0;
  }
  return out;
}

function permuteBytes(bytes: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  if (bytes.length <= 1) return bytes.slice();
  const out = bytes.slice();
  let seed = 0;
  for (const b of keyBytes) seed = (seed * 131 + b) >>> 0;
  // Fisher-Yates forward
  for (let i = out.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    seed ^= seed >>> 13;
    seed = Math.imul(seed, 0x27d4eb2d) >>> 0;
    const j = seed % (i + 1);
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

function unpermuteBytes(bytes: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  if (bytes.length <= 1) return bytes.slice();
  const out = bytes.slice();
  let seed = 0;
  for (const b of keyBytes) seed = (seed * 131 + b) >>> 0;
  const swaps: Array<[number, number]> = [];
  for (let i = out.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    seed ^= seed >>> 13;
    seed = Math.imul(seed, 0x27d4eb2d) >>> 0;
    const j = seed % (i + 1);
    swaps.push([i, j]);
  }
  for (let k = swaps.length - 1; k >= 0; k--) {
    const [i, j] = swaps[k];
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

function translateToCustom(std: string, customAlphabet: string): string {
  let out = "";
  for (let i = 0; i < std.length; i++) {
    const idx = STD_B64.indexOf(std[i]);
    if (idx === -1) throw new Error("invalid std b64 char");
    out += customAlphabet[idx];
  }
  return out;
}

function randomNonce(): Uint8Array {
  const n = new Uint8Array(2);
  try {
    if (typeof crypto !== "undefined" && (crypto as unknown as { getRandomValues?: (a: Uint8Array) => void }).getRandomValues) {
      (crypto as unknown as { getRandomValues: (a: Uint8Array) => void }).getRandomValues(n);
      // avoid 0x00 0x00 which could be ambiguous
      if (n[0] === 0 && n[1] === 0) n[1] = 1;
      return n;
    }
  } catch {
    // fallthrough
  }
  n[0] = Math.floor(Math.random() * 256);
  n[1] = Math.floor(Math.random() * 256);
  if (n[0] === 0 && n[1] === 0) n[1] = 1;
  return n;
}

function expandFcuk(raw: string, targetLen: number, keyBytes: Uint8Array, nonce: Uint8Array): string {
  if (targetLen <= 0) return raw;
  if (targetLen < raw.length) return raw.slice(0, targetLen);
  if (targetLen === raw.length) return raw;
  let filler = "";
  let state = 0x3456789a >>> 0;
  for (const b of keyBytes) state = (state * 131 + b) >>> 0;
  for (const b of nonce) state = (state * 131 + b) >>> 0;
  for (let i = 0; i < raw.length; i++) state = (state * 131 + raw.charCodeAt(i)) >>> 0;
  const alph = shuffledAlphabet(keyBytes);
  let counter = 0;
  while (raw.length + filler.length < targetLen) {
    state = Math.imul(state ^ (0x9e3779b9 + counter++ * 0x85ebca6b), 0x27d4eb2d) >>> 0;
    state ^= state >>> 13;
    state = Math.imul(state, 0xc2b2ae35) >>> 0;
    filler += alph[state % 64];
  }
  return raw + filler;
}

function fcukEncode(plain: string, keyStr: string, desiredLen: number): string {
  const keyBytes = deriveKeyBytes(keyStr);
  const alph = shuffledAlphabet(keyBytes);
  const plainBytes = new TextEncoder().encode(plain);
  const plainLen = plainBytes.length;
  if (plainLen > 65535) throw new Error("FCUK: input too large (max 64KB)");
  const nonce = randomNonce();
  const ks = keystream(keyBytes, nonce, plainLen);
  const cipher = new Uint8Array(plainLen);
  for (let i = 0; i < plainLen; i++) cipher[i] = plainBytes[i] ^ ks[i];
  const permuted = permuteBytes(cipher, keyBytes);
  // payload: [len_lo, len_hi, nonce0, nonce1, ...permuted]
  const payload = new Uint8Array(4 + plainLen);
  payload[0] = plainLen & 0xff;
  payload[1] = (plainLen >>> 8) & 0xff;
  payload[2] = nonce[0];
  payload[3] = nonce[1];
  payload.set(permuted, 4);
  // std b64 without padding, then translate to custom alphabet
  const std = bytesToBase64(payload).replace(/=+$/, "");
  let custom = translateToCustom(std, alph);
  // expand to desiredLen with keyed filler (never “====” spam)
  if (desiredLen && desiredLen > 0) {
    custom = expandFcuk(custom, desiredLen, keyBytes, nonce);
  }
  return custom;
}

function fcukDecode(encoded: string, keyStr: string): string {
  const clean = encoded.replace(/\s+/g, "");
  if (!clean) return "";
  const keyBytes = deriveKeyBytes(keyStr);
  const alph = shuffledAlphabet(keyBytes);
  // translate custom -> std (entire input including filler — filler decodes to extra bytes we will ignore)
  let std = "";
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const idx = alph.indexOf(ch);
    if (idx === -1) throw new Error(`invalid FCUK char '${ch}' at ${i}`);
    std += STD_B64[idx];
  }
  // pad to multiple of 4 for atob
  std += "=".repeat((4 - (std.length % 4)) % 4);
  const allBytes = base64ToBytes(std);
  if (allBytes.length < 4) throw new Error("FCUK: too short");
  const plainLen = allBytes[0] | (allBytes[1] << 8);
  if (plainLen > 65535) throw new Error("FCUK: corrupt length");
  // need at least header+nonce+cipher
  if (allBytes.length < 4 + plainLen) {
    const need = Math.ceil((4 + plainLen) * 4 / 3);
    throw new Error(`FCUK: truncated — need ≥${need} chars for ${plainLen}B payload, got ${clean.length}`);
  }
  const nonce = allBytes.slice(2, 4);
  const permuted = allBytes.slice(4, 4 + plainLen);
  const cipher = unpermuteBytes(permuted, keyBytes);
  const ks = keystream(keyBytes, nonce, plainLen);
  const plainBytes = new Uint8Array(plainLen);
  for (let i = 0; i < plainLen; i++) plainBytes[i] = cipher[i] ^ ks[i];
  return decodeToUtf8(plainBytes);
}

// ──────────────────────────────────────────────────────────────────────────────

function wrapLines(str: string, width: WrapOption): string {
  if (width === 0 || !str) return str;
  const clean = str.replace(/\s+/g, "");
  const re = new RegExp(`.{1,${width}}`, "g");
  return clean.match(re)?.join("\n") ?? str;
}

function fitLength(raw: string, len: LengthOption, encoding: Encoding): string {
  if (len === 0 || !raw) return raw;
  const clean = raw.replace(/\s+/g, "");
  if (clean.length === len) return clean;
  if (clean.length > len) return clean.slice(0, len);
  const pad = encoding === "hex" || encoding === "octal" ? "0" : encoding === "url" || encoding === "utf8" ? "·" : "=";
  return clean.padEnd(len, pad);
}

const DECODE_ERRORS: Record<string, string> = {
  utf8: "NOT VALID UTF-8",
  base64: "INVALID BASE64 — CHECK PADDING",
  base64url: "INVALID BASE64URL",
  hex: "INVALID HEX — ONLY 0-9 A-F",
  base32: "INVALID BASE32 — ONLY A-Z 2-7 + PADDING",
  octal: "INVALID OCTAL — ONLY 0-7 (000-377)",
  url: "INVALID URL-ENCODING",
  fcuk: "INVALID FCUK-77 — CHECK KEY & INPUT",
};

function decodeToUtf8(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return decodeURIComponent(escape(out));
}

export function Base64Machine() {
  const [input, setInput] = useState("");
  const [encoding, setEncoding] = useState<Encoding>("fcuk");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [wrap, setWrap] = useState<WrapOption>(0);
  const [outLen, setOutLen] = useState<LengthOption>(0);
  const [customLen, setCustomLen] = useState<string>("");
  const [fcukKey, setFcukKey] = useState("");
  const [copied, setCopied] = useState(false);

  const isFcuk = encoding === "fcuk";
  const isWrappable = encoding === "base64" || encoding === "base64url" || encoding === "base32" || encoding === "fcuk";

  const fcukMinimal = useMemo(() => {
    if (!isFcuk || mode !== "encode") return 0;
    try {
      return Math.ceil((4 + new TextEncoder().encode(input).length) * 4 / 3);
    } catch {
      return 0;
    }
  }, [input, isFcuk, mode]);

  // effective desired length: customLen (any number) overrides preset, 0 = FULL
  const effectiveLen = useMemo(() => {
    if (isFcuk && customLen.trim() !== "") {
      const n = Number(customLen.trim());
      if (Number.isFinite(n) && n >= 0 && n <= 4096) return Math.floor(n);
      return outLen;
    }
    // for non-fcuk, allow customLen as well for any-length without spam
    if (customLen.trim() !== "" && mode === "encode") {
      const n = Number(customLen.trim());
      if (Number.isFinite(n) && n >= 0 && n <= 4096) return Math.floor(n);
    }
    return outLen;
  }, [customLen, outLen, isFcuk, mode]);

  const output = useMemo(() => {
    try {
      if (mode === "encode") {
        // FCUK-77 path — hard to crack, any length, no “====” spam
        if (encoding === "fcuk") {
          const raw = fcukEncode(input, fcukKey, effectiveLen);
          const result = wrapLines(raw, wrap);
          return { value: result, error: null as string | null };
        }
        const bytes = new TextEncoder().encode(input);
        let raw: string;
        if (encoding === "base64") raw = bytesToBase64(bytes);
        else if (encoding === "base64url") raw = bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        else if (encoding === "base32") raw = bytesToBase32(bytes);
        else if (encoding === "hex") raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        else if (encoding === "octal") raw = bytesToOctal(bytes);
        else if (encoding === "url") raw = encodeURIComponent(input);
        else raw = input;

        // for non-fcuk, if custom length requested, expand without “====” spam when fcuk-like? Use fitLength but for demo use keyed filler for base-family too when customLen present
        let fitted: string;
        if (customLen.trim() !== "" && effectiveLen > 0 && encoding !== "hex" && encoding !== "octal" && encoding !== "url" && encoding !== "utf8") {
          // use fcuk-style expansion (keyed pseudo-random, not “====”) for any base
          const keyBytes = deriveKeyBytes(fcukKey || DEFAULT_FCUK_KEY);
          // reuse expandFcuk logic with dummy nonce derived from raw
          const dummyNonce = new Uint8Array([raw.length & 0xff, (raw.length >> 8) & 0xff]);
          const clean = raw.replace(/\s+/g, "");
          if (clean.length >= effectiveLen) fitted = clean.slice(0, effectiveLen);
          else {
            const alph = shuffledAlphabet(keyBytes);
            let filler = "";
            let state = 0;
            for (const b of keyBytes) state = (state * 131 + b) >>> 0;
            for (let i = 0; i < clean.length; i++) state = (state * 131 + clean.charCodeAt(i)) >>> 0;
            for (const b of dummyNonce) state = (state * 131 + b) >>> 0;
            let counter = 0;
            while (clean.length + filler.length < effectiveLen) {
              state = Math.imul(state ^ (0x9e3779b9 + counter++ * 0x85ebca6b), 0x27d4eb2d) >>> 0;
              state ^= state >>> 13;
              filler += alph[state % 64];
            }
            fitted = clean + filler;
          }
        } else {
          fitted = fitLength(raw, effectiveLen as LengthOption, encoding);
        }
        const result = isWrappable ? wrapLines(fitted, wrap) : fitted;
        return { value: result, error: null as string | null };
      }
      // decode
      if (encoding === "fcuk") {
        const decoded = fcukDecode(input, fcukKey);
        return { value: decoded, error: null };
      }
      let bytes: Uint8Array;
      if (encoding === "base64") bytes = base64ToBytes(input.trim().replace(/\s+/g, ""));
      else if (encoding === "base64url") {
        const padded = input.trim().replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
        bytes = base64ToBytes(padded + "=".repeat((4 - (padded.length % 4)) % 4));
      } else if (encoding === "hex") bytes = hexToBytes(input);
      else if (encoding === "base32") bytes = base32ToBytes(input);
      else if (encoding === "octal") bytes = octalToBytes(input);
      else if (encoding === "url") bytes = new TextEncoder().encode(decodeURIComponent(input));
      else bytes = new TextEncoder().encode(input);
      return { value: decodeToUtf8(bytes), error: null };
    } catch (e) {
      const msg = DECODE_ERRORS[encoding] ?? (e as Error).message;
      return { value: "", error: msg };
    }
  }, [input, encoding, mode, wrap, effectiveLen, customLen, fcukKey, isWrappable]);

  const info = useMemo(() => {
    if (!input || !output.value) return null;
    const inBytes = new TextEncoder().encode(input).length;
    const cleanOut = output.value.replace(/\s+/g, "");
    return { inBytes, outChars: cleanOut.length, outBytes: new Blob([output.value]).size };
  }, [input, output]);

  const copy = async () => {
    if (!output.value) return;
    await navigator.clipboard.writeText(output.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ENCODING_OPTIONS: { value: Encoding; label: string; hint: string }[] = [
    { value: "fcuk", label: "FCUK-77", hint: "★" },
    { value: "base64", label: "Base64", hint: "64" },
    { value: "base64url", label: "Base64URL", hint: "64url" },
    { value: "base32", label: "Base32", hint: "32" },
    { value: "hex", label: "Hex", hint: "16" },
    { value: "octal", label: "Octal", hint: "8" },
    { value: "url", label: "URL", hint: "%" },
    { value: "utf8", label: "UTF8", hint: "raw" },
  ];

  return (
    <ToolShell
      crumb="BASE64-MACHINE"
      title="The machine."
      tagline={isFcuk ? "FCUK-77 NOVA · keyed shuffle + XOR stream + permutation · any length, zero “====” spam." : "Base8 · Base16 (Hex) · Base32 · Base64 & URL — encode / decode, all in your tab."}
    >
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(
            [
              ["encode", "Encode"],
              ["decode", "Decode"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "rounded-md border-2 border-ink px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                mode === value ? "bg-ink text-surface shadow-brutal-sm" : "bg-surface-muted hover:bg-yellow/30",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {ENCODING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEncoding(opt.value)}
              title={opt.value === "fcuk" ? "FCUK-77 NOVA — hard-to-crack, variable length, no padding spam" : `${opt.label} — Base${opt.hint}`}
              className={cn(
                "rounded-md border-2 border-ink px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition-[background-color,box-shadow] duration-200 ease-brutal",
                encoding === opt.value
                  ? opt.value === "fcuk"
                    ? "bg-yellow text-ink shadow-brutal-sm ring-2 ring-ink"
                    : "bg-yellow text-ink shadow-brutal-sm"
                  : "bg-surface-muted hover:bg-yellow/30",
              )}
            >
              {opt.label}
              <span className="ml-1 opacity-60">·{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {isFcuk && (
        <div className="mt-4 rounded-lg border-[3px] border-ink bg-yellow/20 p-4 shadow-brutal-sm">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> FCUK-77 NOVA — how it works
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-ink/70">
            <span className="font-bold text-ink">1. Key →</span> 32-byte key via FNV + xorshift diffusion (3 rounds).{" "}
            <span className="font-bold text-ink">2. Shuffle →</span> 64-char alphabet Fisher-Yates shuffled by key (not STD <code className="rounded bg-ink px-1 text-yellow">A-Za-z0-9+/</code>).{" "}
            <span className="font-bold text-ink">3. Nonce →</span> 2-byte random IV per encode (embedded in payload).{" "}
            <span className="font-bold text-ink">4. Stream →</span> XOR with keystream (<code>key + nonce → PRNG</code>).{" "}
            <span className="font-bold text-ink">5. Permute →</span> Fisher-Yates byte permutation keyed.{" "}
            <span className="font-bold text-ink">6. Encode →</span> custom b64 <em>without</em> <code>=</code> padding.{" "}
            <span className="font-bold text-ink">7. Expand →</span> if you ask for <em>any</em> N, filler is keyed pseudo-random (not <code>====</code> spam) — decode strips it via header.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-surface px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest">
              <KeyRound className="h-3.5 w-3.5" /> Key
            </span>
            <input
              value={fcukKey}
              onChange={(e) => setFcukKey(e.target.value)}
              placeholder={`passphrase (default: ${DEFAULT_FCUK_KEY.slice(0, 18)}…)`}
              spellCheck={false}
              className="min-w-[220px] flex-1 rounded-md border-2 border-ink bg-surface px-3 py-1.5 font-mono text-xs text-ink outline-none placeholder:text-ink/40 focus:border-yellow"
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink/50">Same key to decode. Leave empty = default.</span>
          </div>
        </div>
      )}

      {mode === "encode" && (
        <div className="mt-4 flex flex-col gap-2 rounded-md border-2 border-ink bg-surface-muted p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
              Output chars:
            </span>
            {([0, 8, 16, 32, 64] as LengthOption[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setOutLen(n);
                  setCustomLen(n === 0 ? "" : String(n));
                }}
                className={cn(
                  "rounded-md border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors",
                  effectiveLen === n && customLen === String(n === 0 ? "" : n) || (n === 0 && effectiveLen === 0 && customLen === "")
                    ? "bg-yellow text-ink shadow-brutal-sm"
                    : "bg-surface hover:bg-yellow/30",
                )}
                title={n === 0 ? "Full length" : `Exactly ${n} characters`}
              >
                {n === 0 ? "FULL" : n}
              </button>
            ))}
            <span className="hidden items-center gap-2 sm:flex">
              <span className="font-mono text-[11px] font-bold text-ink/30">or</span>
              <input
                value={customLen}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setCustomLen(v);
                  if (v === "") setOutLen(0);
                  else {
                    const n = Number(v);
                    if ([8, 16, 32, 64].includes(n)) setOutLen(n as LengthOption);
                    else setOutLen(0);
                  }
                }}
                placeholder="any N…"
                className="w-[90px] rounded-md border-2 border-ink bg-surface px-2 py-1 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
              />
              <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">1–4096</span>
            </span>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-ink/40 sm:inline">
              {isFcuk ? "FCUK: any N, keyed filler — zero “=” spam" : "Exact length — keyed filler, not “===”"}
            </span>
          </div>
          {/* mobile custom input */}
          <div className="flex items-center gap-2 sm:hidden">
            <input
              value={customLen}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                setCustomLen(v);
                if (v === "") setOutLen(0);
                else {
                  const n = Number(v);
                  if ([8, 16, 32, 64].includes(n)) setOutLen(n as LengthOption);
                  else setOutLen(0);
                }
              }}
              placeholder="Custom N (1–4096)…"
              className="flex-1 rounded-md border-2 border-ink bg-surface px-3 py-1.5 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
            />
          </div>
          {isWrappable && (
            <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink/10 pt-2">
              <span className="px-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
                Wrap per line:
              </span>
              {([0, 64, 76, 32, 16, 8] as WrapOption[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWrap(w)}
                  className={cn(
                    "rounded-md border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors",
                    wrap === w ? "bg-ink text-surface" : "bg-surface hover:bg-yellow/30",
                  )}
                >
                  {w === 0 ? "OFF" : w}
                </button>
              ))}
              <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-widest text-ink/40 sm:inline">
                Visual line break every N chars (RFC 2045 = 76)
              </span>
            </div>
          )}
          {effectiveLen !== 0 && isFcuk && (
            <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/60">
              {effectiveLen < fcukMinimal ? (
                <>
                  ⚠ {effectiveLen} &lt; min {fcukMinimal} for this input — will <span className="text-red">truncate</span> and decode will be lossy (need ≥{fcukMinimal}).
                </>
              ) : (
                <>
                  ⚡ FCUK-77 will generate <span className="text-ink">{effectiveLen} chars</span> exactly (min {fcukMinimal} for this input) — if payload needs less, keyed pseudo-random filler is appended (no <code className="rounded bg-ink px-1 text-yellow">=</code> spam). Same key decodes and strips filler via header.
                </>
              )}
            </p>
          )}
          {effectiveLen !== 0 && !isFcuk && (
            <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink/50">
              ⚠ Fixed {effectiveLen} chars — {effectiveLen < 16 ? "truncates" : "pads with keyed filler"} (not <code className="rounded bg-ink px-1 py-0.5 text-yellow">====</code>). Decode may be lossy if truncated.
            </p>
          )}
        </div>
      )}

      {isFcuk && mode === "decode" && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border-2 border-ink bg-surface-muted p-2">
          <span className="inline-flex items-center gap-1 px-2 font-mono text-[11px] font-bold uppercase tracking-widest text-ink/60">
            <KeyRound className="h-3.5 w-3.5" /> Key for decode:
          </span>
          <input
            value={fcukKey}
            onChange={(e) => setFcukKey(e.target.value)}
            placeholder="same passphrase used to encode"
            spellCheck={false}
            className="min-w-[220px] flex-1 rounded-md border-2 border-ink bg-surface px-3 py-1.5 font-mono text-xs text-ink outline-none placeholder:text-ink/40 focus:border-yellow"
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] {mode === "encode" ? "Plain input" : "Encoded input"}
            <Binary className="h-4 w-4" aria-hidden="true" />
          </h2>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={mode === "encode" ? "Text to encode…" : "Encoded string to decode…"}
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-3 font-mono text-xs leading-relaxed text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput("OpenTab — beep boop")}
              className="uppercase"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
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
          </div>
        </section>

        <section className="flex flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [02] {mode === "encode" ? "Encoded output" : "Decoded output"}
          </h2>
          <textarea
            readOnly
            value={output.value}
            spellCheck={false}
            placeholder="Result lands here…"
            className="mt-4 h-72 w-full resize-y rounded-md border-2 border-ink bg-ink p-3 font-mono text-xs leading-relaxed text-green outline-none placeholder:text-paper/30"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void copy()}
              disabled={!output.value}
              className="uppercase"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full border-2 border-ink",
                  output.error ? "bg-red" : output.value ? "bg-green" : "bg-ink/20",
                )}
              />
              {output.error
                ? `[ ERR ] ${output.error}`
                : info
                  ? `[ OK ] ${info.inBytes}B → ${info.outChars} chars · ${info.outBytes}B`
                  : "[ IDLE ] WAITING FOR INPUT"}
            </span>
          </div>
        </section>
      </div>

      {output.error && (
        <p className="mt-6 rounded-md border-[3px] border-ink bg-red p-4 font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-brutal-sm">
          [ ERR ] {output.error}
        </p>
      )}

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        {isFcuk
          ? "FCUK-77 NOVA: in-tab, keyed, non-deterministic (random nonce) — same plaintext → different ciphertext every time. No payload leaves your tab."
          : "Pure in-browser conversion — no payloads leave your tab. Not a network in sight."}
      </p>
    </ToolShell>
  );
}
