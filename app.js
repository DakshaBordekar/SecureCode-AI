const repositories = [
  {
    name: "payments-service",
    branch: "main",
    language: "JS",
    score: 71,
    critical: 1,
    high: 2,
    medium: 3,
    scanned: "8 min ago",
  },
  {
    name: "identity-api",
    branch: "release/v2",
    language: "PY",
    score: 84,
    critical: 0,
    high: 1,
    medium: 2,
    scanned: "2 hours ago",
  },
  {
    name: "merchant-dashboard",
    branch: "develop",
    language: "TS",
    score: 93,
    critical: 0,
    high: 0,
    medium: 1,
    scanned: "Yesterday",
  },
];

const findings = [
  {
    id: "SC-1042",
    severity: "critical",
    title: "SQL query built from untrusted input",
    path: "src/api/orders.js:42",
    confidence: 98,
    cwe: "CWE-89",
    impact: "Database access",
    description:
      "The order identifier is inserted directly into a SQL statement. An attacker could modify the query and access or change protected records.",
    before: [
      "export async function getOrder(req, res) {",
      "  const orderId = req.params.id;",
      "",
      "  const result = await db.query(",
      '    `SELECT * FROM orders WHERE id = ${orderId}`',
      "  );",
      "",
      "  return res.json(result.rows[0]);",
      "}",
    ],
    after: [
      "export async function getOrder(req, res) {",
      "  const orderId = req.params.id;",
      "",
      "  const result = await db.query(",
      '    "SELECT * FROM orders WHERE id = $1",',
      "    [orderId]",
      "  );",
      "",
      "  return res.json(result.rows[0]);",
      "}",
    ],
    changed: [4, 5, 6],
  },
  {
    id: "SC-1039",
    severity: "high",
    title: "Hardcoded production API key",
    path: "src/config/payment.js:7",
    confidence: 97,
    cwe: "CWE-798",
    impact: "Credential exposure",
    description:
      "A live payment credential is stored in source code. Anyone with repository access can retrieve and misuse the secret.",
    before: [
      "export const paymentConfig = {",
      '  provider: "stripe",',
      '  secretKey: "sk_live_51N8cP0f3D9",',
      '  webhookVersion: "2023-10-16",',
      "};",
    ],
    after: [
      "export const paymentConfig = {",
      '  provider: "stripe",',
      "  secretKey: process.env.STRIPE_SECRET_KEY,",
      '  webhookVersion: "2023-10-16",',
      "};",
    ],
    changed: [3],
  },
  {
    id: "SC-1034",
    severity: "high",
    title: "JWT signed with a weak static secret",
    path: "src/auth/token.js:18",
    confidence: 93,
    cwe: "CWE-321",
    impact: "Account takeover",
    description:
      "Authentication tokens use a predictable signing value. Forged tokens could allow an attacker to impersonate another user.",
    before: [
      "export function issueToken(user) {",
      "  return jwt.sign(",
      "    { id: user.id, role: user.role },",
      '    "secret123",',
      '    { expiresIn: "7d" }',
      "  );",
      "}",
    ],
    after: [
      "export function issueToken(user) {",
      "  return jwt.sign(",
      "    { id: user.id, role: user.role },",
      "    process.env.JWT_SIGNING_SECRET,",
      '    { expiresIn: "15m", algorithm: "HS256" }',
      "  );",
      "}",
    ],
    changed: [4, 5],
  },
  {
    id: "SC-1027",
    severity: "medium",
    title: "User input rendered without sanitization",
    path: "src/views/profile.js:31",
    confidence: 89,
    cwe: "CWE-79",
    impact: "Browser session",
    description:
      "Profile content is inserted as HTML without sanitization, allowing saved scripts to execute in another user's browser.",
    before: [
      "function ProfileBio({ user }) {",
      "  return (",
      "    <div",
      "      dangerouslySetInnerHTML={{ __html: user.bio }}",
      "    />",
      "  );",
      "}",
    ],
    after: [
      "function ProfileBio({ user }) {",
      "  const safeBio = DOMPurify.sanitize(user.bio);",
      "  return (",
      "    <div",
      "      dangerouslySetInnerHTML={{ __html: safeBio }}",
      "    />",
      "  );",
      "}",
    ],
    changed: [2, 5],
  },
];

const state = {
  route: "overview",
  filter: "all",
  selectedFinding: findings[0].id,
  codeMode: "diff",
  scanRunning: false,
  scanHasRun: false,
  scanProgress: 100,
  scanStep: 4,
  mobileOpen: false,
  reviewed: new Map(),
};

const routeMeta = {
  overview: ["Overview", "Security posture"],
  scan: ["New scan", "Repository analysis"],
  findings: ["Findings", "payments-service"],
  improvement: ["Model improvement", "Feedback loop"],
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function syntaxLine(line) {
  return escapeHtml(line)
    .replace(
      /\b(export|async|function|const|return|await|process|env)\b/g,
      '<span class="token-key">$1</span>',
    )
    .replace(
      /(&quot;.*?&quot;|`.*?`)/g,
      '<span class="token-string">$1</span>',
    )
    .replace(
      /\b(query|json|sign|sanitize)\b/g,
      '<span class="token-fn">$1</span>',
    );
}

function navigate(route) {
  state.route = route;
  state.mobileOpen = false;
  window.location.hash = route;
  render();
}

function sidebar() {
  const items = [
    ["overview", "01", "Overview"],
    ["scan", "+", "New scan"],
    ["findings", "!", "Findings"],
    ["improvement", "^", "Model improvement"],
  ];

  return `
    <aside class="sidebar ${state.mobileOpen ? "open" : ""}">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"></div>
        <div>
          <div class="brand-name">SecureCode <span>AI</span></div>
          <div class="brand-caption">Review console</div>
        </div>
      </div>
      <div class="nav-label">Workspace</div>
      <nav class="nav" aria-label="Main navigation">
        ${items
          .map(
            ([route, icon, label]) => `
              <button class="nav-button ${state.route === route ? "active" : ""}" data-route="${route}">
                <span class="nav-icon">${icon}</span>
                <span>${label}</span>
                ${route === "findings" ? '<span class="nav-badge">4</span>' : ""}
              </button>
            `,
          )
          .join("")}
      </nav>
      <div class="sidebar-foot">
        <div class="workspace-status">
          <span class="status-dot"></span>
          All systems operational
        </div>
        <div class="workspace-plan">Team workspace · Prototype</div>
      </div>
    </aside>
  `;
}

function topbar() {
  const [title, detail] = routeMeta[state.route];
  return `
    <header class="topbar">
      <div class="topbar-actions">
        <button class="icon-button mobile-menu" id="mobile-menu" aria-label="Open menu">=</button>
        <div class="crumb">SecureCode AI&nbsp;&nbsp;/&nbsp;&nbsp;<strong>${title}</strong>&nbsp;&nbsp;/&nbsp;&nbsp;${detail}</div>
      </div>
      <div class="topbar-actions">
        <button class="icon-button" id="notifications" aria-label="Notifications" title="Notifications">!</button>
        <div class="avatar" title="Subhasish">SM</div>
      </div>
    </header>
  `;
}

function overviewPage() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <div class="eyebrow">Tuesday, 28 July</div>
          <h1>Security overview</h1>
          <p class="page-subtitle">Your codebase is improving. Two high-priority findings still require review.</p>
        </div>
        <button class="button primary" data-route="scan"><span class="button-symbol">+</span> Start new scan</button>
      </div>

      <div class="stats-grid">
        ${stat("Security score", "84", "+6 this week", "Across 3 repositories")}
        ${stat("Open findings", "10", "4 need review", "1 critical · 3 high")}
        ${stat("Patches accepted", "28", "87% rate", "Last 30 days")}
        ${stat("Time saved", "17.4h", "+3.2h", "Estimated this month")}
      </div>

      <div class="dashboard-grid">
        <section class="panel">
          <div class="panel-header">
            <div><h2>Repositories</h2><p class="panel-subtitle">Latest security posture</p></div>
            <button class="text-button" data-route="scan">Connect repository</button>
          </div>
          <div class="repo-list">
            ${repositories.map(repoRow).join("")}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div><h2>Recent activity</h2><p class="panel-subtitle">Agent and reviewer actions</p></div>
            <button class="text-button" id="clear-activity">Mark read</button>
          </div>
          <div class="activity-list">
            ${activity("AutoFix prepared a safe parameterized query", "payments-service · 8 min ago")}
            ${activity("Verification passed all 24 security checks", "identity-api · 2 hours ago")}
            ${activity("Aarav accepted the JWT rotation patch", "identity-api · 3 hours ago")}
            ${activity("Model v2.4 reached 91% patch acceptance", "Feedback loop · Yesterday")}
          </div>
        </section>
      </div>

      <div class="health-strip">
        <div class="health-icon">✓</div>
        <div class="health-copy">
          <strong>Protection is active across every connected repository</strong>
          <span>Next scheduled scan: tomorrow at 09:00 · Security rules updated 12 minutes ago</span>
        </div>
      </div>
    </section>
  `;
}

function stat(label, value, trend, meta) {
  return `
    <div class="stat">
      <div class="stat-top"><span class="stat-label">${label}</span><span class="trend">${trend}</span></div>
      <div class="stat-value">${value}</div>
      <div class="stat-meta">${meta}</div>
    </div>
  `;
}

function repoRow(repo) {
  return `
    <button class="repo-row" data-open-repo="${repo.name}">
      <div class="repo-main">
        <div class="repo-icon">${repo.language}</div>
        <div>
          <div class="repo-name">${repo.name}</div>
          <div class="repo-branch">branch/${repo.branch}</div>
        </div>
      </div>
      <div>
        <div class="risk-counts">
          <span class="risk-pill critical">${repo.critical}</span>
          <span class="risk-pill high">${repo.high}</span>
          <span class="risk-pill medium">${repo.medium}</span>
        </div>
        <div class="repo-time">critical · high · medium</div>
      </div>
      <div class="score">
        <span class="score-ring" style="--score:${repo.score}"></span>
        ${repo.score}
      </div>
      <div>
        <div class="repo-time">${repo.scanned}</div>
      </div>
    </button>
  `;
}

function activity(title, meta) {
  return `<div class="activity"><div class="activity-title">${title}</div><div class="activity-meta">${meta}</div></div>`;
}

function scanPage() {
  if (state.scanRunning || state.scanHasRun) {
    return scanProgressPage();
  }

  return `
    <section class="page">
      <div class="page-header">
        <div>
          <div class="eyebrow">AI security review</div>
          <h1>Start a new scan</h1>
          <p class="page-subtitle">Analyze a repository with specialized agents and generate verified, review-ready patches.</p>
        </div>
      </div>
      <section class="panel scan-launch">
        <div class="scan-dropzone">
          <div class="drop-inner">
            <div class="drop-icon">&lt;/&gt;</div>
            <div class="drop-title">Select a connected repository</div>
            <div class="drop-copy">SecureCode AI analyzes source files in a protected workspace. Your code is never used for shared model training.</div>
            <button class="button" id="choose-repo">Browse repositories</button>
          </div>
        </div>
        <div class="scan-config">
          <div class="field">
            <label for="repository">Repository</label>
            <select id="repository">
              ${repositories.map((repo) => `<option>${repo.name}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="branch">Branch</label>
            <select id="branch"><option>main</option><option>develop</option><option>release/v2</option></select>
          </div>
          <div class="field">
            <label for="scan-depth">Scan depth</label>
            <select id="scan-depth"><option>Full repository</option><option>Changed files only</option><option>Critical paths</option></select>
          </div>
        </div>
        <div class="review-footer">
          <div class="verification">✓ Secrets remain masked during analysis</div>
          <button class="button primary" id="run-scan">Run security scan <span class="button-symbol">→</span></button>
        </div>
      </section>
    </section>
  `;
}

function scanProgressPage() {
  const agents = [
    ["Planner", "Mapping attack surface"],
    ["Security", "Scanning vulnerable flows"],
    ["Critic", "Removing false positives"],
    ["AutoFix", "Preparing safe patches"],
  ];
  const complete = state.scanProgress === 100;
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <div class="eyebrow">${complete ? "Analysis complete" : "Scan in progress"}</div>
          <h1>${complete ? "4 findings need attention" : "Reviewing payments-service"}</h1>
          <p class="page-subtitle">${complete ? "Every finding has been challenged by the Critic agent and matched with a verified patch." : "Specialized agents are tracing data flow, validating findings, and preparing fixes."}</p>
        </div>
        ${complete ? '<button class="button primary" data-route="findings">Review findings <span class="button-symbol">→</span></button>' : '<button class="button" id="cancel-scan">Cancel scan</button>'}
      </div>
      ${agentTrack()}
      <div class="stats-grid">
        ${stat("Files analyzed", complete ? "184" : Math.floor(184 * state.scanProgress / 100), "Live", "JavaScript · JSON · YAML")}
        ${stat("Data flows traced", complete ? "37" : Math.floor(37 * state.scanProgress / 100), "Live", "Inputs to sensitive sinks")}
        ${stat("Findings verified", complete ? "4" : Math.floor(4 * state.scanProgress / 100), "Critic checked", "False positives removed")}
        ${stat("Patches ready", complete ? "4" : Math.max(0, Math.floor(4 * (state.scanProgress - 55) / 45)), "AutoFix", "Syntax and tests verified")}
      </div>
      <section class="panel">
        <div class="panel-header"><div><h2>Live analysis log</h2><p class="panel-subtitle">Agent decisions in plain language</p></div><span class="confidence">${state.scanProgress}% complete</span></div>
        <div class="activity-list">
          ${activity("Planner mapped 12 external input routes", "Completed · 1.2s")}
          ${state.scanProgress > 22 ? activity("Security agent traced request data into an unsafe SQL query", "Critical candidate · orders.js:42") : ""}
          ${state.scanProgress > 45 ? activity("Critic confirmed the query is reachable without sanitization", "98% confidence · CWE-89") : ""}
          ${state.scanProgress > 68 ? activity("AutoFix replaced string interpolation with a parameterized query", "Patch generated · 3 lines changed") : ""}
          ${state.scanProgress > 88 ? activity("Verification passed syntax, unit, and exploit checks", "24/24 checks passed") : ""}
        </div>
      </section>
    </section>
  `;
}

function agentTrack() {
  const agents = [
    ["Planner", "Maps code and risks"],
    ["Security", "Finds attack paths"],
    ["Critic", "Challenges evidence"],
    ["AutoFix", "Builds verified patch"],
  ];
  return `
    <section class="agent-track">
      <div class="agent-track-head">
        <div><h2>Agent workflow</h2><p class="panel-subtitle">Each result must pass an independent challenge</p></div>
        <div class="scan-state"><span class="status-dot"></span>${state.scanProgress === 100 ? "Completed in 18.4 seconds" : "Agents working"}</div>
      </div>
      <div class="agent-steps">
        ${agents
          .map((agent, index) => {
            const step = index + 1;
            const status = state.scanStep > step || state.scanProgress === 100 ? "complete" : state.scanStep === step ? "running" : "";
            return `<div class="agent-step ${status}"><div class="agent-number">0${step} ${status === "complete" ? "✓" : ""}</div><div class="agent-name">${agent[0]}</div><div class="agent-detail">${agent[1]}</div></div>`;
          })
          .join("")}
      </div>
      <div class="progress-line"><div class="progress-fill" style="--progress:${state.scanProgress}%"></div></div>
    </section>
  `;
}

function findingsPage() {
  const visible = state.filter === "all" ? findings : findings.filter((finding) => finding.severity === state.filter);
  const selected = findings.find((finding) => finding.id === state.selectedFinding) || visible[0] || findings[0];
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <div class="eyebrow">Scan SCAN-2841 · Completed</div>
          <h1>Review security findings</h1>
          <p class="page-subtitle">Four verified vulnerabilities were found in payments-service. Review the evidence before accepting each patch.</p>
        </div>
        <button class="button" id="export-report"><span class="button-symbol">↓</span> Export report</button>
      </div>
      ${agentTrack()}
      <div class="findings-layout">
        <section class="panel findings-panel">
          <div class="panel-header"><div><h2>Findings</h2><p class="panel-subtitle">${visible.length} of ${findings.length} issues shown</p></div></div>
          <div class="filter-bar">
            ${["all", "critical", "high", "medium"].map((filter) => `<button class="filter ${state.filter === filter ? "active" : ""}" data-filter="${filter}">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join("")}
          </div>
          <div>
            ${visible.length ? visible.map(findingItem).join("") : '<div class="empty-state">No findings match this filter.</div>'}
          </div>
        </section>
        ${findingDetail(selected)}
      </div>
    </section>
  `;
}

function findingItem(finding) {
  const reviewed = state.reviewed.get(finding.id);
  return `
    <button class="finding-item ${state.selectedFinding === finding.id ? "selected" : ""}" data-finding="${finding.id}">
      <div class="finding-top">
        <span class="severity ${finding.severity}">${finding.severity}</span>
        <span class="confidence">${reviewed ? reviewed.toUpperCase() : `${finding.confidence}% confidence`}</span>
      </div>
      <div class="finding-title">${finding.title}</div>
      <div class="finding-path">${finding.path}</div>
    </button>
  `;
}

function findingDetail(finding) {
  const reviewState = state.reviewed.get(finding.id);
  return `
    <section class="panel detail-panel">
      <div class="detail-summary">
        <div class="detail-summary-top">
          <div>
            <span class="severity ${finding.severity}">${finding.severity}</span>
            <h2 class="detail-title">${finding.title}</h2>
            <p class="detail-description">${finding.description}</p>
          </div>
          <span class="confidence">${finding.id}</span>
        </div>
        <div class="detail-metrics">
          <div><div class="metric-label">Category</div><div class="metric-value">${finding.cwe}</div></div>
          <div><div class="metric-label">Confidence</div><div class="metric-value">${finding.confidence}%</div></div>
          <div><div class="metric-label">Impact</div><div class="metric-value">${finding.impact}</div></div>
        </div>
      </div>
      <div class="code-toolbar">
        <div class="file-path">${finding.path}</div>
        <div class="code-tabs">
          ${["diff", "original", "patched"].map((mode) => `<button class="code-tab ${state.codeMode === mode ? "active" : ""}" data-code-mode="${mode}">${mode[0].toUpperCase() + mode.slice(1)}</button>`).join("")}
        </div>
      </div>
      ${codeView(finding)}
      <div class="review-footer">
        <div class="verification">${reviewState === "accepted" ? "✓ Patch accepted and added to feedback" : reviewState === "rejected" ? "Patch rejected · feedback recorded" : "✓ Syntax · Security · Tests passed"}</div>
        <div class="review-actions">
          <button class="button danger" id="reject-patch" ${reviewState ? "disabled" : ""}>Reject</button>
          <button class="button primary" id="accept-patch" ${reviewState ? "disabled" : ""}>Accept secure patch</button>
        </div>
      </div>
    </section>
  `;
}

function buildLineDiff(before, after) {
  const rows = Array.from({ length: before.length + 1 }, () =>
    Array(after.length + 1).fill(0),
  );

  for (let oldIndex = before.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = after.length - 1; newIndex >= 0; newIndex -= 1) {
      rows[oldIndex][newIndex] =
        before[oldIndex] === after[newIndex]
          ? rows[oldIndex + 1][newIndex + 1] + 1
          : Math.max(rows[oldIndex + 1][newIndex], rows[oldIndex][newIndex + 1]);
    }
  }

  const diff = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < before.length || newIndex < after.length) {
    if (
      oldIndex < before.length &&
      newIndex < after.length &&
      before[oldIndex] === after[newIndex]
    ) {
      diff.push([newIndex + 1, " ", after[newIndex], ""]);
      oldIndex += 1;
      newIndex += 1;
    } else if (
      oldIndex < before.length &&
      (newIndex === after.length ||
        rows[oldIndex + 1][newIndex] >= rows[oldIndex][newIndex + 1])
    ) {
      diff.push([oldIndex + 1, "-", before[oldIndex], "removed"]);
      oldIndex += 1;
    } else {
      diff.push([newIndex + 1, "+", after[newIndex], "added"]);
      newIndex += 1;
    }
  }

  return diff;
}

function codeView(finding) {
  let rows = [];
  if (state.codeMode === "original") {
    rows = finding.before.map((line, index) => [index + 1, " ", line, finding.changed.includes(index + 1) ? "removed" : ""]);
  } else if (state.codeMode === "patched") {
    rows = finding.after.map((line, index) => [index + 1, " ", line, finding.changed.includes(index + 1) ? "added" : ""]);
  } else {
    rows = buildLineDiff(finding.before, finding.after);
  }

  return `
    <div class="code-view" aria-label="${state.codeMode} code">
      ${rows
        .map(
          ([number, sign, line, className]) => `
            <div class="code-line ${className}">
              <span class="line-no">${number}</span>
              <span class="line-sign">${sign}</span>
              <span class="line-code">${syntaxLine(line)}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function improvementPage() {
  return `
    <section class="page">
      <div class="page-header">
        <div>
          <div class="eyebrow">Human-guided learning</div>
          <h1>The model improves with every review</h1>
          <p class="page-subtitle">Accepted and rejected patches become structured feedback, increasing precision without training on raw private code.</p>
        </div>
        <button class="button" id="model-details">View evaluation report</button>
      </div>
      <div class="model-grid">
        <section class="panel comparison">
          <div><h2>Model performance</h2><p class="panel-subtitle">Evaluation on 240 held-out security cases</p></div>
          <div class="model-cards">
            <div class="model-card">
              <div class="model-card-top"><span class="model-version">SecureCode v1.8</span><span class="confidence">Previous</span></div>
              <div class="model-score">76<span>/100</span></div>
              <div class="model-caption">Baseline security score</div>
            </div>
            <div class="model-card current">
              <div class="model-card-top"><span class="model-version">SecureCode v2.4</span><span class="current-label">Current</span></div>
              <div class="model-score">91<span>/100</span></div>
              <div class="model-caption">+15 points from verified feedback</div>
            </div>
          </div>
          <div class="bars">
            ${bar("Finding precision", 94)}
            ${bar("Patch acceptance", 87)}
            ${bar("Exploit prevention", 96)}
            ${bar("False positive control", 89)}
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><div><h2>Feedback stream</h2><p class="panel-subtitle">Recent human decisions</p></div><span class="trend">128 samples</span></div>
          <div class="feedback-feed">
            ${feedback("✓", "Parameterized query patch accepted", "SQL injection · payments-service")}
            ${feedback("✓", "JWT lifetime reduction accepted", "Authentication · identity-api")}
            ${feedback("×", "CORS finding rejected as intended behavior", "Configuration · merchant-dashboard")}
            ${feedback("✓", "Secret moved to environment storage", "Credential safety · payments-service")}
            ${feedback("✓", "Regression suite confirmed secure behavior", "Verification agent · 24 checks")}
          </div>
        </section>
      </div>
      <div class="health-strip">
        <div class="health-icon">+15</div>
        <div class="health-copy"><strong>Version 2.4 catches more real issues with fewer interruptions</strong><span>Precision increased 18% while false positives fell 31% across the evaluation set.</span></div>
      </div>
    </section>
  `;
}

function bar(label, value) {
  return `<div class="bar-row"><span class="bar-label">${label}</span><div class="bar-track"><div class="bar-fill" style="--width:${value}%"></div></div><span class="bar-value">${value}%</span></div>`;
}

function feedback(mark, copy, meta) {
  return `<div class="feedback-item"><div class="feedback-mark">${mark}</div><div class="feedback-copy">${copy}<span>${meta}</span></div></div>`;
}

function appTemplate() {
  let content = overviewPage();
  if (state.route === "scan") content = scanPage();
  if (state.route === "findings") content = findingsPage();
  if (state.route === "improvement") content = improvementPage();

  return `<div class="app-shell">${sidebar()}<main class="main">${topbar()}${content}</main></div>`;
}

function render() {
  document.querySelector("#app").innerHTML = appTemplate();
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });

  document.querySelector("#mobile-menu")?.addEventListener("click", () => {
    state.mobileOpen = !state.mobileOpen;
    render();
  });

  document.querySelector("#notifications")?.addEventListener("click", () => {
    toast("No new security alerts.");
  });

  document.querySelector("#clear-activity")?.addEventListener("click", (event) => {
    event.currentTarget.textContent = "All read";
    event.currentTarget.disabled = true;
    toast("Activity marked as read.");
  });

  document.querySelectorAll("[data-open-repo]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFinding = findings[0].id;
      navigate("findings");
    });
  });

  document.querySelector("#choose-repo")?.addEventListener("click", showRepositoryModal);
  document.querySelector("#run-scan")?.addEventListener("click", startScan);
  document.querySelector("#cancel-scan")?.addEventListener("click", () => {
    state.scanRunning = false;
    state.scanHasRun = false;
    state.scanProgress = 100;
    render();
    toast("Scan cancelled.");
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      const visible = state.filter === "all" ? findings : findings.filter((finding) => finding.severity === state.filter);
      if (visible.length && !visible.some((finding) => finding.id === state.selectedFinding)) {
        state.selectedFinding = visible[0].id;
      }
      render();
    });
  });

  document.querySelectorAll("[data-finding]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFinding = button.dataset.finding;
      state.codeMode = "diff";
      render();
    });
  });

  document.querySelectorAll("[data-code-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.codeMode = button.dataset.codeMode;
      render();
    });
  });

  document.querySelector("#accept-patch")?.addEventListener("click", () => reviewPatch("accepted"));
  document.querySelector("#reject-patch")?.addEventListener("click", () => reviewPatch("rejected"));
  document.querySelector("#export-report")?.addEventListener("click", exportReport);
  document.querySelector("#model-details")?.addEventListener("click", () => toast("Evaluation report prepared for the demo."));
}

function showRepositoryModal() {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head"><h2 id="modal-title">Connected repositories</h2><button class="icon-button" data-close aria-label="Close">×</button></div>
      <div class="modal-body">
        ${repositories.map((repo, index) => `<label class="repo-row" style="grid-template-columns:35px 1fr 60px;min-height:58px;padding:10px;border:1px solid var(--line);border-radius:6px"><input type="radio" name="repo-choice" value="${repo.name}" ${index === 0 ? "checked" : ""}><span><strong class="repo-name">${repo.name}</strong><span class="repo-time">branch/${repo.branch}</span></span><span class="score">${repo.score}</span></label>`).join("")}
      </div>
      <div class="modal-foot"><button class="button" data-close>Cancel</button><button class="button primary" id="select-repo">Use repository</button></div>
    </div>
  `;
  document.body.append(backdrop);
  backdrop.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => backdrop.remove()));
  backdrop.querySelector("#select-repo").addEventListener("click", () => {
    const selection = backdrop.querySelector('input[name="repo-choice"]:checked').value;
    document.querySelector("#repository").value = selection;
    backdrop.remove();
    toast(`${selection} selected.`);
  });
}

function startScan() {
  state.scanRunning = true;
  state.scanHasRun = true;
  state.scanProgress = 5;
  state.scanStep = 1;
  render();

  const interval = window.setInterval(() => {
    if (!state.scanRunning) {
      window.clearInterval(interval);
      return;
    }
    state.scanProgress = Math.min(100, state.scanProgress + 7);
    state.scanStep = Math.min(4, Math.floor(state.scanProgress / 25) + 1);
    if (state.scanProgress === 100) {
      state.scanRunning = false;
      window.clearInterval(interval);
      toast("Scan complete. Four verified findings are ready.");
    }
    render();
  }, 420);
}

function reviewPatch(decision) {
  state.reviewed.set(state.selectedFinding, decision);
  render();
  toast(decision === "accepted" ? "Patch accepted. Feedback sample created." : "Patch rejected. Your decision was recorded.");
}

function exportReport() {
  const report = [
    "SecureCode AI - Security Review",
    "Repository: payments-service",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    ...findings.map((finding) => `${finding.severity.toUpperCase()} | ${finding.title} | ${finding.path} | ${finding.confidence}% confidence`),
  ].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([report], { type: "text/plain" }));
  link.download = "securecode-ai-report.txt";
  link.click();
  URL.revokeObjectURL(link.href);
  toast("Security report exported.");
}

function toast(message) {
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `<span class="toast-mark">✓</span><span>${message}</span>`;
  document.querySelector("#toast-region").append(item);
  window.setTimeout(() => item.remove(), 3200);
}

window.addEventListener("hashchange", () => {
  const route = window.location.hash.replace("#", "");
  if (routeMeta[route]) {
    state.route = route;
    render();
  }
});

const initialRoute = window.location.hash.replace("#", "");
if (routeMeta[initialRoute]) state.route = initialRoute;
render();
