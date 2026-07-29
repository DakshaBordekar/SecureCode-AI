import { findings, scanFiles, verificationGates } from "./mock-data.js";

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function runScan({ onProgress, signal }) {
  for (let progress = 4; progress <= 100; progress += 4) {
    if (signal.cancelled) return { cancelled: true };
    await wait(110);
    const fileIndex = Math.min(scanFiles.length - 1, Math.floor((progress / 100) * scanFiles.length));
    onProgress({
      progress,
      file: scanFiles[fileIndex],
      line: 8 + ((progress * 7) % 73),
      riskCount: findings.filter((finding) => progress >= ({ critical: 28, high: 48, medium: 72 }[finding.severity])).length,
    });
  }
  return { cancelled: false, findings };
}

export async function runVerification({ onGate, signal }) {
  for (let index = 0; index < verificationGates.length; index += 1) {
    if (signal.cancelled) return { cancelled: true };
    onGate({ index, status: "running" });
    await wait(640);
    if (signal.cancelled) return { cancelled: true };
    onGate({ index, status: "passed" });
    await wait(220);
  }
  return { cancelled: false, passed: true };
}

export async function saveDeveloperDecision(decision) {
  await wait(180);
  return {
    id: `FDB-${Math.floor(9000 + Math.random() * 999)}`,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    decision,
  };
}
