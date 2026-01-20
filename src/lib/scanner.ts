export type ScanStats = {
  exists: boolean;
  fileCount: number;
  totalBytes: number;
  latestMtimeMs: number | null;
  truncated?: boolean;
  error?: string;
};

export type ScanSummary = {
  status: "healthy" | "warning" | "critical";
  notes: string;
  lagHours: number | null;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value < 10 && idx > 0 ? 1 : 0)} ${units[idx]}`;
}

function formatLagHours(hours: number) {
  if (!Number.isFinite(hours)) return "unknown";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function buildScanSummary(params: {
  workingPath: string;
  backupPath: string;
  working: ScanStats;
  backup: ScanStats;
}): ScanSummary {
  const { workingPath, backupPath, working, backup } = params;

  if (!working.exists) {
    return {
      status: "critical",
      notes: `Working path not found: ${workingPath}`,
      lagHours: null,
    };
  }

  if (!backup.exists) {
    return {
      status: "critical",
      notes: `Backup path not found: ${backupPath}`,
      lagHours: null,
    };
  }

  if (working.fileCount === 0) {
    return {
      status: "warning",
      notes: "Working path contains no files.",
      lagHours: null,
    };
  }

  if (backup.fileCount === 0) {
    return {
      status: "warning",
      notes: "Backup path contains no files.",
      lagHours: null,
    };
  }

  if (!working.latestMtimeMs || !backup.latestMtimeMs) {
    return {
      status: "warning",
      notes: "Missing last modified timestamps for comparison.",
      lagHours: null,
    };
  }

  const lagHours = Math.max((working.latestMtimeMs - backup.latestMtimeMs) / 3.6e6, 0);
  let status: ScanSummary["status"] = "warning";
  if (lagHours <= 24) status = "healthy";
  else if (lagHours <= 72) status = "warning";
  else status = "critical";

  const truncationNote =
    working.truncated || backup.truncated ? " Scan truncated due to file limit." : "";

  let notes = [
    `Working: ${working.fileCount} files, ${formatBytes(working.totalBytes)}.`,
    `Backup: ${backup.fileCount} files, ${formatBytes(backup.totalBytes)}.`,
    `Lag: ${formatLagHours(lagHours)}.${truncationNote}`,
  ].join(" ");

  if (working.error || backup.error) {
    notes = `${notes} Partial errors encountered.`;
  }

  return { status, notes, lagHours };
}
