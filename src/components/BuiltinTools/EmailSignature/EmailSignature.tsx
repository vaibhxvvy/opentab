import { useState } from "react";
import { FileDown, Mail } from "lucide-react";
import { ToolShell } from "../shared/ToolShell";
import { Button } from "../../ui/button";

const inputCls =
  "mt-1 w-full rounded-md border-2 border-ink bg-surface-muted px-2.5 py-2 font-mono text-xs font-bold text-ink outline-none placeholder:text-ink/30 focus:border-yellow";

export function EmailSignature() {
  const [name, setName] = useState("Rhea Sharma");
  const [role, setRole] = useState("Lead Designer");
  const [company, setCompany] = useState("OpenTab Co.");
  const [email, setEmail] = useState("rhea@opentab.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [website, setWebsite] = useState("opentab.com");
  const [accent, setAccent] = useState("#FFD84D");

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html>
<html>
<body>
<!-- Paste everything inside <table>...</table> into your email client's signature editor -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#111111;font-size:13px;line-height:1.45">
  <tr>
    <td style="padding-right:14px;vertical-align:top">
      <table cellpadding="0" cellspacing="0" border="0" height="52" width="6" style="height:52px">
        <tr><td style="background:${esc(accent)};width:6px;height:52px;font-size:0">&nbsp;</td></tr>
      </table>
    </td>
    <td style="vertical-align:top">
      <div style="font-size:17px;font-weight:bold;letter-spacing:0.5px">${esc(name)}</div>
      <div style="color:#444;margin:2px 0 0 0">${esc(role)} · ${esc(company)}</div>
      <div style="margin:8px 0 0 0">
        <a href="mailto:${esc(email)}" style="color:#111;text-decoration:none">${esc(email)}</a>
        ${phone ? `&nbsp;&nbsp;|&nbsp;&nbsp;${esc(phone)}` : ""}
        ${website ? `<br/><a href="https://${esc(website.replace(/^https?:\/\//, ""))}" style="color:#111;text-decoration:none">${esc(website.replace(/^https?:\/\//, ""))}</a>` : ""}
      </div>
      <div style="margin-top:10px;padding-top:8px;border-top:2px solid #111;font-size:11px;letter-spacing:1.5px;color:#888">${esc(company.toUpperCase())} — ${esc(role.toUpperCase())}</div>
    </td>
  </tr>
</table>
</body>
</html>
`;

  const downloadHtml = () => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signature.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <ToolShell
      crumb="EMAIL-SIGNATURE"
      title="The sign-off."
      tagline="A signature generator that outputs the table markup email clients actually render — not a screenshot. The 'pro signature' sites charge monthly for this exact table with a tracking pixel added."
    >
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink/60">
            [01] Details
            <Mail className="h-4 w-4" aria-hidden="true" />
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Name</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Role</span>
              <input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Company</span>
              <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Email</span>
              <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Phone</span>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Website</span>
              <input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50">Accent</span>
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="mt-2 h-10 w-full cursor-pointer rounded-md border-2 border-ink bg-surface-muted"
            />
          </label>
        </section>

        <section className="flex min-w-0 flex-col rounded-lg border-[3px] border-ink bg-surface p-5 shadow-brutal-md">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-ink/60">[02] Signature</h2>
          <div className="mt-4 flex-1 overflow-auto rounded-md border-2 border-ink bg-white p-6">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <Button onClick={downloadHtml} className="mt-4 w-full uppercase">
            <FileDown className="h-4 w-4" aria-hidden="true" />
            Download signature.html
          </Button>
          <p className="mt-3 font-mono text-[10px] font-bold uppercase tracking-widest text-ink/40">
            Paste the table into Gmail / Outlook signature settings. No tracking pixels were harmed.
          </p>
        </section>
      </div>

      <p className="mt-8 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink/40">
        Generated locally — the signature site's business model is billing you for your own name.
      </p>
    </ToolShell>
  );
}