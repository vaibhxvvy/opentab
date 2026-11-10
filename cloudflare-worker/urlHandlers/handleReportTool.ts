import { jsonResponse, type Env } from "../utils";

interface ToolReport {
  toolId: string;
  report: string;
}

export async function handleReportTool(
  request: Request,
  env: Env,
  origin: string,
) {
  let sub: ToolReport;
  try {
    sub = validate(await request.json());
  } catch (err) {
    return jsonResponse({ error: String(err) }, 400, origin);
  }

  const issueBody = `
## Tool Suggestion

| Field | Value |
|-------|-------|
| **ID** | ${sub.toolId} |
| **Issue** | ${sub.report} |

----
*Submitted via OpenTab index*
    `.trim();

  // Added to make it easier to spot in the GitHub Issues page.
  const labels = ["tool-report"];

  const res = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}/issues`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        "User-Agent": "opentab-worker/1.0",
      },
      body: JSON.stringify({
        title: `[Tool Report] ${sub.toolId}`,
        body: issueBody,
        labels: labels,
      }),
    },
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    console.error("GitHub API error:", err.message);
    return jsonResponse(
      { error: "Failed to create GitHub issue" },
      502,
      origin,
    );
  }

  return jsonResponse({ ok: true }, 200, origin);
}

// Validates the response object "data" if all its fields are valid.
function validate(data: unknown): ToolReport {
  if (!data || typeof data !== "object") throw new Error("Invalid payload");
  const data_obj = data as Record<string, unknown>;

  // If all the required fields exist
  for (const field of ["toolId", "report"] as const) {
    if (
      !data_obj[field] ||
      typeof data_obj[field] !== "string" ||
      !(data_obj[field] as string).trim()
    ) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return {
    toolId: (data_obj.toolId as string).trim().slice(0, 128),
    report: (data_obj.report as string).trim().slice(0, 512),
  };
}
