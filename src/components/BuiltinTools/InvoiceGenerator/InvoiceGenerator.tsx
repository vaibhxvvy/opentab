import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, FileDown, Maximize2, Plus, Printer, Receipt, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import qrcode from "qrcode-generator";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

interface LineItem {
  id: number;
  desc: string;
  qty: string;
  rate: string;
}

type TemplateId = "brutal" | "minimal" | "classic" | "zebra" | "pop" | "receipt" | "invert" | "ledger" | "blueprint";

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: "brutal", name: "Brutal", desc: "Black band, thick rules, mono numbers." },
  { id: "minimal", name: "Minimal", desc: "Light rules, whitespace, small caps." },
  { id: "classic", name: "Classic", desc: "Serif type, double rules, centered header." },
  { id: "zebra", name: "Zebra", desc: "Black band, striped rows that alternate." },
  { id: "pop", name: "Pop", desc: "Yellow band, red total box, loud." },
  { id: "receipt", name: "Receipt", desc: "Centered, dashed rules, cash-register strip." },
  { id: "invert", name: "Invert", desc: "Black page, light type, yellow total." },
  { id: "ledger", name: "Ledger", desc: "Ruled columns, mono type, bookkeeping." },
  { id: "blueprint", name: "Blueprint", desc: "Grid paper, blue ink, drafting table." },
];

const CODES: { id: "none" | "barcode" | "qr"; name: string }[] = [
  { id: "none", name: "None" },
  { id: "barcode", name: "Barcode" },
  { id: "qr", name: "QR" },
];

const A4_W = 595;
const A4_H = 842;

const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_7.5rem] items-center gap-2";

let nextId = 1;

const CURRENCIES = ["$", "€", "£", "₹", "¥"];

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

const CHAR_MAP: Record<string, string> = {
  "₹": "Rs.",
  "–": "-",
  "—": "-",
  "’": "'",
  "‘": "'",
  "“": '"',
  "”": '"',
  "…": "...",
  "×": "x",
  "·": ".",
  "•": "*",
  "\r": "",
  "\t": " ",
};

const sanitize = (s: string) =>
  s
    .split("")
    .map((c) => CHAR_MAP[c] ?? (c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 255 ? c : "?"))
    .join("");

const CODE39: Record<string, number[]> = {
  "0": [0, 0, 0, 1, 1, 0, 1, 0, 0],
  "1": [1, 0, 0, 1, 0, 0, 0, 0, 1],
  "2": [0, 0, 1, 1, 0, 0, 0, 0, 1],
  "3": [1, 0, 1, 1, 0, 0, 0, 0, 0],
  "4": [0, 0, 0, 1, 1, 0, 0, 0, 1],
  "5": [1, 0, 0, 1, 1, 0, 0, 0, 0],
  "6": [0, 0, 1, 1, 1, 0, 0, 0, 0],
  "7": [0, 0, 0, 1, 0, 0, 1, 0, 1],
  "8": [1, 0, 0, 1, 0, 0, 1, 0, 0],
  "9": [0, 0, 1, 1, 0, 0, 1, 0, 0],
  A: [1, 0, 0, 0, 0, 1, 0, 0, 1],
  B: [0, 0, 1, 0, 0, 1, 0, 0, 1],
  C: [1, 0, 1, 0, 0, 1, 0, 0, 0],
  D: [0, 0, 0, 0, 1, 1, 0, 0, 1],
  E: [1, 0, 0, 0, 1, 1, 0, 0, 0],
  F: [0, 0, 1, 0, 1, 1, 0, 0, 0],
  G: [0, 0, 0, 0, 0, 1, 1, 0, 1],
  H: [1, 0, 0, 0, 0, 1, 1, 0, 0],
  I: [0, 0, 1, 0, 0, 1, 1, 0, 0],
  J: [0, 0, 0, 0, 1, 1, 1, 0, 0],
  K: [1, 0, 0, 0, 0, 0, 0, 1, 1],
  L: [0, 0, 1, 0, 0, 0, 0, 1, 1],
  M: [1, 0, 1, 0, 0, 0, 0, 1, 0],
  N: [0, 0, 0, 0, 1, 0, 0, 1, 1],
  O: [1, 0, 0, 0, 1, 0, 0, 1, 0],
  P: [0, 0, 1, 0, 1, 0, 0, 1, 0],
  Q: [0, 0, 0, 0, 0, 0, 1, 1, 1],
  R: [1, 0, 0, 0, 0, 0, 1, 1, 0],
  S: [0, 0, 1, 0, 0, 0, 1, 1, 0],
  T: [0, 0, 0, 0, 1, 0, 1, 1, 0],
  U: [1, 1, 0, 0, 0, 0, 0, 0, 1],
  V: [0, 1, 1, 0, 0, 0, 0, 0, 1],
  W: [1, 1, 1, 0, 0, 0, 0, 0, 0],
  X: [0, 1, 0, 0, 1, 0, 0, 0, 1],
  Y: [1, 1, 0, 0, 1, 0, 0, 0, 0],
  Z: [0, 1, 1, 0, 1, 0, 0, 0, 0],
  "-": [0, 1, 0, 0, 0, 0, 1, 0, 1],
  ".": [1, 1, 0, 0, 0, 0, 1, 0, 0],
  " ": [0, 1, 1, 0, 0, 0, 1, 0, 0],
  "*": [0, 1, 0, 1, 0, 1, 0, 0, 0],
  $: [0, 1, 0, 1, 0, 1, 0, 1, 0],
  "/": [0, 1, 0, 1, 0, 0, 1, 0, 1],
  "+": [0, 1, 0, 0, 1, 0, 1, 0, 1],
  "%": [0, 0, 1, 0, 1, 0, 1, 0, 1],
};

const code39Bits = (input: string): boolean[] => {
  const s = "*" + input.toUpperCase().replace(/[^A-Z0-9 .\-$/+%]/g, " ") + "*";
  const bits: boolean[] = [];
  for (let i = 0; i < s.length; i++) {
    const p = CODE39[s[i]] ?? CODE39[" "];
    if (i > 0) bits.push(false);
    for (const b of p) bits.push(b === 1);
  }
  return bits;
};

export function InvoiceGenerator() {
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [number, setNumber] = useState("FP-001");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");
  const [currency, setCurrency] = useState("$");
  const [taxPct, setTaxPct] = useState("0");
  const [discountPct, setDiscountPct] = useState("0");
  const [notes, setNotes] = useState("");
  const [template, setTemplate] = useState<TemplateId>("brutal");
  const [code, setCode] = useState<"none" | "barcode" | "qr">("none");
  const [items, setItems] = useState<LineItem[]>([
    { id: nextId++, desc: "", qty: "1", rate: "" },
  ]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const manualZoomRef = useRef(false);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => {
      if (manualZoomRef.current) return;
      const w = el.clientWidth - 24;
      const h = el.clientHeight - 24;
      const fit = Math.min(1, Math.max(0.15, Math.min(w / A4_W, h / A4_H)));
      setScale((s) => (Math.abs(fit - s) > 0.05 ? fit : s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stepZoom = (d: number) => {
    manualZoomRef.current = true;
    setScale((s) => Math.min(1.5, Math.max(0.25, Math.round((s + d) * 100) / 100)));
  };

  const clickFit = () => {
    manualZoomRef.current = false;
    const el = previewRef.current;
    if (el)
      setScale(Math.min(1, Math.max(0.15, Math.min((el.clientWidth - 24) / A4_W, (el.clientHeight - 24) / A4_H))));
  };

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0),
    [items],
  );
  const discount = (subtotal * (parseFloat(discountPct) || 0)) / 100;
  const taxable = subtotal - discount;
  const tax = (taxable * (parseFloat(taxPct) || 0)) / 100;
  const total = taxable + tax;
  const money = (v: number) => `${currency} ${v.toFixed(2)}`;

  const setItem = (id: number, patch: Partial<LineItem>) =>
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeItem = (id: number) => setItems((rows) => rows.filter((r) => r.id !== id));

  const addItem = () => setItems((rows) => [...rows, { id: nextId++, desc: "", qty: "1", rate: "" }]);

  const hasContent = items.some((it) => it.desc.trim() && (it.qty || it.rate));

  const buildPdf = async (): Promise<Blob> => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    const ink = rgb(0.07, 0.07, 0.07);
    const gray = rgb(0.42, 0.42, 0.42);
    const midGray = rgb(0.58, 0.58, 0.58);
    const paper = rgb(0.96, 0.94, 0.91);
    const zebraFill = rgb(0.96, 0.94, 0.91);
    const yellow = rgb(1, 0.847, 0.302);
    const red = rgb(1, 0.353, 0.373);
    const blue = rgb(0.302, 0.553, 1);
    const lightBlue = rgb(0.82, 0.89, 1);

    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvB = await doc.embedFont(StandardFonts.HelveticaBold);
    const mono = await doc.embedFont(StandardFonts.Courier);
    const monoB = await doc.embedFont(StandardFonts.CourierBold);
    const times = await doc.embedFont(StandardFonts.TimesRoman);
    const timesB = await doc.embedFont(StandardFonts.TimesRomanBold);
    const timesI = await doc.embedFont(StandardFonts.TimesRomanItalic);

    const M = 56;
    const W = 612 - M * 2;
    const pdfCur = currency === "₹" ? "Rs." : currency;
    const pm = (v: number) => `${pdfCur} ${v.toFixed(2)}`;

    const visible = items.filter((it) => it.desc.trim() || it.qty || it.rate).slice(0, 12);
    const sub = visible.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0);
    const disc = (sub * (parseFloat(discountPct) || 0)) / 100;
    const taxAmt = ((sub - disc) * (parseFloat(taxPct) || 0)) / 100;
    const tot = sub - disc + taxAmt;
    const num = (sanitize(number.trim()) || "FP-001").toUpperCase();
    const sFrom = sanitize(fromName).trim() || "Your company";
    const sFromEmail = sanitize(fromEmail).trim();
    const sFromAddr = sanitize(fromAddress).split("\n").slice(0, 3);
    const sClient = sanitize(clientName).trim() || "Client";
    const sClientEmail = sanitize(clientEmail).trim();
    const sClientAddr = sanitize(clientAddress).split("\n").slice(0, 3);
    const sNotes = sanitize(notes).trim();
    const sTerms = sanitize(terms).trim();
    const codeVal = num || "FP-001";

    const right = (text: string, size: number, f: typeof mono, x: number, y: number, color = ink) =>
      page.drawText(text, { x: x - f.widthOfTextAtSize(text, size), y, size, font: f, color });

    const fitRight = (
      text: string,
      size: number,
      f: typeof mono,
      rightX: number,
      y: number,
      maxW: number,
      color: typeof ink = ink,
    ) => {
      let s = size;
      let t = text;
      while (s > 6 && f.widthOfTextAtSize(t, s) > maxW) s -= 0.5;
      page.drawText(t, { x: rightX - f.widthOfTextAtSize(t, s), y, size: s, font: f, color });
    };

    const drawBarcode = (rightX: number, y: number, color: typeof ink = ink) => {
      const bits = code39Bits(codeVal);
      const narrow = 1.4;
      const wide = 2.8;
      let total = 0;
      bits.forEach((b) => (total += b ? wide : narrow));
      let x = rightX - total;
      bits.forEach((b) => {
        if (b) page.drawRectangle({ x, y, width: wide, height: 34, color });
        x += b ? wide : narrow;
      });
      const label = codeVal;
      page.drawText(label, { x: rightX - mono.widthOfTextAtSize(label, 7) / 2, y: y - 12, size: 7, font: mono, color });
    };

    const drawQr = (rightX: number, y: number, color: typeof ink = ink) => {
      const q = qrcode(0, "M");
      q.addData(codeVal);
      q.make();
      const n = q.getModuleCount();
      const ms = 2.6;
      const total = n * ms;
      let x = rightX - total;
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (q.isDark(r, c))
            page.drawRectangle({ x: x + c * ms, y: y + (n - 1 - r) * ms, width: ms, height: ms, color });
    };

    const drawCode = (rightX = M + W, y = 58, color: typeof ink = ink) => {
      if (code === "barcode") drawBarcode(rightX, y + 6, color);
      else if (code === "qr") drawQr(rightX, y, color);
    };

    const drawTotals = (tx: number, ty: number, style: "band" | "plain" | "boxed", colors: { label: typeof gray; box: typeof ink; boxText: typeof paper; line: typeof gray }) => {
      page.drawText("SUBTOTAL", { x: tx, y: ty, size: 9, font: helvB, color: colors.label });
      right(pm(sub), 9, mono, M + W, ty);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${sanitize(discountPct)}%)`, { x: tx, y: ty, size: 9, font: helvB, color: colors.label });
        right(`-${pm(disc)}`, 9, mono, M + W, ty);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${sanitize(taxPct)}%)`, { x: tx, y: ty, size: 9, font: helvB, color: colors.label });
        right(pm(taxAmt), 9, mono, M + W, ty);
      }
      if (style === "band") {
        ty -= 30;
        page.drawRectangle({ x: tx, y: ty - 10, width: W * 0.42, height: 30, color: colors.box });
        page.drawText("TOTAL", { x: tx + 10, y: ty, size: 10, font: helvB, color: colors.boxText });
        right(pm(tot), 11, monoB, M + W, ty, colors.boxText);
      } else if (style === "boxed") {
        ty -= 34;
        page.drawRectangle({
          x: tx - 8,
          y: ty - 12,
          width: W * 0.42 + 16,
          height: 34,
          borderColor: ink,
          borderWidth: 1,
        });
        page.drawText("TOTAL", { x: tx, y: ty, size: 12, font: timesB, color: ink });
        right(pm(tot), 12, timesB, M + W, ty);
      } else {
        ty -= 30;
        page.drawLine({ start: { x: tx, y: ty + 12 }, end: { x: M + W, y: ty + 12 }, thickness: 0.5, color: colors.line });
        page.drawText("TOTAL", { x: tx, y: ty, size: 12, font: helvB, color: ink });
        right(pm(tot), 11, monoB, M + W, ty);
      }
      return ty;
    };

    const drawNotes = (ty: number, f: typeof helv) => {
      if (sNotes) {
        page.drawText("NOTES", { x: M, y: ty - 58, size: 8, font: helvB, color: gray });
        page.drawText(sNotes, { x: M, y: ty - 70, size: 9, font: f, color: ink, maxWidth: W * 0.9 });
      }
    };

    const drawFooter = (f: typeof helv, color = gray) => {
      page.drawText("FP INVOICES — no invoice service counted this one. generated locally by opentab", {
        x: M,
        y: 40,
        size: 7,
        font: f,
        color,
      });
    };

    const drawTable = (
      headY: number,
      style: "thick" | "hairline" | "double" | "band",
      rowFill: ((i: number, y: number) => void) | null,
    ) => {
      if (style === "band") {
        page.drawRectangle({ x: M, y: headY - 14, width: W, height: 22, color: ink });
      }
      page.drawText("DESCRIPTION", { x: M + (style === "band" ? 6 : 0), y: headY, size: 8, font: helvB, color: style === "band" ? paper : gray });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: helvB, color: style === "band" ? paper : gray });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: helvB, color: style === "band" ? paper : gray });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: helvB, color: style === "band" ? paper : gray });
      if (style === "thick") page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 2, color: ink });
      else if (style === "hairline") page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 0.5, color: gray });
      else if (style === "double") {
        page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 0.7, color: ink });
        page.drawLine({ start: { x: M, y: headY - 11 }, end: { x: M + W, y: headY - 11 }, thickness: 0.7, color: ink });
      }

      let rowY = headY - 26;
      visible.forEach((it, i) => {
        if (rowFill) rowFill(i, rowY);
        page.drawText(sanitize(it.desc), { x: M + (style === "band" ? 6 : 0), y: rowY, size: 10, font: helv, color: ink, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, mono, M + W * 0.72, rowY, W * 0.12);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY, W * 0.18);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, M + W, rowY, W * 0.1);
        if (style !== "band")
          page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.5, color: midGray });
        rowY -= 22;
      });
      if (style === "thick" || style === "band")
        page.drawLine({ start: { x: M, y: rowY - 4 }, end: { x: M + W, y: rowY - 4 }, thickness: 2, color: ink });
      else if (style === "hairline") page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 1, color: ink });
      else if (style === "double")
        page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 0.7, color: ink });
      return rowY;
    };

    const drawBand = (color: typeof ink, textColor: typeof paper) => {
      page.drawRectangle({ x: 0, y: 792 - 76, width: 612, height: 76, color });
      page.drawText("INVOICE", { x: M, y: 792 - 50, size: 26, font: helvB, color: textColor });
      page.drawText(num, { x: 612 - M - monoB.widthOfTextAtSize(num, 13), y: 792 - 46, size: 13, font: monoB, color: textColor });
    };

let codeX = M + W;
    let codeColor: typeof ink = ink;

    if (template === "minimal") {
      page.drawText("INVOICE", { x: M, y: 736, size: 9, font: helv, color: midGray });
      right(num, 9, mono, 612 - M, 736, midGray);
      page.drawLine({ start: { x: M, y: 722 }, end: { x: M + W, y: 722 }, thickness: 0.5, color: midGray });

      page.drawText("FROM", { x: M, y: 696, size: 8, font: helvB, color: midGray });
      page.drawText(sFrom.toUpperCase(), { x: M, y: 682, size: 13, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: 668, size: 9, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: 654 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = 696 - sFromAddr.length * 12;
      page.drawText("BILL TO", { x: cx, y: cTop, size: 8, font: helvB, color: midGray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 11, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: gray });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 26, size: 9, font: mono, color: gray });

      const rowY = drawTable(Math.min(616, dueY - (sTerms ? 36 : 16)), "hairline", null);
      const ty = drawTotals(M + W * 0.58, rowY - 36, "plain", { label: midGray, box: ink, boxText: paper, line: midGray });
      drawNotes(ty, helv);
      drawFooter(helv, midGray);
    } else if (template === "classic") {
      page.drawLine({ start: { x: M, y: 752 }, end: { x: M + W, y: 752 }, thickness: 0.7, color: ink });
      page.drawLine({ start: { x: M, y: 746 }, end: { x: M + W, y: 746 }, thickness: 0.7, color: ink });

      const title = "INVOICE";
      page.drawText(title, { x: 306 - timesB.widthOfTextAtSize(title, 18) / 2, y: 716, size: 18, font: timesB, color: ink });
      page.drawText(sFrom.toUpperCase(), { x: 306 - timesI.widthOfTextAtSize(sFrom.toUpperCase(), 10) / 2, y: 696, size: 10, font: timesI, color: ink });
      if (sFromEmail)
        page.drawText(sFromEmail, { x: 306 - times.widthOfTextAtSize(sFromEmail, 8) / 2, y: 684, size: 8, font: times, color: gray });

      const cx = M + W * 0.55;
      page.drawText("FROM", { x: M, y: 652, size: 9, font: timesB, color: ink });
      page.drawLine({ start: { x: M, y: 648 }, end: { x: M + W * 0.46, y: 648 }, thickness: 0.5, color: gray });
      page.drawText("BILL TO", { x: cx, y: 652, size: 9, font: timesB, color: ink });
      page.drawLine({ start: { x: cx, y: 648 }, end: { x: M + W, y: 648 }, thickness: 0.5, color: gray });
      page.drawText(sFrom, { x: M, y: 634, size: 10, font: times, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: 621, size: 8, font: times, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: 609 - i * 11, size: 8, font: times, color: gray }));
      page.drawText(sClient, { x: cx, y: 634, size: 10, font: times, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: 621, size: 8, font: times, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: 609 - i * 11, size: 8, font: times, color: gray }));
      const metaY = 598 - Math.max(sFromAddr.length, sClientAddr.length) * 11;
      page.drawText(`DATE  ${date}`, { x: M, y: metaY, size: 9, font: times, color: ink });
      page.drawText(`NUMBER  ${num}`, { x: cx, y: metaY, size: 9, font: times, color: ink });
      if (dueDate.trim()) page.drawText(`DUE  ${sanitize(dueDate)}`, { x: M, y: metaY - 12, size: 9, font: times, color: ink });
      if (sTerms) page.drawText(`TERMS  ${sTerms}`, { x: M, y: metaY - 24, size: 9, font: times, color: ink });

      const rowY = drawTable(Math.min(564, metaY - (sTerms ? 36 : 22)), "double", null);
      const ty = drawTotals(M + W * 0.58, rowY - 38, "boxed", { label: ink, box: ink, boxText: paper, line: gray });
      drawNotes(ty, timesI);
      drawFooter(timesI, midGray);
    } else if (template === "zebra") {
      drawBand(ink, paper);
      let y = 792 - 76 - 30;
      page.drawText(sFrom.toUpperCase(), { x: M, y, size: 11, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: y - 15, size: 9, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: y - 27 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = y - sFromAddr.length * 12;
      page.drawText("TO", { x: cx, y: cTop, size: 9, font: helvB, color: gray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: gray });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 26, size: 9, font: mono, color: gray });

      const rowY = drawTable(Math.min(y - 74, dueY - (sTerms ? 36 : 20)), "band", (i, rowY) => {
        if (i % 2 === 1) page.drawRectangle({ x: M, y: rowY - 9, width: W, height: 20, color: zebraFill });
      });
      const ty = drawTotals(M + W * 0.58, rowY - 34, "band", { label: gray, box: ink, boxText: paper, line: gray });
      drawNotes(ty, helv);
      drawFooter(helv, gray);
    } else if (template === "pop") {
      drawBand(yellow, ink);
      let y = 792 - 76 - 30;
      page.drawText(sFrom.toUpperCase(), { x: M, y, size: 11, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: y - 15, size: 9, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: y - 27 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = y - sFromAddr.length * 12;
      page.drawText("TO", { x: cx, y: cTop, size: 9, font: helvB, color: gray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: gray });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 26, size: 9, font: mono, color: gray });

      page.drawLine({ start: { x: M, y: dueY - 34 }, end: { x: M + W, y: dueY - 34 }, thickness: 3, color: ink });
      const rowY = drawTable(Math.min(y - 74, dueY - (sTerms ? 46 : 30)), "thick", null);
      const ty = drawTotals(M + W * 0.58, rowY - 36, "band", { label: gray, box: red, boxText: ink, line: gray });
      drawNotes(ty, helv);
      drawFooter(helv, gray);
    } else if (template === "receipt") {
      const Wc = W * 0.62;
      const x0 = M + (W - Wc) / 2;
      const cx = 612 / 2;
      const center = (text: string, size: number, f: typeof helv, y: number, color: typeof ink = ink) =>
        page.drawText(text, { x: cx - f.widthOfTextAtSize(text, size) / 2, y, size, font: f, color });

      center("INVOICE", 14, helvB, 736);
      center(num, 9, mono, 718, gray);
      page.drawLine({ start: { x: x0, y: 706 }, end: { x: x0 + Wc, y: 706 }, thickness: 0.7, color: ink });
      center(sFrom.toUpperCase(), 11, helvB, 684);
      if (sFromEmail) center(sFromEmail, 8, helv, 669, gray);
      sFromAddr.forEach((l, i) => center(l, 8, helv, 656 - i * 11, gray));
      const addrBottom = 656 - (sFromAddr.length - 1) * 11;
      page.drawLine({ start: { x: x0, y: addrBottom - 16 }, end: { x: x0 + Wc, y: addrBottom - 16 }, thickness: 0.7, color: ink });
      center("BILL TO", 8, helvB, addrBottom - 30, gray);
      center(sClient.toUpperCase(), 10, helvB, addrBottom - 45);
      if (sClientEmail) center(sClientEmail, 8, helv, addrBottom - 59, gray);
      sClientAddr.forEach((l, i) => center(l, 8, helv, addrBottom - 72 - i * 11, gray));
      const dueY = addrBottom - 72 - (sClientAddr.length - 1) * 11;
      const meta = `DATE ${date}${dueDate.trim() ? "   DUE " + sanitize(dueDate) : ""}`;
      center(meta, 8, mono, dueY - 24, gray);
      if (sTerms) center(`TERMS ${sTerms}`, 8, mono, dueY - 36, gray);

      const headY = dueY - 58;
      page.drawText("DESCRIPTION", { x: x0, y: headY, size: 8, font: helvB, color: gray });
      page.drawText("QTY", { x: x0 + Wc * 0.62 - helvB.widthOfTextAtSize("QTY", 8), y: headY, size: 8, font: helvB, color: gray });
      page.drawText("RATE", { x: x0 + Wc * 0.84 - helvB.widthOfTextAtSize("RATE", 8), y: headY, size: 8, font: helvB, color: gray });
      page.drawText("AMOUNT", { x: x0 + Wc - helvB.widthOfTextAtSize("AMOUNT", 8), y: headY, size: 8, font: helvB, color: gray });
      page.drawLine({ start: { x: x0, y: headY - 6 }, end: { x: x0 + Wc, y: headY - 6 }, thickness: 0.5, color: gray });
      let rowY = headY - 26;
      visible.forEach((it) => {
        page.drawText(sanitize(it.desc), { x: x0, y: rowY, size: 10, font: helv, color: ink, maxWidth: Wc * 0.48 });
        fitRight(it.qty, 10, mono, x0 + Wc * 0.62, rowY, Wc * 0.12);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, x0 + Wc * 0.84, rowY, Wc * 0.16);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, x0 + Wc, rowY, Wc * 0.14);
        rowY -= 22;
      });
      page.drawLine({ start: { x: x0, y: rowY - 4 }, end: { x: x0 + Wc, y: rowY - 4 }, thickness: 0.7, color: ink });

      let ty = rowY - 26;
      const totLine = (label: string, val: string, color: typeof ink = ink) => {
        page.drawText(label, { x: x0 + Wc * 0.5 - helvB.widthOfTextAtSize(label, 9) / 2, y: ty, size: 9, font: helvB, color: gray });
        fitRight(val, 9, mono, x0 + Wc, ty, Wc * 0.4, color);
      };
      totLine("SUBTOTAL", pm(sub));
      if (disc > 0) { ty -= 16; totLine(`DISCOUNT (${sanitize(discountPct)}%)`, `-${pm(disc)}`); }
      if (taxAmt > 0) { ty -= 16; totLine(`TAX (${sanitize(taxPct)}%)`, pm(taxAmt)); }
      ty -= 24;
      page.drawLine({ start: { x: x0, y: ty + 10 }, end: { x: x0 + Wc, y: ty + 10 }, thickness: 0.7, color: ink });
      page.drawText("TOTAL", { x: cx - helvB.widthOfTextAtSize("TOTAL", 11) / 2, y: ty, size: 11, font: helvB, color: ink });
      fitRight(pm(tot), 11, monoB, x0 + Wc, ty, Wc * 0.4);

      if (sNotes) {
        page.drawText("NOTES", { x: cx - helvB.widthOfTextAtSize("NOTES", 8) / 2, y: ty - 34, size: 8, font: helvB, color: gray });
        page.drawText(sNotes, { x: x0, y: ty - 46, size: 9, font: helv, color: ink, maxWidth: Wc });
      }
      drawFooter(helv, midGray);
      codeX = x0 + Wc;
    } else if (template === "invert") {
      page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: ink });
      const light = rgb(0.35, 0.35, 0.35);
      page.drawText("INVOICE", { x: M, y: 736, size: 26, font: helvB, color: paper });
      right(num, 13, monoB, 612 - M, 736, paper);
      let y = 686;
      page.drawText(sFrom.toUpperCase(), { x: M, y, size: 11, font: helvB, color: paper });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: y - 15, size: 9, font: helv, color: light });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: y - 27 - i * 12, size: 8, font: helv, color: light }));

      const cx = M + W * 0.55;
      const cTop = y - sFromAddr.length * 12;
      page.drawText("TO", { x: cx, y: cTop, size: 9, font: helvB, color: light });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: paper });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: light });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: light }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: light });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: light });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 26, size: 9, font: mono, color: light });

      const headY = Math.min(y - 74, dueY - (sTerms ? 36 : 20));
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 8, font: helvB, color: paper });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: helvB, color: paper });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: helvB, color: paper });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: helvB, color: paper });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 1, color: paper });
      let rowY = headY - 26;
      visible.forEach((it) => {
        page.drawText(sanitize(it.desc), { x: M, y: rowY, size: 10, font: helv, color: paper, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, mono, M + W * 0.72, rowY, W * 0.12, paper);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY, W * 0.18, paper);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, M + W, rowY, W * 0.1, paper);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.4, color: light });
        rowY -= 22;
      });
      page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 1, color: paper });

      let ty = rowY - 36;
      page.drawText("SUBTOTAL", { x: M + W * 0.58, y: ty, size: 9, font: helvB, color: light });
      right(pm(sub), 9, mono, M + W, ty, paper);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${sanitize(discountPct)}%)`, { x: M + W * 0.58, y: ty, size: 9, font: helvB, color: light });
        right(`-${pm(disc)}`, 9, mono, M + W, ty, paper);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${sanitize(taxPct)}%)`, { x: M + W * 0.58, y: ty, size: 9, font: helvB, color: light });
        right(pm(taxAmt), 9, mono, M + W, ty, paper);
      }
      ty -= 30;
      page.drawRectangle({ x: M + W * 0.58, y: ty - 10, width: W * 0.42, height: 30, color: yellow });
      page.drawText("TOTAL", { x: M + W * 0.58 + 10, y: ty, size: 10, font: helvB, color: ink });
      right(pm(tot), 11, monoB, M + W, ty, ink);

      if (sNotes) {
        page.drawText("NOTES", { x: M, y: ty - 58, size: 8, font: helvB, color: light });
        page.drawText(sNotes, { x: M, y: ty - 70, size: 9, font: helv, color: paper, maxWidth: W * 0.9 });
      }
      page.drawText("FP INVOICES — no invoice service counted this one. generated locally by opentab", {
        x: M,
        y: 40,
        size: 7,
        font: helv,
        color: rgb(0.5, 0.5, 0.5),
      });
      codeColor = paper;
    } else if (template === "ledger") {
      page.drawText("INVOICE", { x: M, y: 736, size: 12, font: helvB, color: ink });
      right(num, 9, mono, 612 - M, 736, gray);
      page.drawLine({ start: { x: M, y: 726 }, end: { x: M + W, y: 726 }, thickness: 1.5, color: ink });
      page.drawLine({ start: { x: M, y: 720 }, end: { x: M + W, y: 720 }, thickness: 0.5, color: gray });

      page.drawText("FROM", { x: M, y: 696, size: 8, font: helvB, color: gray });
      page.drawText(sFrom.toUpperCase(), { x: M, y: 682, size: 11, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: 668, size: 8, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: 654 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = 696 - sFromAddr.length * 12;
      page.drawText("BILL TO", { x: cx, y: cTop, size: 8, font: helvB, color: gray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 8, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 8, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 12, size: 8, font: mono, color: gray });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 24, size: 8, font: mono, color: gray });

      const headY = Math.min(616, dueY - (sTerms ? 34 : 16));
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 8, font: helvB, color: ink });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: helvB, color: ink });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: helvB, color: ink });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: helvB, color: ink });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 1, color: ink });
      let rowY = headY - 26;
      visible.forEach((it) => {
        page.drawText(sanitize(it.desc), { x: M, y: rowY, size: 10, font: helv, color: ink, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, mono, M + W * 0.72, rowY, W * 0.12);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY, W * 0.18);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, M + W, rowY, W * 0.1);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.4, color: gray });
        rowY -= 22;
      });
      page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 1.5, color: ink });
      page.drawLine({ start: { x: M + W * 0.6, y: headY - 6 }, end: { x: M + W * 0.6, y: rowY }, thickness: 0.4, color: gray });
      page.drawLine({ start: { x: M + W * 0.78, y: headY - 6 }, end: { x: M + W * 0.78, y: rowY }, thickness: 0.4, color: gray });
      page.drawLine({ start: { x: M + W * 0.9, y: headY - 6 }, end: { x: M + W * 0.9, y: rowY }, thickness: 0.4, color: gray });

      const ty = drawTotals(M + W * 0.58, rowY - 34, "plain", { label: gray, box: ink, boxText: paper, line: gray });
      drawNotes(ty, helv);
      drawFooter(helv, gray);
    } else if (template === "blueprint") {
      for (let x = 0; x <= 612; x += 26)
        page.drawLine({ start: { x, y: 0 }, end: { x, y: 792 }, thickness: 0.3, color: lightBlue, opacity: 0.6 });
      for (let y = 0; y <= 792; y += 26)
        page.drawLine({ start: { x: 0, y }, end: { x: 612, y }, thickness: 0.3, color: lightBlue, opacity: 0.6 });

      page.drawText("INVOICE", { x: M, y: 740, size: 24, font: helvB, color: blue });
      right(num, 11, mono, 612 - M, 740, blue);
      page.drawLine({ start: { x: M, y: 726 }, end: { x: M + W, y: 726 }, thickness: 2, color: blue });
      let y = 696;
      page.drawText(sFrom.toUpperCase(), { x: M, y, size: 11, font: helvB, color: blue });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: y - 15, size: 9, font: helv, color: blue });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: y - 27 - i * 12, size: 8, font: helv, color: blue }));

      const cx = M + W * 0.55;
      const cTop = y - sFromAddr.length * 12;
      page.drawText("TO", { x: cx, y: cTop, size: 9, font: helvB, color: blue });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: blue });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: blue });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: blue }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: blue });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: blue });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 26, size: 9, font: mono, color: blue });

      const headY = Math.min(y - 74, dueY - (sTerms ? 36 : 20));
      page.drawText("DESCRIPTION", { x: M, y: headY, size: 8, font: helvB, color: blue });
      page.drawText("QTY", { x: M + W * 0.6, y: headY, size: 8, font: helvB, color: blue });
      page.drawText("RATE", { x: M + W * 0.78, y: headY, size: 8, font: helvB, color: blue });
      page.drawText("AMOUNT", { x: M + W, y: headY, size: 8, font: helvB, color: blue });
      page.drawLine({ start: { x: M, y: headY - 6 }, end: { x: M + W, y: headY - 6 }, thickness: 1, color: blue });
      let rowY = headY - 26;
      visible.forEach((it) => {
        page.drawText(sanitize(it.desc), { x: M, y: rowY, size: 10, font: helv, color: blue, maxWidth: W * 0.56 });
        fitRight(it.qty, 10, mono, M + W * 0.72, rowY, W * 0.12, blue);
        fitRight(pm(parseFloat(it.rate) || 0), 10, mono, M + W * 0.9, rowY, W * 0.18, blue);
        fitRight(pm((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)), 10, monoB, M + W, rowY, W * 0.1, blue);
        page.drawLine({ start: { x: M, y: rowY - 9 }, end: { x: M + W, y: rowY - 9 }, thickness: 0.3, color: lightBlue });
        rowY -= 22;
      });
      page.drawLine({ start: { x: M, y: rowY - 6 }, end: { x: M + W, y: rowY - 6 }, thickness: 2, color: blue });

      let ty = rowY - 36;
      page.drawText("SUBTOTAL", { x: M + W * 0.58, y: ty, size: 9, font: helvB, color: blue });
      right(pm(sub), 9, mono, M + W, ty, blue);
      if (disc > 0) {
        ty -= 18;
        page.drawText(`DISCOUNT (${sanitize(discountPct)}%)`, { x: M + W * 0.58, y: ty, size: 9, font: helvB, color: blue });
        right(`-${pm(disc)}`, 9, mono, M + W, ty, blue);
      }
      if (taxAmt > 0) {
        ty -= 18;
        page.drawText(`TAX (${sanitize(taxPct)}%)`, { x: M + W * 0.58, y: ty, size: 9, font: helvB, color: blue });
        right(pm(taxAmt), 9, mono, M + W, ty, blue);
      }
      ty -= 30;
      page.drawRectangle({ x: M + W * 0.58, y: ty - 10, width: W * 0.42, height: 30, color: blue });
      page.drawText("TOTAL", { x: M + W * 0.58 + 10, y: ty, size: 10, font: helvB, color: paper });
      right(pm(tot), 11, monoB, M + W, ty, paper);

      if (sNotes) {
        page.drawText("NOTES", { x: M, y: ty - 58, size: 8, font: helvB, color: blue });
        page.drawText(sNotes, { x: M, y: ty - 70, size: 9, font: helv, color: blue, maxWidth: W * 0.9 });
      }
      page.drawText("FP INVOICES — no invoice service counted this one. generated locally by opentab", {
        x: M,
        y: 40,
        size: 7,
        font: helv,
        color: blue,
      });
      codeColor = blue;
    } else {
      drawBand(ink, paper);
      let y = 792 - 76 - 30;
      page.drawText(sFrom.toUpperCase(), { x: M, y, size: 11, font: helvB, color: ink });
      if (sFromEmail) page.drawText(sFromEmail, { x: M, y: y - 15, size: 9, font: helv, color: gray });
      sFromAddr.forEach((l, i) => page.drawText(l, { x: M, y: y - 27 - i * 12, size: 8, font: helv, color: gray }));

      const cx = M + W * 0.55;
      const cTop = y - sFromAddr.length * 12;
      page.drawText("TO", { x: cx, y: cTop, size: 9, font: helvB, color: gray });
      page.drawText(sClient.toUpperCase(), { x: cx, y: cTop - 14, size: 10, font: helvB, color: ink });
      if (sClientEmail) page.drawText(sClientEmail, { x: cx, y: cTop - 26, size: 9, font: helv, color: gray });
      sClientAddr.forEach((l, i) => page.drawText(l, { x: cx, y: cTop - 38 - i * 12, size: 8, font: helv, color: gray }));
      const dueY = cTop - 38 - sClientAddr.length * 12;
      page.drawText(`DATE  ${date}`, { x: cx, y: dueY, size: 9, font: mono, color: gray });
      if (dueDate.trim()) page.drawText(`DUE   ${sanitize(dueDate)}`, { x: cx, y: dueY - 13, size: 9, font: mono, color: gray });
      if (sTerms) page.drawText(`TERMS ${sTerms}`, { x: cx, y: dueY - 26, size: 9, font: mono, color: gray });

      const rowY = drawTable(Math.min(y - 74, dueY - (sTerms ? 36 : 20)), "thick", null);
      const ty = drawTotals(M + W * 0.58, rowY - 36, "band", { label: gray, box: ink, boxText: paper, line: gray });
      drawNotes(ty, helv);
      drawFooter(helv, gray);
    }

    drawCode(codeX, 58, codeColor);

    const bytes = await doc.save();
    return new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: "application/pdf" });
  };

  const onExport = async () => {
    if (!hasContent) {
      setError("Add at least one line item first.");
      setStatus("error");
      return;
    }
    setStatus("working");
    setError(null);
    try {
      const blob = await buildPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${(number.trim() || "FP-001").toLowerCase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the invoice.");
      setStatus("error");
    }
  };

  const previewProps = {
    template,
    fromName,
    fromEmail,
    fromAddress,
    clientName,
    clientEmail,
    clientAddress,
    number,
    date,
    dueDate,
    terms,
    currency,
    taxPct,
    discountPct,
    notes,
    items,
    subtotal,
    discount,
    tax,
    total,
    money,
    code,
  };

  return (
    <ToolShell
      crumb="INVOICE-GENERATOR"
      title="The invoice."
      tagline="Line items, tax, discount, notes — a clean brutalist invoice PDF straight from your tab. Invoice Simple counts your 3 free ones; this one doesn't."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [01] Details
              <Receipt className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Your company
                  </span>
                  <input className={inputCls} value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Company name" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Email</span>
                  <input className={inputCls} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="you@company.com" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Address</span>
                  <textarea
                    className="mt-1 h-16 w-full resize-none rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder={"Street, city\nCountry, ZIP"}
                  />
                </label>
              </div>
              <div className="flex flex-col gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">
                    Bill to
                  </span>
                  <input className={inputCls} value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client company" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Client email</span>
                  <input className={inputCls} value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@their-company.com" />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Client address</span>
                  <textarea
                    className="mt-1 h-16 w-full resize-none rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder={"Street, city\nCountry, ZIP"}
                  />
                </label>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Invoice no.</span>
                <input className={inputCls} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="FP-001" />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Date</span>
                <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Due date</span>
                <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [02] Line items
              <Plus className="h-4 w-4" aria-hidden="true" />
            </h2>
            <div className={`${ROW_GRID} mt-4 border-b-2 border-ink/20 pb-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink/50`}>
              <span>Description</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="mt-2 space-y-2 overflow-x-auto">
              {items.map((it, i) => (
                <div key={it.id} className={ROW_GRID}>
                  <input
                    className="min-w-0 rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                    value={it.desc}
                    onChange={(e) => setItem(it.id, { desc: e.target.value })}
                    placeholder={`Item ${i + 1} — what they're paying for`}
                  />
                  <input
                    className="w-full rounded-md border-2 border-ink bg-surface-muted px-1.5 py-2 text-right font-mono text-xs text-ink outline-none focus:border-yellow"
                    value={it.qty}
                    onChange={(e) => setItem(it.id, { qty: e.target.value })}
                    placeholder="Qty"
                    title="Quantity"
                  />
                  <input
                    className="w-full rounded-md border-2 border-ink bg-surface-muted px-1.5 py-2 text-right font-mono text-xs text-ink outline-none focus:border-yellow"
                    value={it.rate}
                    onChange={(e) => setItem(it.id, { rate: e.target.value })}
                    placeholder="Rate"
                    title="Rate"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <span className="truncate font-mono text-xs font-bold text-ink/70">
                      {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      disabled={items.length === 1}
                      className="shrink-0 rounded-md border-2 border-ink p-1.5 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-red disabled:cursor-not-allowed disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="mt-3 flex items-center gap-1.5 rounded-md border-2 border-dashed border-ink/60 bg-transparent px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-[background-color,border-color] duration-200 ease-brutal hover:border-ink hover:bg-surface-muted"
            >
              <Plus className="h-3 w-3" aria-hidden="true" />
              Add item
            </button>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
                [03] Preview
                <Eye className="h-4 w-4" aria-hidden="true" />
              </h2>
              <div className="ml-auto flex items-center gap-1.5">
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value as TemplateId)}
                  title="Template"
                  className="rounded-md border-2 border-ink bg-surface-muted px-2 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-ink outline-none focus:border-yellow"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id} title={t.desc}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden="true" />
                <button
                  type="button"
                  onClick={clickFit}
                  title="Fit to screen"
                  className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => stepZoom(-0.1)}
                  disabled={scale <= 0.25}
                  title="Zoom out"
                  className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => stepZoom(0.1)}
                  disabled={scale >= 1.5}
                  title="Zoom in"
                  className="rounded-md border-2 border-ink p-1 text-ink transition-[background-color] duration-200 ease-brutal hover:bg-yellow/30 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              ref={previewRef}
              className="mt-4 h-[58dvh] min-h-[26rem] overflow-auto rounded-md border-2 border-ink bg-surface-muted"
            >
              <div className="flex min-h-full min-w-full p-3">
                <div
                  className="m-auto shrink-0 overflow-hidden rounded-sm shadow-brutal-md"
                  style={{
                    width: A4_W * scale,
                    height: A4_H * scale,
                    background: "#fff",
                  }}
                >
                  <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: A4_W, height: A4_H }}>
                    <PreviewPage {...previewProps} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
            <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
              [04] Totals & export
              <FileDown className="h-4 w-4" aria-hidden="true" />
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Currency</span>
                <select
                  className="mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2 py-2 font-mono text-xs font-bold text-ink outline-none focus:border-yellow"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Tax %</span>
                <input className={inputCls} value={taxPct} onChange={(e) => setTaxPct(e.target.value)} placeholder="0" />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Discount %</span>
                <input className={inputCls} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="0" />
              </label>
              <div className="rounded-md border-2 border-ink bg-ink p-2.5 text-center">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-paper/50">Total</p>
                <p className="mt-0.5 truncate font-mono text-sm font-bold text-yellow">{money(total)}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Terms</span>
                <input className={inputCls} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="NET 30" />
              </label>
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Code on invoice</span>
                <div className="mt-1 flex gap-1.5">
                  {CODES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCode(c.id)}
                      className={
                        c.id === code
                          ? "rounded-md border-2 border-ink bg-ink px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-paper"
                          : "rounded-md border-2 border-ink bg-surface-muted px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink transition-[transform,background-color] duration-200 ease-brutal hover:-translate-y-0.5 hover:bg-yellow/30 active:translate-y-0"
                      }
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Notes</span>
              <textarea
                className="mt-1 h-20 w-full resize-y rounded-md border-2 border-ink bg-surface-muted p-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink/30 focus:border-yellow"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment terms, thank-you, whatever — it goes on the PDF"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => window.print()} className="uppercase">
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print
              </Button>
              <Button onClick={onExport} disabled={status === "working"} className="uppercase">
                <FileDown className="h-4 w-4" aria-hidden="true" />
                {status === "working" ? "Writing…" : "Download PDF"}
              </Button>
            </div>
            {!hasContent && (
              <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-widest text-ink/40">
                Fill a line item to enable the export.
              </p>
            )}
            {status === "done" && (
              <p className="mt-3 rounded-md border-2 border-ink bg-green/20 px-3 py-2.5 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                In your downloads — no trial trap, no watermark.
              </p>
            )}
            {status === "error" && (
              <p className="mt-3 rounded-md border-2 border-ink bg-red/20 px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                [ ERROR ] {error}
              </p>
            )}
          </section>
        </div>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        FP INVOICES — generated locally with pdf-lib, no 3-invoices-a-month meter.
      </p>

      <div className="invoice-print-root">
        <div className="invoice-print-page">
          <PreviewPage {...previewProps} />
        </div>
      </div>
    </ToolShell>
  );
}

interface PreviewProps {
  template: TemplateId;
  fromName: string;
  fromEmail: string;
  fromAddress: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  number: string;
  date: string;
  dueDate: string;
  terms: string;
  currency: string;
  taxPct: string;
  discountPct: string;
  notes: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  money: (v: number) => string;
  code: "none" | "barcode" | "qr";
}

const addrLines = (a: string) => a.split("\n").slice(0, 3).filter(Boolean);

const CodeBlock = ({ code, value, color = "#111" }: { code: "barcode" | "qr"; value: string; color?: string }) => {
  if (code === "barcode") {
    const bits = code39Bits(value);
    const narrow = 1.5;
    const wide = 3;
    const rects: { x: number; w: number }[] = [];
    let x = 0;
    bits.forEach((b) => {
      if (b) rects.push({ x, w: wide });
      x += b ? wide : narrow;
    });
    return (
      <div className="flex flex-col items-end gap-1">
        <svg width={x} height={34} className="block" shapeRendering="crispEdges">
          {rects.map((rc, i) => (
            <rect key={i} x={rc.x} y={0} width={rc.w} height={34} fill={color} />
          ))}
        </svg>
        <span className="font-mono text-[7px] font-bold tracking-[0.2em] text-ink/50">{value}</span>
      </div>
    );
  }
  const q = qrcode(0, "M");
  q.addData(value);
  q.make();
  const n = q.getModuleCount();
  const cell = 2;
  const rects: { x: number; y: number }[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (q.isDark(r, c)) rects.push({ x: c * cell, y: r * cell });
  return (
    <svg width={n * cell} height={n * cell} className="block" shapeRendering="crispEdges">
      {rects.map((rc, i) => (
        <rect key={i} x={rc.x} y={rc.y} width={cell} height={cell} fill={color} />
      ))}
    </svg>
  );
};

function PreviewPage(props: PreviewProps) {
  const {
    template,
    fromName,
    fromEmail,
    fromAddress,
    clientName,
    clientEmail,
    clientAddress,
    number,
    date,
    dueDate,
    terms,
    taxPct,
    discountPct,
    notes,
    items,
    money,
    code,
  } = props;

  const visible = items.filter((it) => it.desc.trim() || it.qty || it.rate).slice(0, 12);
  const sFrom = fromName.trim() || "Your company";
  const sClient = clientName.trim() || "Client";
  const num = number.trim() || "FP-001";
  const codeVal = num.toUpperCase();

  const fromBlock = (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">From</p>
      <p className="mt-1 text-sm font-bold uppercase">{sFrom}</p>
      {fromEmail.trim() && <p className="text-[10px] text-ink/60">{fromEmail}</p>}
      {addrLines(fromAddress).map((l) => (
        <p key={l} className="text-[10px] leading-relaxed text-ink/60">{l}</p>
      ))}
    </div>
  );

  const toBlock = (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">To</p>
      <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
      {clientEmail.trim() && <p className="text-[10px] text-ink/60">{clientEmail}</p>}
      {addrLines(clientAddress).map((l) => (
        <p key={l} className="text-[10px] leading-relaxed text-ink/60">{l}</p>
      ))}
      <p className="mt-2 text-[10px] text-ink/60">DATE&nbsp;&nbsp;{date}</p>
      {dueDate && <p className="text-[10px] text-ink/60">DUE&nbsp;&nbsp;&nbsp;{dueDate}</p>}
      {terms.trim() && <p className="text-[10px] text-ink/60">TERMS&nbsp;&nbsp;{terms}</p>}
    </div>
  );

  const codeBlock = code !== "none" && (
    <div className="mt-3 flex justify-end">
      <CodeBlock code={code} value={codeVal} />
    </div>
  );

  const codeBlockInvert = code !== "none" && (
    <div className="mt-3 flex justify-end">
      <CodeBlock code={code} value={codeVal} color="#F5F0E8" />
    </div>
  );

  const rows = visible.map((it, i) => (
    <div key={i} className={`${ROW_GRID} py-2 text-[11px] ${template === "zebra" && i % 2 === 1 ? "bg-[#F5F0E8]" : ""} ${template === "zebra" ? "px-2" : "border-b border-ink/20"}`}>
      <span className="truncate">{it.desc}</span>
      <span className="truncate text-right">{it.qty}</span>
      <span className="truncate text-right">{money(parseFloat(it.rate) || 0)}</span>
      <span className="truncate text-right font-bold">
        {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
      </span>
    </div>
  ));

  const totalsBlock = (
    <div className="w-64 space-y-1.5 text-[11px]">
      <div className="flex justify-between text-ink/60">
        <span>SUBTOTAL</span>
        <span>{money(props.subtotal)}</span>
      </div>
      {props.discount > 0 && (
        <div className="flex justify-between text-ink/60">
          <span>DISCOUNT ({discountPct}%)</span>
          <span>-{money(props.discount)}</span>
        </div>
      )}
      {props.tax > 0 && (
        <div className="flex justify-between text-ink/60">
          <span>TAX ({taxPct}%)</span>
          <span>{money(props.tax)}</span>
        </div>
      )}
      <div className="flex justify-between bg-ink px-3 py-2 font-bold text-paper">
        <span>TOTAL</span>
        <span>{money(props.total)}</span>
      </div>
    </div>
  );

  const footer = (
    <p className="mt-auto pt-4 text-[8px] text-ink/30">
      FP INVOICES — no invoice service counted this one. generated locally by opentab
    </p>
  );

  if (template === "minimal") {
    return (
      <div className="flex h-full w-full flex-col bg-white px-14 pb-10 pt-10 font-mono text-ink">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-ink/40">Invoice</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">{num}</span>
        </div>
        <div className="mt-2 border-t border-ink/30" />
        <p className="mt-5 text-2xl font-bold uppercase leading-none">{sFrom}</p>
        {fromEmail.trim() && <p className="mt-1.5 text-[11px] text-ink/50">{fromEmail}</p>}
        {addrLines(fromAddress).map((l) => (
          <p key={l} className="text-[10px] leading-relaxed text-ink/50">{l}</p>
        ))}
        <div className="mt-6 flex justify-between gap-8">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/40">Bill to</p>
            <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
            {clientEmail.trim() && <p className="text-[10px] text-ink/50">{clientEmail}</p>}
            {addrLines(clientAddress).map((l) => (
              <p key={l} className="text-[10px] leading-relaxed text-ink/50">{l}</p>
            ))}
          </div>
          <div className="text-right">
            <p className="text-[10px] leading-relaxed text-ink/60">DATE  {date}</p>
            {dueDate && <p className="text-[10px] leading-relaxed text-ink/60">DUE  {dueDate}</p>}
            {terms.trim() && <p className="text-[10px] leading-relaxed text-ink/60">TERMS  {terms}</p>}
          </div>
        </div>

        <div className={`${ROW_GRID} mt-8 border-t border-ink/40 pt-2 text-[9px] font-bold uppercase tracking-widest text-ink/40`}>
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="mt-1 flex-1">{rows}</div>
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-ink/50">
              <span>SUBTOTAL</span>
              <span>{money(props.subtotal)}</span>
            </div>
            {props.discount > 0 && (
              <div className="flex justify-between text-ink/50">
                <span>DISCOUNT ({discountPct}%)</span>
                <span>-{money(props.discount)}</span>
              </div>
            )}
            {props.tax > 0 && (
              <div className="flex justify-between text-ink/50">
                <span>TAX ({taxPct}%)</span>
                <span>{money(props.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-ink/40 pt-2 font-bold">
              <span>TOTAL</span>
              <span>{money(props.total)}</span>
            </div>
          </div>
        </div>
        {notes.trim() && (
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/40">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        {codeBlock}
        {footer}
      </div>
    );
  }

  if (template === "classic") {
    return (
      <div className="flex h-full w-full flex-col bg-white px-14 pb-10 pt-10 font-serif text-ink">
        <div className="h-1 space-y-[3px]">
          <div className="h-px bg-ink" />
          <div className="h-px bg-ink" />
        </div>
        <p className="mt-8 text-center text-2xl font-bold">INVOICE</p>
        <p className="mt-1 text-center text-[11px] italic">{sFrom}</p>
        {fromEmail.trim() && <p className="text-center text-[9px] text-ink/50">{fromEmail}</p>}
        {addrLines(fromAddress).map((l) => (
          <p key={l} className="text-center text-[9px] leading-relaxed text-ink/50">{l}</p>
        ))}
        <div className="mt-7 flex justify-between gap-8">
          <div className="border-b border-ink/30 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest">From</p>
            <p className="mt-1 text-[11px] font-bold">{sFrom}</p>
            {fromEmail.trim() && <p className="text-[9px] text-ink/50">{fromEmail}</p>}
          </div>
          <div className="border-b border-ink/30 pb-1">
            <p className="text-[9px] font-bold uppercase tracking-widest">Bill to</p>
            <p className="mt-1 text-[11px] font-bold">{sClient}</p>
            {clientEmail.trim() && <p className="text-[9px] text-ink/50">{clientEmail}</p>}
          </div>
        </div>
        <div className="mt-3 flex justify-between text-[10px]">
          <span>
            DATE&nbsp;&nbsp;{date}
            {dueDate && (
              <>
                <br />
                DUE&nbsp;&nbsp;{dueDate}
              </>
            )}
            {terms.trim() && (
              <>
                <br />
                TERMS&nbsp;&nbsp;{terms}
              </>
            )}
          </span>
          <span>NUMBER&nbsp;&nbsp;{num}</span>
        </div>

        <div className={`${ROW_GRID} mt-6 border-y-2 border-ink py-2 text-[9px] font-bold uppercase tracking-widest`}>
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="mt-1 flex-1">{rows}</div>
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-bold">SUBTOTAL</span>
              <span>{money(props.subtotal)}</span>
            </div>
            {props.discount > 0 && (
              <div className="flex justify-between">
                <span className="font-bold">DISCOUNT ({discountPct}%)</span>
                <span>-{money(props.discount)}</span>
              </div>
            )}
            {props.tax > 0 && (
              <div className="flex justify-between">
                <span className="font-bold">TAX ({taxPct}%)</span>
                <span>{money(props.tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-2 border-ink px-3 py-2 font-bold">
              <span>TOTAL</span>
              <span>{money(props.total)}</span>
            </div>
          </div>
        </div>
        {notes.trim() && (
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] italic leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        {codeBlock}
        {footer}
      </div>
    );
  }

  if (template === "receipt") {
    return (
      <div className="flex h-full w-full flex-col items-center bg-white px-10 pb-10 pt-10 font-mono text-ink">
        <p className="text-lg font-bold uppercase tracking-[0.3em]">Invoice</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink/50">{num}</p>
        <div className="mt-4 w-full max-w-md border-t-2 border-dashed border-ink/40" />
        <p className="mt-6 text-base font-bold uppercase">{sFrom}</p>
        {fromEmail.trim() && <p className="mt-1 text-center text-[10px] text-ink/50">{fromEmail}</p>}
        {addrLines(fromAddress).map((l) => (
          <p key={l} className="text-center text-[10px] leading-relaxed text-ink/50">{l}</p>
        ))}
        <div className="mt-6 w-full max-w-md border-t-2 border-dashed border-ink/40" />
        <p className="mt-6 text-[9px] font-bold uppercase tracking-widest text-ink/50">Bill to</p>
        <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
        {clientEmail.trim() && <p className="mt-1 text-center text-[10px] text-ink/50">{clientEmail}</p>}
        {addrLines(clientAddress).map((l) => (
          <p key={l} className="text-center text-[10px] leading-relaxed text-ink/50">{l}</p>
        ))}
        <p className="mt-3 text-[10px] text-ink/60">
          DATE&nbsp;&nbsp;{date}
          {dueDate && <>{"   "}DUE&nbsp;&nbsp;{dueDate}</>}
        </p>
        {terms.trim() && <p className="text-[10px] text-ink/60">TERMS&nbsp;&nbsp;{terms}</p>}

        <div className="mt-8 w-full max-w-sm">
          <div className={`${ROW_GRID} border-b border-ink/30 pb-1.5 text-[9px] font-bold uppercase tracking-widest text-ink/50`}>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="mt-1">{rows}</div>
          <div className="mt-5 flex flex-col items-center gap-1 text-[11px]">
            <div className="flex w-56 justify-between text-ink/60">
              <span>SUBTOTAL</span>
              <span>{money(props.subtotal)}</span>
            </div>
            {props.discount > 0 && (
              <div className="flex w-56 justify-between text-ink/60">
                <span>DISCOUNT ({discountPct}%)</span>
                <span>-{money(props.discount)}</span>
              </div>
            )}
            {props.tax > 0 && (
              <div className="flex w-56 justify-between text-ink/60">
                <span>TAX ({taxPct}%)</span>
                <span>{money(props.tax)}</span>
              </div>
            )}
            <div className="mt-1 w-full max-w-md border-t-2 border-dashed border-ink/40 pt-1.5" />
            <div className="flex w-56 justify-between font-bold">
              <span>TOTAL</span>
              <span>{money(props.total)}</span>
            </div>
          </div>
        </div>
        {notes.trim() && (
          <div className="mt-6 w-full max-w-sm text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        {codeBlock}
        {footer}
      </div>
    );
  }

  if (template === "invert") {
    return (
      <div className="flex h-full w-full flex-col bg-ink pb-10 pt-10 font-mono text-paper">
        <div className="flex items-baseline justify-between px-14">
          <span className="font-display text-3xl font-bold uppercase tracking-tight">Invoice</span>
          <span className="text-sm font-bold text-paper/80">{num}</span>
        </div>
        <div className="flex flex-1 flex-col px-14 pt-6">
          <div className="flex justify-between gap-8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-paper/40">From</p>
              <p className="mt-1 text-sm font-bold uppercase">{sFrom}</p>
              {fromEmail.trim() && <p className="text-[10px] text-paper/50">{fromEmail}</p>}
              {addrLines(fromAddress).map((l) => (
                <p key={l} className="text-[10px] leading-relaxed text-paper/50">{l}</p>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-paper/40">To</p>
              <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
              {clientEmail.trim() && <p className="text-[10px] text-paper/50">{clientEmail}</p>}
              {addrLines(clientAddress).map((l) => (
                <p key={l} className="text-[10px] leading-relaxed text-paper/50">{l}</p>
              ))}
              <p className="mt-2 text-[10px] text-paper/50">DATE&nbsp;&nbsp;{date}</p>
              {dueDate && <p className="text-[10px] text-paper/50">DUE&nbsp;&nbsp;&nbsp;{dueDate}</p>}
              {terms.trim() && <p className="text-[10px] text-paper/50">TERMS&nbsp;&nbsp;{terms}</p>}
            </div>
          </div>

          <div className={`${ROW_GRID} mt-8 border-y border-paper/40 py-2 text-[9px] font-bold uppercase tracking-widest text-paper/70`}>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="mt-1 flex-1">
            {visible.map((it, i) => (
              <div key={i} className={`${ROW_GRID} border-b border-paper/15 py-2 text-[11px]`}>
                <span className="truncate">{it.desc}</span>
                <span className="truncate text-right">{it.qty}</span>
                <span className="truncate text-right">{money(parseFloat(it.rate) || 0)}</span>
                <span className="truncate text-right font-bold">
                  {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-paper/60">
                <span>SUBTOTAL</span>
                <span>{money(props.subtotal)}</span>
              </div>
              {props.discount > 0 && (
                <div className="flex justify-between text-paper/60">
                  <span>DISCOUNT ({discountPct}%)</span>
                  <span>-{money(props.discount)}</span>
                </div>
              )}
              {props.tax > 0 && (
                <div className="flex justify-between text-paper/60">
                  <span>TAX ({taxPct}%)</span>
                  <span>{money(props.tax)}</span>
                </div>
              )}
              <div className="flex justify-between bg-yellow px-3 py-2 font-bold text-ink">
                <span>TOTAL</span>
                <span>{money(props.total)}</span>
              </div>
            </div>
          </div>
          {notes.trim() && (
            <div className="mt-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-paper/40">Notes</p>
              <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-paper/60">{notes}</p>
            </div>
          )}
          {codeBlockInvert}
          <p className="mt-auto pt-4 text-[8px] text-paper/30">
            FP INVOICES — no invoice service counted this one. generated locally by opentab
          </p>
        </div>
      </div>
    );
  }

  if (template === "ledger") {
    return (
      <div className="flex h-full w-full flex-col bg-white px-14 pb-10 pt-10 font-mono text-ink">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold uppercase tracking-[0.3em]">Invoice</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink/50">{num}</span>
        </div>
        <div className="mt-2 border-t-2 border-ink" />
        <div className="mt-1 border-t border-ink/30" />
        <div className="mt-6 flex justify-between gap-8">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">From</p>
            <p className="mt-1 text-sm font-bold uppercase">{sFrom}</p>
            {fromEmail.trim() && <p className="text-[10px] text-ink/50">{fromEmail}</p>}
            {addrLines(fromAddress).map((l) => (
              <p key={l} className="text-[10px] leading-relaxed text-ink/50">{l}</p>
            ))}
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Bill to</p>
            <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
            {clientEmail.trim() && <p className="text-[10px] text-ink/50">{clientEmail}</p>}
            {addrLines(clientAddress).map((l) => (
              <p key={l} className="text-[10px] leading-relaxed text-ink/50">{l}</p>
            ))}
            <p className="mt-2 text-[10px] text-ink/60">DATE&nbsp;&nbsp;{date}</p>
            {dueDate && <p className="text-[10px] text-ink/60">DUE&nbsp;&nbsp;&nbsp;{dueDate}</p>}
            {terms.trim() && <p className="text-[10px] text-ink/60">TERMS&nbsp;&nbsp;{terms}</p>}
          </div>
        </div>

        <div className="mt-8 flex-1">
          <div className={`${ROW_GRID} border-y-2 border-ink py-2 text-[9px] font-bold uppercase tracking-widest`}>
            <span className="pr-2">Description</span>
            <span className="border-l border-ink/30 pl-2 text-right">Qty</span>
            <span className="border-l border-ink/30 pl-2 text-right">Rate</span>
            <span className="border-l border-ink/30 pl-2 text-right">Amount</span>
          </div>
          {visible.map((it, i) => (
            <div key={i} className={`${ROW_GRID} border-b border-ink/20 py-2 text-[11px]`}>
              <span className="truncate pr-2">{it.desc}</span>
              <span className="truncate border-l border-ink/20 pl-2 text-right">{it.qty}</span>
              <span className="truncate border-l border-ink/20 pl-2 text-right">{money(parseFloat(it.rate) || 0)}</span>
              <span className="truncate border-l border-ink/20 pl-2 text-right font-bold">
                {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
              </span>
            </div>
          ))}
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span>SUBTOTAL</span>
                <span>{money(props.subtotal)}</span>
              </div>
              {props.discount > 0 && (
                <div className="flex justify-between">
                  <span>DISCOUNT ({discountPct}%)</span>
                  <span>-{money(props.discount)}</span>
                </div>
              )}
              {props.tax > 0 && (
                <div className="flex justify-between">
                  <span>TAX ({taxPct}%)</span>
                  <span>{money(props.tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-ink pt-1.5 font-bold">
                <span>TOTAL</span>
                <span>{money(props.total)}</span>
              </div>
            </div>
          </div>
          {notes.trim() && (
            <div className="mt-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Notes</p>
              <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-ink/60">{notes}</p>
            </div>
          )}
          {codeBlock}
          {footer}
        </div>
      </div>
    );
  }

  if (template === "blueprint") {
    return (
      <div
        className="flex h-full w-full flex-col bg-white pb-10 pt-10 font-mono text-blue"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(77,141,255,0.12) 0, rgba(77,141,255,0.12) 1px, transparent 1px, transparent 26px), repeating-linear-gradient(90deg, rgba(77,141,255,0.12) 0, rgba(77,141,255,0.12) 1px, transparent 1px, transparent 26px)",
        }}
      >
        <div className="flex items-baseline justify-between px-14">
          <span className="font-display text-3xl font-bold uppercase tracking-tight">Invoice</span>
          <span className="text-sm font-bold">{num}</span>
        </div>
        <div className="mx-14 mt-2 border-t-2 border-blue" />
        <div className="flex flex-1 flex-col px-14 pt-6">
          <div className="flex justify-between gap-8">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue/70">From</p>
              <p className="mt-1 text-sm font-bold uppercase">{sFrom}</p>
              {fromEmail.trim() && <p className="text-[10px] text-blue/70">{fromEmail}</p>}
              {addrLines(fromAddress).map((l) => (
                <p key={l} className="text-[10px] leading-relaxed text-blue/70">{l}</p>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue/70">To</p>
              <p className="mt-1 text-sm font-bold uppercase">{sClient}</p>
              {clientEmail.trim() && <p className="text-[10px] text-blue/70">{clientEmail}</p>}
              {addrLines(clientAddress).map((l) => (
                <p key={l} className="text-[10px] leading-relaxed text-blue/70">{l}</p>
              ))}
              <p className="mt-2 text-[10px] text-blue/70">DATE&nbsp;&nbsp;{date}</p>
              {dueDate && <p className="text-[10px] text-blue/70">DUE&nbsp;&nbsp;&nbsp;{dueDate}</p>}
              {terms.trim() && <p className="text-[10px] text-blue/70">TERMS&nbsp;&nbsp;{terms}</p>}
            </div>
          </div>

          <div className={`${ROW_GRID} mt-8 border-b-2 border-blue pb-2 text-[9px] font-bold uppercase tracking-widest`}>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="mt-1 flex-1">
            {visible.map((it, i) => (
              <div key={i} className={`${ROW_GRID} border-b border-blue/30 py-2 text-[11px]`}>
                <span className="truncate">{it.desc}</span>
                <span className="truncate text-right">{it.qty}</span>
                <span className="truncate text-right">{money(parseFloat(it.rate) || 0)}</span>
                <span className="truncate text-right font-bold">
                  {money((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0))}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-blue/70">
                <span>SUBTOTAL</span>
                <span>{money(props.subtotal)}</span>
              </div>
              {props.discount > 0 && (
                <div className="flex justify-between text-blue/70">
                  <span>DISCOUNT ({discountPct}%)</span>
                  <span>-{money(props.discount)}</span>
                </div>
              )}
              {props.tax > 0 && (
                <div className="flex justify-between text-blue/70">
                  <span>TAX ({taxPct}%)</span>
                  <span>{money(props.tax)}</span>
                </div>
              )}
              <div className="flex justify-between bg-blue px-3 py-2 font-bold text-white">
                <span>TOTAL</span>
                <span>{money(props.total)}</span>
              </div>
            </div>
          </div>
          {notes.trim() && (
            <div className="mt-6">
              <p className="text-[9px] font-bold uppercase tracking-widest text-blue/70">Notes</p>
              <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-blue/70">{notes}</p>
            </div>
          )}
          {codeBlock}
          <p className="mt-auto pt-4 text-[8px] text-blue/50">
            FP INVOICES — no invoice service counted this one. generated locally by opentab
          </p>
        </div>
      </div>
    );
  }

  const zebra = template === "zebra";
  const pop = template === "pop";

  return (
    <div className="flex h-full w-full flex-col bg-white pb-10 font-mono text-ink">
      <div
        className={`flex items-center justify-between px-14 py-5 ${zebra ? "bg-ink text-paper" : pop ? "bg-yellow text-ink" : "bg-ink text-paper"}`}
      >
        <span className="font-display text-3xl font-bold uppercase tracking-tight">Invoice</span>
        <span className="text-sm font-bold">{num}</span>
      </div>
      <div className="flex flex-1 flex-col px-14 pt-6">
        <div className="flex justify-between gap-8">
          {fromBlock}
          {toBlock}
        </div>

        <div
          className={`${ROW_GRID} ${zebra ? "mt-8 bg-ink px-2 py-2 text-[9px] font-bold uppercase tracking-widest text-paper" : pop ? "mt-8 border-y-2 border-ink py-2 text-[9px] font-bold uppercase tracking-widest text-ink/50" : "mt-8 border-y-2 border-ink py-2 text-[9px] font-bold uppercase tracking-widest text-ink/50"}`}
        >
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Rate</span>
          <span className="text-right">Amount</span>
        </div>
        <div className={`mt-1 ${zebra ? "" : "flex-1"}`}>{rows}</div>
        <div className="mt-6 flex justify-end">
          {zebra ? (
            totalsBlock
          ) : pop ? (
            <div className="w-64 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-ink/60">
                <span>SUBTOTAL</span>
                <span>{money(props.subtotal)}</span>
              </div>
              {props.discount > 0 && (
                <div className="flex justify-between text-ink/60">
                  <span>DISCOUNT ({discountPct}%)</span>
                  <span>-{money(props.discount)}</span>
                </div>
              )}
              {props.tax > 0 && (
                <div className="flex justify-between text-ink/60">
                  <span>TAX ({taxPct}%)</span>
                  <span>{money(props.tax)}</span>
                </div>
              )}
              <div className="flex justify-between bg-red px-3 py-2 font-bold text-ink">
                <span>TOTAL</span>
                <span>{money(props.total)}</span>
              </div>
            </div>
          ) : (
            totalsBlock
          )}
        </div>
        {notes.trim() && (
          <div className="mt-6">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ink/50">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed text-ink/60">{notes}</p>
          </div>
        )}
        {codeBlock}
        {footer}
      </div>
    </div>
  );
}