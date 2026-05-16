/**
 * Email and Slack notification templates for SupplyPulse alerts.
 *
 * Exports:
 *   buildAlertEmail(supplier, scoreResult, signals) → HTML string
 *   buildSlackPayload(supplier, scoreResult, signals) → Slack Block Kit object
 */

// ─── Shared helpers ───────────────────────────────────────────────────────────

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://supplypulse.app").replace(/\/$/, "");
}

function scoreLabel(score) {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "At Risk";
  return "Critical";
}

function scoreColor(score) {
  if (score >= 70) return "#16a34a"; // green-600
  if (score >= 40) return "#d97706"; // amber-600
  return "#dc2626";                  // red-600
}

function directionArrow(direction) {
  return { improving: "↑", stable: "→", deteriorating: "↓" }[direction] ?? "→";
}

function directionLabel(direction) {
  return { improving: "Improving", stable: "Stable", deteriorating: "Deteriorating" }[direction] ?? "Stable";
}

function directionColor(direction) {
  return { improving: "#16a34a", stable: "#64748b", deteriorating: "#dc2626" }[direction] ?? "#64748b";
}

function severityColor(severity) {
  return {
    critical: "#dc2626",
    high:     "#ea580c",
    medium:   "#d97706",
    low:      "#16a34a",
  }[severity] ?? "#64748b";
}

function severityBg(severity) {
  return {
    critical: "#fef2f2",
    high:     "#fff7ed",
    medium:   "#fffbeb",
    low:      "#f0fdf4",
  }[severity] ?? "#f8fafc";
}

function signalTypeIcon(type) {
  return {
    news:          "📰",
    financial:     "📊",
    legal:         "⚖️",
    operational:   "⚙️",
    leadership:    "👥",
  }[type] ?? "🔍";
}

/** Escape HTML entities to prevent injection in template strings. */
function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Pick the top 3 signals sorted by severity then confidence. */
function topSignals(signals) {
  const ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  return [...(signals ?? [])]
    .sort((a, b) => {
      const s = (ORDER[a.severity] ?? 4) - (ORDER[b.severity] ?? 4);
      return s !== 0 ? s : (b.confidence ?? 0) - (a.confidence ?? 0);
    })
    .slice(0, 3);
}

// ─── HTML email ───────────────────────────────────────────────────────────────

/**
 * Builds a polished HTML email for a supplier risk alert.
 *
 * @param {{ id:string, name:string, country:string|null, category:string|null,
 *           alert_threshold:number|null, criticality:string|null }} supplier
 * @param {{ score:number, direction:string, summary:string,
 *           recommendations:Array }} scoreResult
 * @param {Array<{ type:string, severity:string, summary:string,
 *                 source_url:string|null, source_title:string|null,
 *                 confidence:number }>} signals
 * @returns {string}
 */
function buildAlertEmail(supplier, scoreResult, signals) {
  const { score, direction, summary } = scoreResult;
  const threshold  = supplier.alert_threshold ?? 40;
  const label      = scoreLabel(score);
  const color      = scoreColor(score);
  const dArrow     = directionArrow(direction);
  const dLabel     = directionLabel(direction);
  const dColor     = directionColor(direction);
  const top3       = topSignals(signals);
  const reportUrl  = `${appUrl()}/suppliers/${esc(supplier.id)}`;

  const signalRows = top3.map((s) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:18px;line-height:1.4;">${signalTypeIcon(s.type)}</span>
          <div style="flex:1;">
            <div style="margin-bottom:4px;">
              <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;
                           background:${severityBg(s.severity)};color:${severityColor(s.severity)};">
                ${esc(s.severity)}
              </span>
              <span style="font-size:11px;color:#94a3b8;margin-left:6px;text-transform:capitalize;">${esc(s.type)}</span>
            </div>
            <p style="margin:0 0 4px;font-size:13px;color:#334155;line-height:1.5;">${esc(s.summary)}</p>
            ${s.source_url ? `
            <a href="${esc(s.source_url)}" style="font-size:12px;color:#2563eb;text-decoration:none;">
              ${esc(s.source_title ?? s.source_url)} ↗
            </a>` : ""}
          </div>
        </div>
      </td>
    </tr>`).join("");

  const signalsSection = top3.length > 0 ? `
    <h3 style="margin:24px 0 12px;font-size:14px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">
      Top Risk Signals
    </h3>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;border-collapse:separate;">
      ${signalRows}
    </table>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SupplyPulse Risk Alert — ${esc(supplier.name)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;
                    border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header bar -->
        <tr>
          <td style="background:#0f172a;padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">SupplyPulse</span>
                </td>
                <td align="right">
                  <span style="font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;">Risk Alert</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert banner -->
        <tr>
          <td style="background:${score < 40 ? "#fef2f2" : "#fffbeb"};padding:16px 32px;border-bottom:1px solid ${score < 40 ? "#fecaca" : "#fde68a"};">
            <p style="margin:0;font-size:15px;font-weight:600;color:${color};">
              ⚠️ &nbsp;Supplier risk alert triggered for <strong>${esc(supplier.name)}</strong>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px 0;">

            <!-- Score stats -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;border-collapse:separate;">
              <tr>
                <td width="33%" style="padding:16px 20px;border-right:1px solid #e2e8f0;text-align:center;">
                  <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Score</div>
                  <div style="font-size:36px;font-weight:800;color:${color};line-height:1;">${score}</div>
                  <div style="font-size:12px;color:${color};font-weight:600;margin-top:4px;">${label}</div>
                </td>
                <td width="34%" style="padding:16px 20px;border-right:1px solid #e2e8f0;text-align:center;">
                  <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Threshold</div>
                  <div style="font-size:36px;font-weight:800;color:#0f172a;line-height:1;">${threshold}</div>
                  <div style="font-size:12px;color:#64748b;font-weight:500;margin-top:4px;">Alert level</div>
                </td>
                <td width="33%" style="padding:16px 20px;text-align:center;">
                  <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Trend</div>
                  <div style="font-size:36px;font-weight:800;color:${dColor};line-height:1;">${dArrow}</div>
                  <div style="font-size:12px;color:${dColor};font-weight:600;margin-top:4px;">${dLabel}</div>
                </td>
              </tr>
            </table>

            <!-- Summary -->
            <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">
              Risk Summary
            </h3>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">${esc(summary)}</p>

            <!-- Top signals -->
            ${signalsSection}

            <!-- CTA -->
            <div style="margin:28px 0;">
              <a href="${reportUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                        padding:13px 28px;border-radius:8px;font-size:14px;font-weight:600;
                        letter-spacing:0.01em;">
                View Full Report →
              </a>
            </div>

          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;"></td></tr>

        <!-- Footer / legal -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;">
            <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;line-height:1.6;">
              This alert was generated automatically by
              <a href="${appUrl()}" style="color:#64748b;text-decoration:none;">SupplyPulse</a>
              based on publicly available information.
              ${supplier.country ? `Supplier country: ${esc(supplier.country)}.` : ""}
              ${supplier.category ? `Category: ${esc(supplier.category)}.` : ""}
            </p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.6;">
              <strong>Not financial or legal advice.</strong>
              SupplyPulse risk scores are AI-generated assessments for informational purposes only.
              Always conduct your own due diligence before making procurement decisions.
              Score ID: ${esc(scoreResult.scoreId ?? "")}
            </p>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Slack Block Kit payload ──────────────────────────────────────────────────

/**
 * Builds a rich Slack Block Kit payload for a supplier risk alert.
 *
 * @param {{ id:string, name:string, alert_threshold:number|null }} supplier
 * @param {{ score:number, direction:string, summary:string }} scoreResult
 * @param {Array<object>} signals
 * @returns {object}
 */
function buildSlackPayload(supplier, scoreResult, signals) {
  const { score, direction, summary } = scoreResult;
  const threshold = supplier.alert_threshold ?? 40;
  const label     = scoreLabel(score);
  const dArrow    = directionArrow(direction);
  const dLabel    = directionLabel(direction);
  const emoji     = score < 40 ? "🔴" : "🟡";
  const top3      = topSignals(signals);
  const reportUrl = `${appUrl()}/suppliers/${supplier.id}`;

  const severityEmoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };

  const signalLines = top3
    .map((s) => `${severityEmoji[s.severity] ?? "⚪"} *${s.type}* — ${s.summary}`)
    .join("\n");

  const blocks = [
    {
      type: "header",
      text: {
        type:  "plain_text",
        text:  `${emoji} Supplier Risk Alert — ${supplier.name}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Score*\n*${score}/100* — ${label}` },
        { type: "mrkdwn", text: `*Threshold*\n${threshold}` },
        { type: "mrkdwn", text: `*Trend*\n${dArrow} ${dLabel}` },
        { type: "mrkdwn", text: `*Supplier*\n${supplier.name}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Risk Summary*\n${summary}` },
    },
  ];

  if (signalLines) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*Top Risk Signals*\n${signalLines}` },
    });
  }

  blocks.push({ type: "divider" });

  blocks.push({
    type: "actions",
    elements: [
      {
        type:  "button",
        style: "primary",
        text:  { type: "plain_text", text: "View Full Report", emoji: true },
        url:   reportUrl,
      },
    ],
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "_Not financial or legal advice. SupplyPulse scores are AI-generated and for informational purposes only._",
      },
    ],
  });

  return {
    text: `${emoji} SupplyPulse: ${supplier.name} scored ${score}/100 (below threshold of ${threshold})`,
    blocks,
  };
}

module.exports = { buildAlertEmail, buildSlackPayload };
