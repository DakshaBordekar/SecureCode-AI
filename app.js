import {
  baseFeedback,
  fileRisk,
  findings,
  investigations,
  repository,
  scanFiles,
  verificationGates,
} from "./mock-data.js";
import { runScan, runVerification, saveDeveloperDecision } from "./services.js";

const stages = [
  { id: "mission", label: "Repository", eyebrow: "Mission control" },
  { id: "scan", label: "Scan", eyebrow: "Live analysis" },
  { id: "attack", label: "Attack path", eyebrow: "Evidence trace" },
  { id: "finding", label: "Finding", eyebrow: "Casefile" },
  { id: "patch", label: "Patch", eyebrow: "Patch laboratory" },
  { id: "verify", label: "Verification", eyebrow: "Verification chamber" },
  { id: "learn", label: "Learning", eyebrow: "Learning loop" },
];

const icons = {
  repository: '<path d="M3 5.5h6l2 2h10v11H3z"/><path d="M3 9h18"/>',
  scan: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4M11 8v6M8 11h6"/>',
  route: '<path d="M5 19V7a3 3 0 0 1 3-3h3M19 5h-4M17 3v4M9 20h6M12 17v3M8 10h8v6H8z"/>',
  file: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>',
  patch: '<path d="M14 4 4 14l6 6L20 10z"/><path d="m13 5 6 6M7 15l2 2"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.2 8 11 4.6-1.8 8-6 8-11V5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  learn: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/><path d="M7 9h1M16 9h1M7 13h1M16 13h1"/>',
  arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
};

function icon(name, className = "") {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.file}</svg>`;
}

const state = {
  route: "mission",
  furthestStage: 0,
  mobileOpen: false,
  scanRunning: false,
  scanComplete: false,
  scanProgress: 0,
  scanFile: scanFiles[0],
  scanLine: 1,
  riskCount: 0,
  selectedPath: 0,
  selectedFinding: findings[0].id,
  severity: "all",
  codeMode: "diff",
  patchDecision: null,
  editedPatch: null,
  verificationRunning: false,
  verificationComplete: false,
  gateStates: verificationGates.map(() => "waiting"),
  feedback: [...baseFeedback],
  scanSignal: { cancelled: false },
  verificationSignal: { cancelled: false },
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function currentStage() {
  return stages.findIndex((stage) => stage.id === state.route);
}

function selectedFinding() {
  return findings.find((finding) => finding.id === state.selectedFinding) || findings[0];
}

function navigate(route, { force = false } = {}) {
  const target = stages.findIndex((stage) => stage.id === route);
  if (target < 0) return;
  if (!force && target > state.furthestStage + 1) {
    toast("Complete the current investigation stage first.", "warning");
    return;
  }
  state.route = route;
  state.mobileOpen = false;
  state.furthestStage = Math.max(state.furthestStage, target);
  window.location.hash = route;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function investigationRail() {
  const active = currentStage();
  return `
    <aside class="rail ${state.mobileOpen ? "open" : ""}" aria-label="Investigation stages">
      <div class="brand">
        <span class="brand-shield">${icon("shield")}</span>
        <span><strong>SecureCode</strong><em>AI</em><small>Investigation OS</small></span>
      </div>
      <div class="rail-context">
        <span class="signal"><i></i> Investigation live</span>
        <strong>INV-2841</strong>
        <small>${repository.name} / ${repository.branch}</small>
      </div>
      <nav class="stage-list">
        ${stages.map((stage, index) => {
          const status = index < active ? "complete" : index === active ? "active" : index <= state.furthestStage ? "available" : "locked";
          const stageIcon = ["repository", "scan", "route", "file", "patch", "shield", "learn"][index];
          return `
            <button class="stage ${status}" data-route="${stage.id}" ${status === "locked" ? 'aria-disabled="true"' : ""}>
              <span class="stage-line"></span>
              <span class="stage-icon">${status === "complete" ? icon("check") : icon(stageIcon)}</span>
              <span class="stage-copy"><small>0${index + 1}</small><strong>${stage.label}</strong></span>
              ${index === active ? '<span class="stage-now">NOW</span>' : ""}
            </button>`;
        }).join("")}
      </nav>
      <div class="rail-footer">
        <div><span>ENGINE</span><strong>5 agents ready</strong></div>
        <div><span>POLICY</span><strong>OWASP 2025</strong></div>
      </div>
    </aside>`;
}

function topbar() {
  const stage = stages[currentStage()];
  return `
    <header class="topbar">
      <button class="icon-button menu-button" id="menu-toggle" aria-label="Open investigation navigation">${icon("menu")}</button>
      <div class="breadcrumb"><span>INV-2841</span><i>/</i><strong>${stage.eyebrow}</strong></div>
      <div class="top-actions">
        <span class="engine-status"><i></i> Engine online</span>
        <button class="icon-button" id="notifications" aria-label="Notifications">${icon("bell")}<b></b></button>
        <span class="avatar" aria-label="Signed in as SM">SM</span>
      </div>
    </header>`;
}

function stageHeader(kicker, title, copy, action = "") {
  return `
    <div class="page-heading">
      <div>
        <span class="kicker">${kicker}</span>
        <h1>${title}</h1>
        <p>${copy}</p>
      </div>
      ${action}
    </div>`;
}

function metric(label, value, detail, tone = "") {
  return `<div class="metric ${tone}"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;
}

function missionPage() {
  const score = state.verificationComplete ? repository.improvedScore : repository.score;
  return `
    <section class="page mission-page">
      ${stageHeader(
        "MISSION CONTROL · REPOSITORY 01",
        "Know the code before<br>you trust the code.",
        "SecureCode AI has mapped the payments service. One reachable path can cross the trust boundary and reach protected customer data.",
        '<button class="button primary large" id="begin-investigation">Begin investigation ' + icon("arrow") + "</button>",
      )}
      <section class="repository-hero">
        <div class="repo-identity">
          <div class="repo-glyph">{ }</div>
          <div>
            <span class="overline">SELECTED REPOSITORY</span>
            <h2>${repository.owner} / <strong>${repository.name}</strong></h2>
            <div class="repo-tags">
              <span>${icon("route")} ${repository.branch}</span>
              <span>${repository.commit}</span>
              <span>${repository.language}</span>
              <span>${repository.framework}</span>
            </div>
          </div>
        </div>
        <div class="security-grade">
          <div class="grade-ring" style="--score:${score}">
            <span><small>SECURITY GRADE</small><strong>${state.verificationComplete ? "A" : repository.grade}</strong><em>${score}/100</em></span>
          </div>
          <div class="risk-status ${state.verificationComplete ? "verified" : ""}"><i></i><span><small>RISK STATUS</small><strong>${state.verificationComplete ? "Verified secure" : "Action required"}</strong></span></div>
        </div>
      </section>
      <div class="mission-grid">
        <section class="surface fingerprint">
          <div class="section-head">
            <div><span class="overline">CODEBASE FINGERPRINT</span><h2>Risk lives in four files</h2></div>
            <span class="mono">${repository.files} files · ${repository.lines} LOC</span>
          </div>
          <div class="risk-map">
            ${fileRisk.map((file, index) => `
              <button class="risk-row" data-file-risk="${index}" style="--risk:${file.risk}%">
                <span class="risk-index">${String(index + 1).padStart(2, "0")}</span>
                <span class="risk-path">${file.path}</span>
                <span class="risk-track"><i></i></span>
                <span class="risk-value ${file.type}">${file.risk}</span>
              </button>`).join("")}
          </div>
          <div class="trust-boundary">
            <span>EXTERNAL INPUT</span><i></i><strong>1 reachable critical path</strong><i></i><span>PROTECTED DATA</span>
          </div>
        </section>
        <section class="surface investigation-list">
          <div class="section-head">
            <div><span class="overline">RECENT INVESTIGATIONS</span><h2>Case history</h2></div>
            <button class="text-button" id="all-investigations">View all</button>
          </div>
          ${investigations.map((item) => `
            <button class="investigation-row" data-investigation="${item.id}">
              <span class="case-id">${item.id}</span>
              <span><strong>${item.title}</strong><small>${item.meta}</small></span>
              <em class="${item.status.toLowerCase()}">${item.status}</em>
              ${icon("chevron")}
            </button>`).join("")}
          <div class="last-scan"><span>LAST SCAN</span><strong>${repository.lastScan}</strong><small>Ruleset updated 12 minutes ago</small></div>
        </section>
      </div>
      <div class="support-metrics">
        ${metric("Attack surface", "12", "external entry points")}
        ${metric("Critical paths", state.verificationComplete ? "0" : "01", state.verificationComplete ? "neutralized" : "confirmed reachable", state.verificationComplete ? "mint" : "red")}
        ${metric("Analysis depth", "5", "specialized agents")}
        ${metric("Expected review", "06m", "human decision time")}
      </div>
    </section>`;
}

function scanLogEntries() {
  const entries = [
    [4, "Planner", "Indexed repository structure and dependency boundaries.", "neutral"],
    [20, "Security", "Marked 12 external request inputs for taint analysis.", "neutral"],
    [32, "Security", "Input reaches SQL construction in orders.js:42.", "critical"],
    [48, "Critic", "Confirmed SQL path is reachable without validation.", "critical"],
    [60, "Security", "Detected production credential shape in payment.js.", "high"],
    [76, "AutoFix", "Prepared parameter binding and boundary validation.", "mint"],
    [88, "Verification", "Queued syntax, exploit, and regression gates.", "mint"],
  ];
  return entries.filter(([threshold]) => state.scanProgress >= threshold);
}

function scanPage() {
  const complete = state.scanComplete;
  return `
    <section class="page">
      ${stageHeader(
        complete ? "SCAN COMPLETE · 18.4S" : "LIVE REPOSITORY SCAN",
        complete ? "Four casefiles confirmed." : "The codebase is talking.",
        complete
          ? "The Critic agent challenged every result. Four findings remain supported by code evidence and a reachable attack path."
          : "Five agents are reading structure, tracing untrusted data, challenging evidence, and preparing safe changes.",
        complete
          ? '<button class="button primary" data-route="attack">Trace critical path ' + icon("arrow") + "</button>"
          : state.scanRunning
            ? '<button class="button subtle" id="cancel-scan">Cancel scan</button>'
            : '<button class="button primary" id="start-scan">Start live scan ' + icon("scan") + "</button>",
      )}
      <section class="scan-console surface">
        <div class="scan-progress-head">
          <div class="radar"><span></span><i></i></div>
          <div><span class="overline">SCAN SC-2841</span><strong>${complete ? "Analysis sealed" : state.scanRunning ? "Inspecting repository" : "Ready to inspect"}</strong></div>
          <div class="progress-readout"><strong>${String(state.scanProgress).padStart(3, "0")}%</strong><span>${state.riskCount} risks confirmed</span></div>
        </div>
        <div class="progress-track"><i style="width:${state.scanProgress}%"></i></div>
        <div class="scan-workspace">
          <div class="file-tree">
            <div class="console-label">REPOSITORY TREE</div>
            <div class="tree-root">${icon("repository")} ${repository.name}</div>
            ${scanFiles.map((file) => {
              const active = file === state.scanFile;
              const risky = findings.some((finding) => finding.path === file && state.scanProgress > 25);
              return `<div class="tree-file ${active ? "active" : ""}">${icon("file")}<span>${file}</span>${risky ? '<i class="risk-dot"></i>' : ""}</div>`;
            }).join("")}
          </div>
          <div class="scanner-focus">
            <div class="focus-bar"><span>${state.scanFile}</span><strong>LINE ${state.scanLine}</strong></div>
            <div class="scan-code">
              ${[
                "export async function getOrder(req, res) {",
                "  const orderId = req.params.id;",
                "  const result = await db.query(",
                "    `SELECT * FROM orders WHERE id = ${orderId}`",
                "  );",
                "  return res.json(result.rows[0]);",
                "}",
              ].map((line, index) => `<div class="${state.scanProgress > 28 && index === 3 ? "danger-line" : ""}"><span>${38 + index}</span><code>${syntaxLine(line)}</code></div>`).join("")}
              ${state.scanRunning ? '<span class="scan-beam"></span>' : ""}
            </div>
            <div class="focus-evidence">
              <span class="pulse-dot"></span>
              <div><small>LIVE SIGNAL</small><strong>${state.scanProgress < 28 ? "Following request input across module boundaries" : "Untrusted value reaches a sensitive database operation"}</strong></div>
            </div>
          </div>
          <div class="live-log">
            <div class="console-label">ACTIVITY LOG</div>
            ${scanLogEntries().map(([, agent, copy, tone]) => `<div class="log-entry ${tone}"><span>${agent}</span><p>${copy}</p></div>`).join("") || '<div class="empty-console">Awaiting scan start...</div>'}
          </div>
        </div>
      </section>
      <section class="agent-deck">
        ${["Planner", "Security", "Critic", "AutoFix", "Verification"].map((agent, index) => {
          const threshold = index * 20;
          const status = state.scanProgress >= threshold + 20 || complete ? "complete" : state.scanProgress >= threshold && state.scanRunning ? "active" : "";
          return `<div class="agent-card ${status}"><span>0${index + 1}</span><i></i><strong>${agent}</strong><small>${status === "complete" ? "Stage complete" : status === "active" ? "Working now" : "Queued"}</small></div>`;
        }).join("")}
      </section>
      <div class="confirmed-strip">
        <span class="overline">CONFIRMED FINDINGS</span>
        <div>${findings.slice(0, state.riskCount).map((finding) => `<button data-select-finding="${finding.id}"><span class="severity ${finding.severity}">${finding.severity}</span><strong>${finding.title}</strong><small>${finding.path}:${finding.line}</small></button>`).join("") || "<p>Findings will appear here as the Critic agent confirms evidence.</p>"}</div>
      </div>
    </section>`;
}

function attackPage() {
  const finding = findings[0];
  const selected = finding.attackPath[state.selectedPath];
  return `
    <section class="page">
      ${stageHeader(
        "SIGNATURE TRACE · SC-1042",
        "See exactly how an<br>attacker reaches the data.",
        "SecureCode AI reconstructs the request as a directional evidence chain—not a probability cloud. Select any stage to inspect what crossed the boundary.",
        '<button class="button primary" data-route="finding">Open casefile ' + icon("arrow") + "</button>",
      )}
      <section class="attack-map surface">
        <div class="trace-header">
          <div><span class="overline">ATTACK PATH 01</span><h2>Order lookup → customer records</h2></div>
          <span class="trace-confidence">${finding.confidence}% CONFIRMED</span>
        </div>
        <div class="trace-flow">
          ${finding.attackPath.map((node, index) => `
            <button class="trace-node ${index === state.selectedPath ? "active" : ""} ${index === finding.attackPath.length - 1 ? "impact" : ""}" data-path-node="${index}">
              <span class="node-number">0${index + 1}</span>
              <span class="node-symbol">${index === 0 ? "&lt;/&gt;" : index === 4 ? "!" : "→"}</span>
              <strong>${node.label}</strong>
              <small>${node.detail}</small>
              ${index < finding.attackPath.length - 1 ? '<i class="trace-connector"><b></b></i>' : ""}
            </button>`).join("")}
        </div>
        <div class="trace-inspector">
          <div class="inspector-code">
            <div class="console-label">CODE LOCATION</div>
            <strong>${selected.file}${selected.line ? `:${selected.line}` : ""}</strong>
            <div><span>DATA</span><code>${escapeHtml(selected.data)}</code></div>
          </div>
          <div class="inspector-explanation">
            <div class="console-label">SECURITY EXPLANATION</div>
            <p>${selected.evidence}</p>
          </div>
          <div class="evidence-stamp">
            ${icon("shield")}
            <span><small>AI EVIDENCE</small><strong>Critic confirmed</strong><em>Trace ID · TR-77A2</em></span>
          </div>
        </div>
      </section>
      <div class="attack-summary">
        <div><span>ENTRY</span><strong>Public HTTP request</strong></div>
        <i>${icon("arrow")}</i>
        <div><span>TRUST BREAK</span><strong>No boundary validation</strong></div>
        <i>${icon("arrow")}</i>
        <div class="danger"><span>IMPACT</span><strong>Cross-tenant records</strong></div>
      </div>
    </section>`;
}

function findingList() {
  const visible = state.severity === "all" ? findings : findings.filter((finding) => finding.severity === state.severity);
  return `
    <div class="case-list">
      <div class="case-filters">
        ${["all", "critical", "high", "medium"].map((filter) => `<button class="${state.severity === filter ? "active" : ""}" data-severity="${filter}">${filter}</button>`).join("")}
      </div>
      ${visible.length ? visible.map((finding) => `
        <button class="case-row ${finding.id === state.selectedFinding ? "active" : ""}" data-select-finding="${finding.id}">
          <span class="severity ${finding.severity}">${finding.severity}</span>
          <strong>${finding.title}</strong>
          <small>${finding.path}:${finding.line}</small>
          <em>${finding.confidence}%</em>
        </button>`).join("") : '<div class="empty-state">No findings match this severity.</div>'}
    </div>`;
}

function findingPage() {
  const finding = selectedFinding();
  return `
    <section class="page">
      ${stageHeader(
        `CASEFILE · ${finding.id}`,
        "Evidence before action.",
        "Every claim is tied to a file, a line, a reachable path, and an independent Critic review.",
        '<button class="button primary" data-route="patch">Prepare secure patch ' + icon("arrow") + "</button>",
      )}
      <div class="casefile-layout">
        <section class="surface case-index">
          <div class="section-head"><div><span class="overline">CONFIRMED FINDINGS</span><h2>4 open casefiles</h2></div></div>
          ${findingList()}
        </section>
        <article class="surface casefile">
          <div class="casefile-top">
            <div><span class="severity ${finding.severity}">${finding.severity}</span><span class="case-id">${finding.id}</span></div>
            <span class="confidence-ring">${finding.confidence}<small>%</small></span>
          </div>
          <h2>${finding.title}</h2>
          <p class="case-description">${finding.explanation}</p>
          <div class="case-facts">
            <div><span>LOCATION</span><strong>${finding.path}:${finding.line}</strong></div>
            <div><span>CATEGORY</span><strong>${finding.cwe}</strong></div>
            <div><span>BUSINESS IMPACT</span><strong>${finding.impact}</strong></div>
          </div>
          <div class="vulnerable-snippet">
            <div><span>${finding.path}</span><strong>LINE ${finding.line}</strong></div>
            <code>${syntaxLine(finding.before[Math.min(4, finding.before.length - 1)])}</code>
          </div>
          <div class="case-evidence-grid">
            <div><span class="overline">ATTACK-PATH EVIDENCE</span><p>${finding.attackPath?.[3]?.evidence || "Input reaches the vulnerable operation through a confirmed application path."}</p></div>
            <div class="critic-note">${icon("shield")}<span><small>CRITIC AGENT</small><strong>Independent confirmation</strong><p>${finding.critic}</p></span></div>
          </div>
          <div class="proposed-action"><span>PROPOSED ACTION</span><p>${finding.action}</p></div>
        </article>
      </div>
    </section>`;
}

function buildLineDiff(before, after) {
  const matrix = Array.from({ length: before.length + 1 }, () => Array(after.length + 1).fill(0));
  for (let oldIndex = before.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = after.length - 1; newIndex >= 0; newIndex -= 1) {
      matrix[oldIndex][newIndex] = before[oldIndex] === after[newIndex]
        ? matrix[oldIndex + 1][newIndex + 1] + 1
        : Math.max(matrix[oldIndex + 1][newIndex], matrix[oldIndex][newIndex + 1]);
    }
  }
  const rows = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < before.length || newIndex < after.length) {
    if (oldIndex < before.length && newIndex < after.length && before[oldIndex] === after[newIndex]) {
      rows.push({ old: oldIndex + 1, next: newIndex + 1, sign: " ", line: before[oldIndex], type: "" });
      oldIndex += 1;
      newIndex += 1;
    } else if (oldIndex < before.length && (newIndex === after.length || matrix[oldIndex + 1][newIndex] >= matrix[oldIndex][newIndex + 1])) {
      rows.push({ old: oldIndex + 1, next: "", sign: "−", line: before[oldIndex], type: "removed" });
      oldIndex += 1;
    } else {
      rows.push({ old: "", next: newIndex + 1, sign: "+", line: after[newIndex], type: "added" });
      newIndex += 1;
    }
  }
  return rows;
}

function syntaxLine(line) {
  return escapeHtml(line)
    .replace(/\b(export|async|function|const|return|await|if|throw|new|process|env)\b/g, '<span class="tok-key">$1</span>')
    .replace(/(&quot;.*?&quot;|`.*?`)/g, '<span class="tok-string">$1</span>')
    .replace(/\b(query|json|sign|sanitize|sendStatus)\b/g, '<span class="tok-fn">$1</span>');
}

function codeRows(finding) {
  const after = state.editedPatch?.split("\n") || finding.after;
  if (state.codeMode === "original") return finding.before.map((line, index) => ({ old: index + 1, next: "", sign: " ", line, type: "" }));
  if (state.codeMode === "patched") return after.map((line, index) => ({ old: "", next: index + 1, sign: " ", line, type: "" }));
  return buildLineDiff(finding.before, after);
}

function patchPage() {
  const finding = selectedFinding();
  const decision = state.patchDecision;
  return `
    <section class="page patch-page">
      ${stageHeader(
        "PATCH LABORATORY · AUTOFIX",
        "Change the code.<br>Preserve the behavior.",
        "The proposed patch closes the confirmed attack path and adds a guard at the input boundary. Review every changed line before deciding.",
      )}
      <div class="patch-layout">
        <aside class="surface changed-files">
          <div class="section-head"><div><span class="overline">CHANGED FILES</span><h2>${finding.filesChanged.length} files</h2></div><span class="diff-count">+5 −2</span></div>
          ${finding.filesChanged.map((file, index) => `<button class="${index === 0 ? "active" : ""}" data-changed-file="${file}">${icon("file")}<span><strong>${file.split("/").at(-1)}</strong><small>${file}</small></span><em>${index === 0 ? "+4 −2" : "+1"}</em></button>`).join("")}
          <div class="patch-explanation">
            <span class="overline">WHY THIS WORKS</span>
            <p>${finding.why}</p>
            <div>${icon("shield")} Attack path neutralized at two boundaries</div>
          </div>
        </aside>
        <section class="surface code-lab">
          <div class="code-lab-head">
            <div><span>${finding.path}</span><small>Autofix proposal · PATCH-77A2</small></div>
            <div class="mode-switch">
              ${["original", "diff", "patched"].map((mode) => `<button class="${state.codeMode === mode ? "active" : ""}" data-code-mode="${mode}">${mode}</button>`).join("")}
            </div>
          </div>
          <div class="code-panel" aria-label="${state.codeMode} code comparison" tabindex="0">
            ${codeRows(finding).map((row) => `
              <div class="code-line ${row.type}">
                <span class="old-no">${row.old}</span><span class="new-no">${row.next}</span><span class="line-sign">${row.sign}</span><code>${syntaxLine(row.line)}</code>
              </div>`).join("")}
          </div>
          <div class="patch-footer">
            <div class="patch-status ${decision || ""}">${decision === "accepted" ? icon("check") + "<span><strong>Patch accepted</strong><small>Feedback sample created</small></span>" : decision === "rejected" ? "<span><strong>Patch rejected</strong><small>Decision recorded for learning</small></span>" : '<span class="pulse-dot"></span><span><strong>Awaiting developer decision</strong><small>Nothing changes until you approve</small></span>'}</div>
            <div class="patch-actions">
              <button class="button danger" id="reject-patch" ${decision ? "disabled" : ""}>Reject</button>
              <button class="button subtle" id="edit-patch" ${decision ? "disabled" : ""}>Edit</button>
              <button class="button primary" id="accept-patch" ${decision ? "disabled" : ""}>Accept patch ${icon("check")}</button>
            </div>
          </div>
        </section>
      </div>
      ${decision === "accepted"
        ? '<div class="next-stage-banner"><span>' + icon("shield") + '</span><div><small>NEXT STAGE READY</small><strong>Prove the patch is secure</strong></div><button class="button primary" data-route="verify">Enter verification ' + icon("arrow") + "</button></div>"
        : decision === "rejected"
          ? '<div class="next-stage-banner rejected"><span>×</span><div><small>DECISION RECORDED</small><strong>Show how rejection improves the model</strong></div><button class="button subtle" data-route="learn">Open learning loop ' + icon("arrow") + "</button></div>"
          : ""}
    </section>`;
}

function verifyPage() {
  const passedCount = state.gateStates.filter((status) => status === "passed").length;
  const score = state.verificationComplete ? repository.improvedScore : repository.score + passedCount * 5;
  return `
    <section class="page verify-page">
      ${stageHeader(
        state.verificationComplete ? "VERIFICATION COMPLETE · PATCH-77A2" : "VERIFICATION CHAMBER",
        state.verificationComplete ? "Verified secure." : "Trust, then prove.",
        state.verificationComplete
          ? "The exploit path is closed, application behavior is preserved, and the repository security score has improved."
          : "The accepted patch must clear five independent gates before SecureCode AI marks the investigation safe.",
        !state.verificationRunning && !state.verificationComplete ? '<button class="button primary" id="run-verification">Run all gates ' + icon("shield") + "</button>" : "",
      )}
      <section class="verification-chamber surface ${state.verificationComplete ? "secure" : ""}">
        <div class="score-transition">
          <div class="score-orbit" style="--score:${score}">
            <span><small>SECURITY SCORE</small><strong>${score}</strong><em>/100</em></span>
          </div>
          <div class="score-copy">
            <span class="overline">REPOSITORY POSTURE</span>
            <h2>${state.verificationComplete ? "Attack path eliminated" : state.verificationRunning ? "Evidence gates running" : "Patch staged for proof"}</h2>
            <p>${state.verificationComplete ? "payments-service moved from grade C to grade A." : `${passedCount} of ${verificationGates.length} gates have passed.`}</p>
          </div>
        </div>
        <div class="verification-gates">
          ${verificationGates.map((gate, index) => {
            const status = state.gateStates[index];
            return `<div class="gate ${status}">
              <span class="gate-index">0${index + 1}</span>
              <span class="gate-indicator">${status === "passed" ? icon("check") : status === "running" ? '<i class="spinner"></i>' : ""}</span>
              <span><strong>${gate.label}</strong><small>${status === "passed" ? gate.detail : status === "running" ? "Running evidence check..." : "Waiting for prior gate"}</small></span>
              <em>${status === "passed" ? "PASSED" : status === "running" ? "ACTIVE" : "QUEUED"}</em>
            </div>`;
          }).join("")}
        </div>
        ${state.verificationComplete ? `
          <div class="verified-seal">
            ${icon("shield")}
            <div><span>VERIFIED SECURE</span><strong>5 / 5 evidence gates passed</strong><small>Signed by Verification Agent · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>
            <button class="button primary" data-route="learn">Record learning ${icon("arrow")}</button>
          </div>` : ""}
      </section>
    </section>`;
}

function learnPage() {
  const accepted = state.feedback.filter((item) => item.type === "accepted").length;
  return `
    <section class="page">
      ${stageHeader(
        "LEARNING LOOP · HUMAN-GUIDED",
        "One decision makes the<br>next patch smarter.",
        "Developer choices become structured feedback—not raw private code. SecureCode AI uses those signals to improve precision and reduce interruptions.",
        '<button class="button subtle" id="new-investigation">Start another investigation</button>',
      )}
      <div class="learning-story">
        <section class="decision-record surface">
          <div class="section-head"><div><span class="overline">DEVELOPER DECISION</span><h2>Feedback sample created</h2></div><span class="sample-id">FDB-9471</span></div>
          <div class="decision-flow">
            <div><span class="decision-icon">${icon("check")}</span><span><small>DECISION</small><strong>${state.patchDecision === "rejected" ? "Patch rejected" : "Patch accepted"}</strong></span></div>
            <i>${icon("arrow")}</i>
            <div><span class="decision-icon">{ }</span><span><small>SAMPLE</small><strong>Evidence + diff + choice</strong></span></div>
            <i>${icon("arrow")}</i>
            <div><span class="decision-icon">${icon("learn")}</span><span><small>MODEL SIGNAL</small><strong>Prefer parameter binding</strong></span></div>
          </div>
          <div class="privacy-note">${icon("shield")} Private repository code stays out of shared training. Only structured security signals are retained.</div>
        </section>
        <section class="model-evolution surface">
          <div class="section-head"><div><span class="overline">MODEL EVOLUTION</span><h2>V1 → V2</h2></div><span class="mint-label">+18% precision</span></div>
          <div class="model-compare">
            <div><small>SECURECODE V1</small><strong>76</strong><span>baseline accuracy</span></div>
            <i>${icon("arrow")}</i>
            <div class="current"><small>SECURECODE V2</small><strong>94</strong><span>evaluation accuracy</span></div>
          </div>
          <div class="learning-metrics">
            ${learningMetric("Patch acceptance", 87, "+11%")}
            ${learningMetric("False positives", 18, "−31%", true)}
            ${learningMetric("Evaluation accuracy", 94, "+18%")}
          </div>
        </section>
      </div>
      <section class="feedback-timeline surface">
        <div class="section-head"><div><span class="overline">FEEDBACK TIMELINE</span><h2>Human decisions, model signals</h2></div><span class="mono">${accepted} accepted · ${state.feedback.length - accepted} rejected</span></div>
        <div class="timeline">
          ${state.feedback.map((item, index) => `<div class="timeline-item ${item.type}"><span>${item.type === "accepted" ? icon("check") : "×"}</span><div><strong>${item.title}</strong><small>${item.meta}</small></div><em>${index === 0 && state.patchDecision ? "JUST NOW" : item.type.toUpperCase()}</em></div>`).join("")}
        </div>
      </section>
      <div class="journey-complete"><span>${icon("shield")}</span><div><small>INVESTIGATION COMPLETE</small><strong>From vulnerable code to verified learning signal</strong></div><button class="text-button" data-route="mission">Return to mission control ${icon("arrow")}</button></div>
    </section>`;
}

function learningMetric(label, value, delta, inverse = false) {
  return `<div><span><small>${label}</small><em>${delta}</em></span><strong>${value}%</strong><i><b style="width:${inverse ? 100 - value : value}%"></b></i></div>`;
}

function pageContent() {
  return {
    mission: missionPage,
    scan: scanPage,
    attack: attackPage,
    finding: findingPage,
    patch: patchPage,
    verify: verifyPage,
    learn: learnPage,
  }[state.route]();
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell">
      ${investigationRail()}
      <main class="main">
        ${topbar()}
        ${pageContent()}
      </main>
      ${state.mobileOpen ? '<button class="rail-scrim" id="rail-scrim" aria-label="Close navigation"></button>' : ""}
    </div>`;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.route)));
  document.querySelector("#menu-toggle")?.addEventListener("click", () => {
    state.mobileOpen = !state.mobileOpen;
    render();
  });
  document.querySelector("#rail-scrim")?.addEventListener("click", () => {
    state.mobileOpen = false;
    render();
  });
  document.querySelector("#notifications")?.addEventListener("click", () => toast("No new alerts. Investigation INV-2841 is active."));
  document.querySelector("#begin-investigation")?.addEventListener("click", () => {
    navigate("scan", { force: true });
    window.setTimeout(startScan, 150);
  });
  document.querySelector("#start-scan")?.addEventListener("click", startScan);
  document.querySelector("#cancel-scan")?.addEventListener("click", cancelScan);
  document.querySelector("#all-investigations")?.addEventListener("click", () => toast("Showing the three investigations available in this prototype."));
  document.querySelectorAll("[data-investigation]").forEach((button) => button.addEventListener("click", () => toast(`${button.dataset.investigation} opened in read-only history.`)));
  document.querySelectorAll("[data-file-risk]").forEach((button) => button.addEventListener("click", () => {
    const file = fileRisk[Number(button.dataset.fileRisk)];
    toast(`${file.path} · risk score ${file.risk}/100`, file.type === "critical" ? "danger" : "info");
  }));
  document.querySelectorAll("[data-path-node]").forEach((button) => button.addEventListener("click", () => {
    state.selectedPath = Number(button.dataset.pathNode);
    render();
  }));
  document.querySelectorAll("[data-severity]").forEach((button) => button.addEventListener("click", () => {
    state.severity = button.dataset.severity;
    const visible = state.severity === "all" ? findings : findings.filter((finding) => finding.severity === state.severity);
    if (visible.length && !visible.some((finding) => finding.id === state.selectedFinding)) state.selectedFinding = visible[0].id;
    render();
  }));
  document.querySelectorAll("[data-select-finding]").forEach((button) => button.addEventListener("click", () => {
    state.selectedFinding = button.dataset.selectFinding;
    if (state.route === "scan") {
      state.furthestStage = Math.max(state.furthestStage, 3);
      navigate("finding", { force: true });
    } else {
      render();
    }
  }));
  document.querySelectorAll("[data-code-mode]").forEach((button) => button.addEventListener("click", () => {
    state.codeMode = button.dataset.codeMode;
    render();
  }));
  document.querySelectorAll("[data-changed-file]").forEach((button) => button.addEventListener("click", () => toast(`${button.dataset.changedFile} selected.`)));
  document.querySelector("#edit-patch")?.addEventListener("click", openPatchEditor);
  document.querySelector("#accept-patch")?.addEventListener("click", () => decidePatch("accepted"));
  document.querySelector("#reject-patch")?.addEventListener("click", () => decidePatch("rejected"));
  document.querySelector("#run-verification")?.addEventListener("click", startVerification);
  document.querySelector("#new-investigation")?.addEventListener("click", resetInvestigation);
}

async function startScan() {
  if (state.scanRunning) return;
  state.scanSignal.cancelled = true;
  state.scanSignal = { cancelled: false };
  state.scanRunning = true;
  state.scanComplete = false;
  state.scanProgress = 0;
  state.riskCount = 0;
  render();
  const result = await runScan({
    signal: state.scanSignal,
    onProgress(update) {
      Object.assign(state, {
        scanProgress: update.progress,
        scanFile: update.file,
        scanLine: update.line,
        riskCount: update.riskCount,
      });
      render();
    },
  });
  if (!result.cancelled) {
    state.scanRunning = false;
    state.scanComplete = true;
    state.furthestStage = Math.max(state.furthestStage, 2);
    render();
    toast("Scan complete. Four evidence-backed findings confirmed.");
  }
}

function cancelScan() {
  state.scanSignal.cancelled = true;
  state.scanRunning = false;
  state.scanProgress = 0;
  state.riskCount = 0;
  render();
  toast("Scan cancelled. No repository changes were made.", "warning");
}

function openPatchEditor() {
  const finding = selectedFinding();
  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <div class="modal-head"><div><span class="overline">MANUAL PATCH EDITOR</span><h2 id="editor-title">${finding.path}</h2></div><button class="icon-button" data-close aria-label="Close editor">${icon("close")}</button></div>
      <textarea id="patch-editor" spellcheck="false">${escapeHtml(state.editedPatch || finding.after.join("\n"))}</textarea>
      <div class="modal-foot"><span>Prototype editor · syntax will be checked during verification</span><div><button class="button subtle" data-close>Cancel</button><button class="button primary" id="save-edit">Save edit</button></div></div>
    </div>`;
  document.body.append(modal);
  const close = () => modal.remove();
  modal.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", close));
  modal.querySelector("#save-edit").addEventListener("click", () => {
    state.editedPatch = modal.querySelector("#patch-editor").value;
    state.codeMode = "diff";
    close();
    render();
    toast("Manual edit saved to the patch proposal.");
  });
  modal.querySelector("#patch-editor").focus();
}

async function decidePatch(decision) {
  state.patchDecision = decision;
  const record = await saveDeveloperDecision(decision);
  state.feedback.unshift({
    type: decision,
    title: decision === "accepted" ? "Parameterized SQL patch accepted" : "SQL patch rejected for revision",
    meta: `${selectedFinding().id} · ${record.createdAt}`,
  });
  if (decision === "accepted") state.furthestStage = Math.max(state.furthestStage, 5);
  else state.furthestStage = Math.max(state.furthestStage, 6);
  render();
  toast(decision === "accepted" ? "Patch accepted. Verification is ready." : "Patch rejected. Learning signal recorded.", decision === "accepted" ? "success" : "warning");
}

async function startVerification() {
  if (state.verificationRunning) return;
  state.verificationSignal.cancelled = true;
  state.verificationSignal = { cancelled: false };
  state.verificationRunning = true;
  state.gateStates = verificationGates.map(() => "waiting");
  render();
  const result = await runVerification({
    signal: state.verificationSignal,
    onGate({ index, status }) {
      state.gateStates[index] = status;
      render();
    },
  });
  if (!result.cancelled) {
    state.verificationRunning = false;
    state.verificationComplete = true;
    state.furthestStage = 6;
    render();
    toast("Verified secure. All five evidence gates passed.");
  }
}

function resetInvestigation() {
  state.route = "mission";
  state.furthestStage = 0;
  state.scanComplete = false;
  state.scanProgress = 0;
  state.riskCount = 0;
  state.patchDecision = null;
  state.editedPatch = null;
  state.verificationComplete = false;
  state.gateStates = verificationGates.map(() => "waiting");
  window.location.hash = "mission";
  render();
  toast("New investigation workspace ready.");
}

function toast(message, tone = "success") {
  const toastRegion = document.querySelector("#toast-region");
  const item = document.createElement("div");
  item.className = `toast ${tone}`;
  item.innerHTML = `<span>${tone === "danger" ? "!" : icon(tone === "warning" ? "bell" : "check")}</span><p>${escapeHtml(message)}</p>`;
  toastRegion.append(item);
  window.setTimeout(() => item.remove(), 3400);
}

window.addEventListener("hashchange", () => {
  const route = window.location.hash.slice(1);
  if (stages.some((stage) => stage.id === route) && route !== state.route) {
    const target = stages.findIndex((stage) => stage.id === route);
    if (target <= state.furthestStage + 1) {
      state.route = route;
      render();
    }
  }
});

const initialRoute = window.location.hash.slice(1);
if (stages.some((stage) => stage.id === initialRoute)) state.route = initialRoute;
render();
