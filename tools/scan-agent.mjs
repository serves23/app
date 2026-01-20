#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_FILES = 50000;
const DEFAULT_IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    args[key] = value;
    i += 1;
  }
  return args;
}

async function scanPathStats(rootPath, options) {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const ignoreDirs = options.ignoreDirs ?? DEFAULT_IGNORE_DIRS;

  try {
    const rootStats = await fs.stat(rootPath);
    if (!rootStats.isDirectory()) {
      return {
        exists: true,
        fileCount: rootStats.isFile() ? 1 : 0,
        totalBytes: rootStats.isFile() ? rootStats.size : 0,
        latestMtimeMs: rootStats.mtimeMs ?? null,
        truncated: false,
      };
    }
  } catch (error) {
    return {
      exists: false,
      fileCount: 0,
      totalBytes: 0,
      latestMtimeMs: null,
      truncated: false,
      error: error instanceof Error ? error.message : "Failed to stat path",
    };
  }

  const stats = {
    exists: true,
    fileCount: 0,
    totalBytes: 0,
    latestMtimeMs: null,
    truncated: false,
  };

  const queue = [rootPath];

  while (queue.length > 0 && !stats.truncated) {
    const current = queue.pop();
    if (!current) break;

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      stats.error = error instanceof Error ? error.message : "Failed to read dir";
      continue;
    }

    for (const entry of entries) {
      if (stats.fileCount >= maxFiles) {
        stats.truncated = true;
        break;
      }

      if (entry.isSymbolicLink()) continue;

      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) continue;
        queue.push(entryPath);
        continue;
      }

      if (!entry.isFile()) continue;

      try {
        const fileStats = await fs.stat(entryPath);
        stats.fileCount += 1;
        stats.totalBytes += fileStats.size;
        const mtime = fileStats.mtimeMs ?? null;
        if (mtime && (!stats.latestMtimeMs || mtime > stats.latestMtimeMs)) {
          stats.latestMtimeMs = mtime;
        }
      } catch (error) {
        stats.error = error instanceof Error ? error.message : "Failed to stat file";
      }
    }
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appUrl = args["app-url"];
  const token = args["token"];
  const targetId = args["target-id"];
  const workingPath = args["working-path"];
  const backupPath = args["backup-path"];
  const scanAll = args["all"] === "true" || args["all"] === "1";
  const maxFiles = args["max-files"] ? Number(args["max-files"]) : DEFAULT_MAX_FILES;

  if (!appUrl || !token || (!scanAll && (!targetId || !workingPath || !backupPath))) {
    console.error(
      [
        "Usage:",
        "  node tools/scan-agent.mjs \\",
        "    --app-url https://your-app.com \\",
        "    --token <SUPABASE_ACCESS_TOKEN> \\",
        "    --target-id <BACKUP_TARGET_ID> \\",
        "    --working-path /path/to/working \\",
        "    --backup-path /path/to/backup",
        "",
        "Or scan all targets:",
        "  node tools/scan-agent.mjs \\",
        "    --app-url https://your-app.com \\",
        "    --token <SUPABASE_ACCESS_TOKEN> \\",
        "    --all true",
      ].join("\n")
    );
    process.exit(1);
  }

  const baseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;

  const uploadScan = async (payload) => {
    const res = await fetch(`${baseUrl}/api/scan-target`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Scan upload failed (${res.status}): ${text}`);
    }

    return res.json();
  };

  if (scanAll) {
    const res = await fetch(`${baseUrl}/api/scan-targets`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Target list failed (${res.status}): ${text}`);
    }

    const { targets } = await res.json();
    if (!targets || targets.length === 0) {
      console.log("No targets found.");
      return;
    }

    for (const target of targets) {
      const [working, backup] = await Promise.all([
        scanPathStats(target.working_path, { maxFiles }),
        scanPathStats(target.backup_path, { maxFiles }),
      ]);

      const result = await uploadScan({
        targetId: target.id,
        working,
        backup,
      });
      console.log(`Scanned ${target.working_path} -> ${target.backup_path}`, result);
    }

    return;
  }

  const [working, backup] = await Promise.all([
    scanPathStats(workingPath, { maxFiles }),
    scanPathStats(backupPath, { maxFiles }),
  ]);

  const data = await uploadScan({ targetId, working, backup });
  console.log("Scan uploaded:", data);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
