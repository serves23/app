#!/usr/bin/env node
/**
 * FlowFile Agent - local folder health checker
 *
 * - Computes health for working + backup folders:
 *   - Checks both exist
 *   - Uses most recent modified time for each to derive freshness
 *   - Collects file counts + total bytes
 *   - Status rules:
 *     healthy: both present and freshness delta <= 48h
 *     warning: both present and freshness delta <= 14d
 *     critical: otherwise
 * - POSTs results to the FlowFile ingest API using AGENT_API_KEY
 *
 * Usage (single target):
 *   node flowfile-agent.js --api https://your-app.com/api/ingest/health --target <target_id> --work /path/to/working --backup /path/to/backup
 *
 * Usage (scan all targets):
 *   node flowfile-agent.js --api https://your-app.com/api/ingest/health --all
 *
 * Required env/flags:
 *   AGENT_API_KEY (or --key flag)
 */

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

const DEFAULT_MAX_FILES = 50000;
const IGNORE_DIRS = new Set([".git", ".next", "node_modules", "dist", "build"]);

function scanStats(root, maxFiles = DEFAULT_MAX_FILES) {
  try {
    const rootStat = fs.statSync(root);
    if (!rootStat.isDirectory()) {
      return {
        exists: true,
        fileCount: rootStat.isFile() ? 1 : 0,
        totalBytes: rootStat.isFile() ? rootStat.size : 0,
        latestMtimeMs: rootStat.mtimeMs ?? null,
        truncated: false,
      };
    }
  } catch (err) {
    return {
      exists: false,
      fileCount: 0,
      totalBytes: 0,
      latestMtimeMs: null,
      truncated: false,
      error: err instanceof Error ? err.message : "Failed to stat path",
    };
  }

  const stats = {
    exists: true,
    fileCount: 0,
    totalBytes: 0,
    latestMtimeMs: null,
    truncated: false,
  };

  const stack = [root];
  while (stack.length > 0 && !stats.truncated) {
    const dir = stack.pop();
    if (!dir) break;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      stats.error = err instanceof Error ? err.message : "Failed to read dir";
      continue;
    }

    for (const entry of entries) {
      if (stats.fileCount >= maxFiles) {
        stats.truncated = true;
        break;
      }

      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        stack.push(full);
        continue;
      }

      if (!entry.isFile()) continue;

      try {
        const stat = fs.statSync(full);
        stats.fileCount += 1;
        stats.totalBytes += stat.size;
        if (!stats.latestMtimeMs || stat.mtimeMs > stats.latestMtimeMs) {
          stats.latestMtimeMs = stat.mtimeMs;
        }
      } catch (err) {
        stats.error = err instanceof Error ? err.message : "Failed to stat file";
      }
    }
  }

  return stats;
}

function deriveStatus(workStats, backupStats) {
  if (!workStats.exists || !backupStats.exists) {
    return { status: "critical", reason: "missing folder" };
  }
  if (!workStats.latestMtimeMs || !backupStats.latestMtimeMs) {
    return { status: "warning", reason: "missing file timestamps" };
  }

  const ageHours = Math.max(
    (workStats.latestMtimeMs - backupStats.latestMtimeMs) / 3.6e6,
    0
  );
  if (ageHours <= 48) return { status: "healthy", reason: "backup fresh" };
  if (ageHours <= 14 * 24) return { status: "warning", reason: "backup stale" };
  return { status: "critical", reason: "backup very stale" };
}

async function fetchTargets(api, key) {
  const url = api.replace(/\/ingest\/health$/, "/ingest/targets");
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch targets: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return Array.isArray(data.targets) ? data.targets : [];
}

async function sendPayload(api, key, payload) {
  const res = await fetch(api, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to send health data: ${await res.text()}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : null;
  };

  const api = arg("--api") || process.env.FLOWFILE_API_URL;
  const key = arg("--key") || process.env.AGENT_API_KEY;
  const scanAll = args.includes("--all");
  const targetId = arg("--target");
  const work = arg("--work");
  const backup = arg("--backup");
  const maxFiles = arg("--max-files") ? Number(arg("--max-files")) : DEFAULT_MAX_FILES;

  if (!api || !key || (!scanAll && (!targetId || !work || !backup))) {
    console.error(
      [
        "Usage: node flowfile-agent.js --api <url> --key <api-key> --target <id> --work <path> --backup <path>",
        "Or:    node flowfile-agent.js --api <url> --key <api-key> --all",
      ].join("\n")
    );
    process.exit(1);
  }

  const sendForTarget = async (target) => {
    const workStats = scanStats(target.work, maxFiles);
    const backupStats = scanStats(target.backup, maxFiles);
    const { status, reason } = deriveStatus(workStats, backupStats);
    const lastSynced = backupStats.latestMtimeMs
      ? new Date(backupStats.latestMtimeMs).toISOString()
      : null;

    const freshnessHours =
      workStats.latestMtimeMs && backupStats.latestMtimeMs
        ? (workStats.latestMtimeMs - backupStats.latestMtimeMs) / 3.6e6
        : null;

    const payload = {
      target_id: target.id,
      status,
      notes: reason,
      last_synced_at: lastSynced,
      metrics: {
        working_path: target.work,
        backup_path: target.backup,
        working_last_modified: workStats.latestMtimeMs,
        backup_last_modified: backupStats.latestMtimeMs,
        working_file_count: workStats.fileCount,
        backup_file_count: backupStats.fileCount,
        working_total_bytes: workStats.totalBytes,
        backup_total_bytes: backupStats.totalBytes,
        freshness_hours: freshnessHours,
        truncated: workStats.truncated || backupStats.truncated || false,
      },
    };

    await sendPayload(api, key, payload);
    console.log("Sent health data:", target.id, payload.status);
  };

  if (scanAll) {
    const targets = await fetchTargets(api, key);
    if (targets.length === 0) {
      console.log("No targets found.");
      return;
    }

    for (const target of targets) {
      await sendForTarget({
        id: target.id,
        work: target.working_path,
        backup: target.backup_path,
      });
    }
    return;
  }

  await sendForTarget({ id: targetId, work, backup });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
