const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || "1.0.0";
const REPO_URL = process.env.REPO_URL || "https://github.com/Mattej-Petrovic/M4K-Pipeline";
const ACTIONS_URL = `${REPO_URL}/actions/workflows/pipeline.yml`;
const DEPLOY_URL = process.env.DEPLOY_URL || "https://m4k-pipeline-production.up.railway.app";
const CHECKLIST_FILE_NAME = "mission_challenges_checklist.txt";
const CHECKLIST_PATH = path.join(__dirname, CHECKLIST_FILE_NAME);

const metrics = {
  totalRequests: 0,
  totalResponseTimeMs: 0,
  routes: {}
};

function toFixedNumber(value) {
  return Number(value.toFixed(2));
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function routeMetricName(route) {
  const normalized = route.replaceAll("/", "_").replace(/[^a-zA-Z0-9_]/g, "_");
  return normalized.length === 0 ? "root" : normalized;
}

app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const route = req.path || "unknown";

    metrics.totalRequests += 1;
    metrics.totalResponseTimeMs += durationMs;

    if (!metrics.routes[route]) {
      metrics.routes[route] = {
        requests: 0,
        totalResponseTimeMs: 0,
        lastStatusCode: 0
      };
    }

    metrics.routes[route].requests += 1;
    metrics.routes[route].totalResponseTimeMs += durationMs;
    metrics.routes[route].lastStatusCode = res.statusCode;
  });

  next();
});

app.get("/status", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "first-pipeline",
    healthy: true,
    version: APP_VERSION,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

app.get("/metrics", (req, res) => {
  const averageResponseMs =
    metrics.totalRequests === 0
      ? 0
      : toFixedNumber(metrics.totalResponseTimeMs / metrics.totalRequests);

  const routeMetrics = {};
  Object.keys(metrics.routes).forEach((route) => {
    const routeData = metrics.routes[route];
    const routeAverage =
      routeData.requests === 0
        ? 0
        : toFixedNumber(routeData.totalResponseTimeMs / routeData.requests);

    routeMetrics[route] = {
      requests: routeData.requests,
      averageResponseMs: routeAverage,
      lastStatusCode: routeData.lastStatusCode
    };
  });

  res.json({
    uptimeSeconds: Math.floor(process.uptime()),
    totalRequests: metrics.totalRequests,
    averageResponseMs,
    routeMetrics
  });
});

app.get("/metrics/prometheus", (req, res) => {
  const averageResponseMs =
    metrics.totalRequests === 0
      ? 0
      : toFixedNumber(metrics.totalResponseTimeMs / metrics.totalRequests);

  const lines = [
    "# HELP pipeline_total_requests Total HTTP requests handled by the service",
    "# TYPE pipeline_total_requests counter",
    `pipeline_total_requests ${metrics.totalRequests}`,
    "# HELP pipeline_average_response_ms Average response time in milliseconds",
    "# TYPE pipeline_average_response_ms gauge",
    `pipeline_average_response_ms ${averageResponseMs}`,
    "# HELP pipeline_uptime_seconds Service uptime in seconds",
    "# TYPE pipeline_uptime_seconds gauge",
    `pipeline_uptime_seconds ${Math.floor(process.uptime())}`
  ];

  Object.keys(metrics.routes).forEach((route) => {
    const routeData = metrics.routes[route];
    const routeAverage =
      routeData.requests === 0
        ? 0
        : toFixedNumber(routeData.totalResponseTimeMs / routeData.requests);
    const metricLabel = routeMetricName(route);

    lines.push(`# HELP pipeline_route_requests_${metricLabel} Requests for route ${route}`);
    lines.push(`# TYPE pipeline_route_requests_${metricLabel} counter`);
    lines.push(`pipeline_route_requests_${metricLabel} ${routeData.requests}`);
    lines.push(`# HELP pipeline_route_average_response_ms_${metricLabel} Average response time for route ${route}`);
    lines.push(`# TYPE pipeline_route_average_response_ms_${metricLabel} gauge`);
    lines.push(`pipeline_route_average_response_ms_${metricLabel} ${routeAverage}`);
  });

  res
    .status(200)
    .type("text/plain; version=0.0.4; charset=utf-8")
    .send(`${lines.join("\n")}\n`);
});

app.get("/secret", (req, res) => {
  res.json({
    message: "You found the secret! Here's a cookie.",
    code: "OPERATION-PIPELINE"
  });
});

app.get("/coffee", (req, res) => {
  res.type("text/plain").send(`
    ( (
     ) )
  ........
  |      |]
  \\      /
   \`----'
`);
});

app.get("/", (req, res) => {
  const nowDate = new Date();
  const now = nowDate.toLocaleString("sv-SE", { timeZone: "Europe/Stockholm", dateStyle: "short", timeStyle: "short" });
  const host = req.get("host");
  const baseUrl = `${req.protocol}://${host}`;
  const repoUrl = REPO_URL;
  const actionsUrl = ACTIONS_URL;
  const deployUrl = DEPLOY_URL;
  const checklistUrl = `${repoUrl}/blob/main/${CHECKLIST_FILE_NAME}`;
  const checklistText = fs.existsSync(CHECKLIST_PATH)
    ? escapeHtml(fs.readFileSync(CHECKLIST_PATH, "utf8"))
    : escapeHtml("mission_challenges_checklist.txt is not available in this environment.");
  const teamName = "M4K Gang";
  const teamMembers = [
    "Carl Persson",
    "Jonny Nguyen",
    "Julia Persson",
    "Mattej Petrovic"
  ];
  const averageResponseMs =
    metrics.totalRequests === 0
      ? 0
      : toFixedNumber(metrics.totalResponseTimeMs / metrics.totalRequests);

  const quickLinks = [
    ["GitHub repository", repoUrl, "Source, commits and workflow history"],
    ["GitHub Actions pipeline", actionsUrl, "Build, test, scan and deploy"],
    ["Railway production URL", deployUrl, "Live environment for the deployed service"],
    ["Challenge checklist", checklistUrl, "Original mission brief in the repository"]
  ];
  const endpoints = [
    ["Status pulse", "/status", "Quick reachability response"],
    ["Health probe", "/health", "Readiness and liveness target"],
    ["JSON metrics", "/metrics", "Runtime counters and response timing"],
    ["Prometheus feed", "/metrics/prometheus", "Plain-text scrape endpoint"],
    ["Secret challenge", "/secret", "Bonus endpoint hidden in plain sight"],
    ["Coffee break", "/coffee", "ASCII morale boost for the crew"]
  ];
  const implementedItems = [
    "GitHub Actions on push and PR",
    "Automated tests in CI",
    "Docker build in CI",
    "Trivy scan with SARIF upload",
    "Live deployment on Railway",
    "Green CI badge in README",
    "Health endpoint and metrics endpoint",
    "Prometheus metrics export endpoint",
    "Secret challenge endpoints and pipeline art",
    "Slack notifications for success and failure with commit details",
    "Staging and production deploy workflow",
    "Chaos restart job for staging"
  ];
  const handoffItems = [
    ["Team name and members", true],
    ["GitHub repository URL", true],
    ["Deployed application URL", true],
    ["Screenshot of pipeline", false],
    ["Screenshot of deployed app", false],
    ["Optional: Trivy screenshot and architecture diagram", false]
  ];

  const teamMemberList = teamMembers
    .map((member) => `<li><span class="dot"></span>${escapeHtml(member)}</li>`)
    .join("");
  const quickLinksHtml = quickLinks
    .map(
      ([label, href, meta], index) => `
                <a class="link-card" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">
                  <span class="link-index">${String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>${escapeHtml(label)}</strong>
                    <small>${escapeHtml(meta)}</small>
                  </span>
                </a>`
    )
    .join("");
  const endpointsHtml = endpoints
    .map(
      ([label, route, meta]) => `
                <a class="endpoint-card" href="${escapeAttribute(baseUrl + route)}">
                  <span class="micro">${escapeHtml(label)}</span>
                  <strong>${escapeHtml(baseUrl + route)}</strong>
                  <small>${escapeHtml(meta)}</small>
                </a>`
    )
    .join("");
  const implementedHtml = implementedItems
    .map(
      (item) => `
                <li class="chip">
                  <span class="chip-mark">OK</span>
                  <span>${escapeHtml(item)}</span>
                </li>`
    )
    .join("");
  const handoffHtml = handoffItems
    .map(
      ([label, done]) => `
                <li class="handoff${done ? " done" : ""}">
                  <span class="handoff-mark">${done ? "READY" : "TODO"}</span>
                  <span>${escapeHtml(label)}</span>
                </li>`
    )
    .join("");

  res.type("html").send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>First Pipeline Challenge</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>
          :root {
            color-scheme: dark;
            --panel: rgba(12, 22, 27, 0.84);
            --line: rgba(112, 173, 166, 0.2);
            --line-strong: rgba(112, 173, 166, 0.42);
            --text: #f8f4ea;
            --muted: #9eb8b2;
            --accent: #5be1be;
            --accent-2: #ffb454;
            --accent-3: #d8ff72;
            --shadow: 0 28px 70px rgba(0, 0, 0, 0.38);
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
            background:
              radial-gradient(circle at 15% 18%, rgba(91, 225, 190, 0.15), transparent 20%),
              radial-gradient(circle at 86% 10%, rgba(255, 180, 84, 0.18), transparent 18%),
              linear-gradient(135deg, #071015 0%, #091015 42%, #0f1b20 100%);
            color: var(--text);
          }
          body::before {
            content: "";
            position: fixed;
            inset: 0;
            background:
              linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 42px 42px;
            mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent 82%);
            pointer-events: none;
          }
          a {
            color: inherit;
            text-decoration: none;
          }
          .shell {
            max-width: 1220px;
            margin: 0 auto;
            padding: 28px 20px 52px;
          }
          .panel {
            border: 1px solid var(--line);
            border-radius: 28px;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 24%),
              var(--panel);
            box-shadow: var(--shadow);
            backdrop-filter: blur(12px);
          }
          .hero {
            padding: 26px;
            margin-bottom: 18px;
          }
          .hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr);
            gap: 18px;
            align-items: stretch;
          }
          .row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
            margin-bottom: 16px;
          }
          .pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            border: 1px solid var(--line-strong);
            background: rgba(255, 255, 255, 0.03);
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.76rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
          .pill.live {
            color: var(--accent);
          }
          .pill.live::before {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 0 16px var(--accent);
            animation: pulse 2.1s ease-in-out infinite;
          }
          .pill.meta,
          .eyebrow,
          .micro,
          .small-note {
            color: var(--muted);
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.75rem;
            letter-spacing: 0.14em;
            text-transform: uppercase;
          }
          .eyebrow {
            display: block;
            margin-bottom: 10px;
            color: var(--accent-2);
          }
          h1 {
            margin: 0;
            max-width: 10ch;
            font-family: "Bricolage Grotesque", "Arial Black", sans-serif;
            font-size: clamp(3rem, 8vw, 5.8rem);
            line-height: 0.9;
            letter-spacing: -0.05em;
            text-transform: uppercase;
          }
          h2 {
            margin: 8px 0 0;
            font-family: "Bricolage Grotesque", "Arial Black", sans-serif;
            font-size: 1.4rem;
            letter-spacing: -0.03em;
          }
          p {
            margin: 0;
          }
          .lead,
          .copy,
          .signal-list,
          .link-card small,
          .endpoint-card small {
            color: var(--muted);
            line-height: 1.65;
          }
          .lead {
            max-width: 680px;
            margin: 18px 0 22px;
            font-size: 1.05rem;
          }
          .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 22px;
          }
          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 48px;
            padding: 0 18px;
            border-radius: 16px;
            font-weight: 600;
            transition: transform 180ms ease;
          }
          .button.primary {
            background: linear-gradient(135deg, var(--accent), #97ffdb);
            color: #082015;
          }
          .button.secondary {
            border: 1px solid var(--line-strong);
            background: rgba(255, 255, 255, 0.03);
          }
          .button:hover,
          .link-card:hover,
          .endpoint-card:hover {
            transform: translateY(-2px);
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 12px;
          }
          .stat {
            padding: 14px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.03);
          }
          .stat .micro {
            display: block;
            margin-bottom: 10px;
          }
          .stat strong {
            display: block;
            font-size: 1.18rem;
            line-height: 1.25;
          }
          .signal {
            padding: 22px;
            border-radius: 22px;
            border: 1px solid rgba(255, 255, 255, 0.07);
            background:
              radial-gradient(circle at center, rgba(91, 225, 190, 0.16), transparent 42%),
              linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015));
          }
          .orb {
            position: relative;
            aspect-ratio: 1;
            max-width: 220px;
            margin: 14px auto 18px;
            border-radius: 50%;
            border: 1px solid rgba(91, 225, 190, 0.4);
            background:
              radial-gradient(circle at center, rgba(91, 225, 190, 0.18), transparent 52%),
              repeating-radial-gradient(circle at center, rgba(91, 225, 190, 0.14) 0 1px, transparent 1px 34px);
            overflow: hidden;
          }
          .orb::before {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            width: 50%;
            height: 1px;
            background: linear-gradient(90deg, rgba(91, 225, 190, 0.95), transparent);
            transform-origin: 0 0;
            animation: sweep 4.8s linear infinite;
            box-shadow: 0 0 14px rgba(91, 225, 190, 0.7);
          }
          .signal-list div {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
          }
          .label {
            color: var(--muted);
          }
          .value {
            color: var(--text);
            font-weight: 600;
            word-break: break-word;
          }
          .grid,
          .bottom {
            display: grid;
            gap: 18px;
            margin-bottom: 18px;
          }
          .grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .bottom {
            grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          }
          .section {
            padding: 22px;
          }
          .copy {
            margin-top: 8px;
          }
          .stack,
          .team-list,
          .pipeline-list,
          .handoff-list {
            display: grid;
            gap: 12px;
          }
          .link-card,
          .endpoint-card {
            display: grid;
            gap: 6px;
            padding: 16px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(255, 255, 255, 0.03);
          }
          .link-card {
            grid-template-columns: auto 1fr;
            gap: 14px;
            align-items: start;
          }
          .link-index {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            aspect-ratio: 1;
            border-radius: 14px;
            background: linear-gradient(135deg, rgba(91, 225, 190, 0.2), rgba(255, 180, 84, 0.12));
            color: var(--accent-3);
            font-family: "IBM Plex Mono", monospace;
          }
          .link-card strong,
          .endpoint-card strong {
            display: block;
            font-size: 1rem;
          }
          .endpoint-card strong {
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.88rem;
            color: #dcfff5;
            word-break: break-word;
          }
          .team-list {
            list-style: none;
            margin: 18px 0 0;
            padding: 0;
          }
          .team-list li {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
          }
          .team-list li:first-child {
            border-top: 0;
          }
          .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-2), var(--accent));
            box-shadow: 0 0 12px rgba(91, 225, 190, 0.45);
          }
          .rail {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 14px 0 20px;
          }
          .rail-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, rgba(91, 225, 190, 0.42), rgba(255, 180, 84, 0.24));
          }
          .pipeline-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            list-style: none;
            margin: 0;
            padding: 0;
          }
          .chip,
          .handoff {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 60px;
            padding: 14px 16px;
            border-radius: 18px;
            border: 1px solid rgba(255, 255, 255, 0.06);
            background: rgba(255, 255, 255, 0.03);
          }
          .chip-mark,
          .handoff-mark {
            min-width: 64px;
            padding: 7px 10px;
            border-radius: 999px;
            text-align: center;
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.72rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .chip-mark,
          .handoff.done .handoff-mark {
            background: rgba(91, 225, 190, 0.14);
            color: var(--accent);
          }
          .handoff:not(.done) .handoff-mark {
            background: rgba(255, 180, 84, 0.14);
            color: var(--accent-2);
          }
          .handoff-list {
            list-style: none;
            margin: 18px 0 0;
            padding: 0;
          }
          pre {
            margin: 18px 0 0;
            padding: 18px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 16%),
              rgba(5, 10, 12, 0.86);
            color: #d7fff4;
            font-family: "IBM Plex Mono", monospace;
            font-size: 0.92rem;
            line-height: 1.7;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-x: auto;
          }
          code {
            font-family: "IBM Plex Mono", monospace;
          }
          .small-note {
            display: block;
            margin-top: 14px;
          }
          .dossier pre {
            max-height: 420px;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.22); }
          }
          @keyframes sweep {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @media (max-width: 1080px) {
            .hero-grid,
            .grid,
            .bottom,
            .pipeline-list,
            .stats {
              grid-template-columns: 1fr;
            }
            h1 {
              max-width: none;
            }
          }
          @media (max-width: 720px) {
            .shell {
              padding: 16px 14px 34px;
            }
            .hero,
            .section {
              padding: 18px;
            }
            .actions {
              flex-direction: column;
            }
            .button,
            .pill {
              width: 100%;
              justify-content: center;
            }
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <section class="panel hero">
            <div class="hero-grid">
              <div>
                <div class="row">
                  <span class="pill live">Pipeline app is running</span>
                  <span class="pill meta">First Pipeline Challenge</span>
                  <span class="pill meta">Mission Control</span>
                </div>
                <p class="eyebrow">M4K delivery line</p>
                <h1>Mission Control</h1>
                <p class="lead">A more intentional cockpit for the pipeline: live telemetry, deploy targets, runtime checks, progress tracking and handoff prep arranged like an operations board instead of a default dashboard.</p>
                <div class="actions">
                  <a class="button primary" href="${escapeAttribute(actionsUrl)}" target="_blank" rel="noreferrer">Open pipeline</a>
                  <a class="button secondary" href="${escapeAttribute(deployUrl)}" target="_blank" rel="noreferrer">Open production app</a>
                </div>
                <div class="stats">
                  <div class="stat"><span class="micro">Uptime</span><strong>${Math.floor(process.uptime())}s</strong></div>
                  <div class="stat"><span class="micro">Total requests</span><strong>${metrics.totalRequests}</strong></div>
                  <div class="stat"><span class="micro">Avg response</span><strong>${averageResponseMs} ms</strong></div>
                  <div class="stat"><span class="micro">App version</span><strong>v${escapeHtml(APP_VERSION)}</strong></div>
                  <div class="stat"><span class="micro">Server time</span><strong style="font-size:0.75rem;line-height:1.3;word-break:break-word;">${escapeHtml(now)}</strong></div>
                </div>
              </div>

              <aside class="signal">
                <p class="eyebrow">Live service stats</p>
                <h2>Runtime Snapshot</h2>
                <p class="copy">Operational signals that matter first when something moves, stalls or breaks.</p>
                <div class="orb" aria-hidden="true"></div>
                <div class="signal-list">
                  <div><span class="label">Host</span><span class="value">${escapeHtml(host)}</span></div>
                  <div><span class="label">Base URL</span><span class="value">${escapeHtml(baseUrl)}</span></div>
                  <div><span class="label">Deploy target</span><span class="value">${escapeHtml(deployUrl)}</span></div>
                  <div><span class="label">Repository</span><span class="value">${escapeHtml(repoUrl)}</span></div>
                </div>
              </aside>
            </div>
          </section>

          <section class="grid">
            <article class="panel section">
              <p class="eyebrow">Project links</p>
              <h2>Core Links</h2>
              <p class="copy">Jump straight to the important surfaces in the delivery system.</p>
              <div class="stack">
${quickLinksHtml}
              </div>
            </article>

            <article class="panel section">
              <p class="eyebrow">Verification</p>
              <h2>API Endpoints</h2>
              <p class="copy">Every diagnostic and demo route surfaced as a first-class control.</p>
              <div class="stack">
${endpointsHtml}
              </div>
            </article>

            <article class="panel section">
              <p class="eyebrow">Crew manifest</p>
              <h2>${escapeHtml(teamName)}</h2>
              <p class="copy">The crew behind the pipeline, listed where you would expect to see the operating roster.</p>
              <ul class="team-list">
                ${teamMemberList}
              </ul>
            </article>
          </section>

          <section class="panel section">
            <p class="eyebrow">Challenge progress</p>
            <h2>Implemented Pipeline Coverage</h2>
            <p class="copy">A clean view of what is already wired into the build, deploy and monitoring chain.</p>
            <div class="rail">
              <span class="micro">Build</span>
              <span class="rail-line"></span>
              <span class="micro">Verify</span>
              <span class="rail-line"></span>
              <span class="micro">Ship</span>
            </div>
            <ul class="pipeline-list">
${implementedHtml}
            </ul>
          </section>

          <section class="bottom">
            <article class="panel section">
              <p class="eyebrow">Submission</p>
              <h2>Hand-in Checklist</h2>
              <p class="copy">What is already ready, and what still needs a screenshot or artifact before handoff.</p>
              <ul class="handoff-list">
${handoffHtml}
              </ul>
            </article>

            <article class="panel section">
              <p class="eyebrow">Quick commands</p>
              <h2>Final Verification</h2>
              <p class="copy">The shortest path to proving the system still behaves end to end.</p>
              <pre>npm test
docker build -t first-pipeline:latest .
curl ${baseUrl}/status
curl ${baseUrl}/health
curl ${baseUrl}/metrics
curl ${baseUrl}/metrics/prometheus
curl ${baseUrl}/secret</pre>
              <span class="small-note">For local Trivy report use <code>trivy-report.txt</code>.</span>
            </article>
          </section>

          <section class="panel section dossier">
            <p class="eyebrow">Full mission file</p>
            <h2>mission_challenges_checklist.txt</h2>
            <p class="copy">The original mission brief remains embedded here for one-screen review.</p>
            <pre>${checklistText}</pre>
          </section>
        </main>
      </body>
    </html>
  `);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
