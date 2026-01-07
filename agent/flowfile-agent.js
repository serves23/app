#!/usr/bin/env node
/**
 * FlowFile Agent - local folder health checker
 *
 * - Computes basic health for a working folder + backup folder:
 *   - Checks both exist
 *   - Uses most recent modified time for each to derive freshness
 *   - Status rules:
 *     healthy: both present and freshness delta <= 48h
 *     warning: both present and freshness delta <= 14d
 *     critical: otherwise
 * - POSTs results to the FlowFile ingest API using AGENT_API_KEY
 *
 * Usage:
 *   node flowfile-agent.js --api https://your-app.com/api/ingest/health --target <target_id> --work /path/to/working --backup /path/to/backup
 *
 * Required env/flags:
 *   AGENT_API_KEY (or --key flag)
 */

import fs from "fs";
import path from "path";
import process from "process";
import { fileURLToPath } from "url";

function latestMtime(p) {
  let latest = 0;
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      try {
        const stat = fs.statSync(full);
        if (stat.mtimeMs > latest) latest = stat.mtimeMs;
        if (entry.isDirectory()) walk(full);
      } catch {
        // ignore unreadable files
      }
    }
  }
  walk(p);
  return latest || null;
}

function deriveStatus(workMtime, backupMtime) {
  if (!workMtime || !backupMtime) return { status: "critical", reason: "missing folder or metadata" };
  const ageHours = (workMtime - backupMtime) / 3.6e6;
  if (ageHours <= 48) return { status: "healthy", reason: "backup fresh" };
  if (ageHours <= 14 * 24) return { status: "warning", reason: "backup stale" };
  return { status: "critical", reason: "backup very stale" };
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : null;
  };

  const api = arg("--api") || process.env.FLOWFILE_API_URL;
  const key = arg("--key") || process.env.AGENT_API_KEY;
  const targetId = arg("--target");
  const work = arg("--work");
  const backup = arg("--backup");

  if (!api || !key || !targetId || !work || !backup) {
    console.error("Usage: node flowfile-agent.js --api <url> --key <api-key> --target <id> --work <path> --backup <path>");
    process.exit(1);
  }

  if (!fs.existsSync(work) || !fs.existsSync(backup)) {
    console.error("Working or backup path does not exist");
    process.exit(1);
  }

  const workMtime = latestMtime(work);
  const backupMtime = latestMtime(backup);
  const { status, reason } = deriveStatus(workMtime, backupMtime);
  const lastSynced = backupMtime ? new Date(backupMtime).toISOString() : null;

  const payload = {
    target_id: targetId,
    status,
    notes: reason,
    last_synced_at: lastSynced,
    metrics: {
      working_path: work,
      backup_path: backup,
      working_last_modified: workMtime,
      backup_last_modified: backupMtime,
      freshness_hours: backupMtime && workMtime ? (workMtime - backupMtime) / 3.6e6 : null,
    },
  };

  const res = await fetch(api, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Failed to send health data:", await res.text());
    process.exit(1);
  }

  console.log("Sent health data:", payload);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
