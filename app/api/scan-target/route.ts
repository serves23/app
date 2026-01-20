import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildScanSummary, type ScanStats } from "@/lib/scanner";

type ScanPayload = {
  targetId: string;
  working: ScanStats;
  backup: ScanStats;
};

function readBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

function isScanStats(value: unknown): value is ScanStats {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.exists === "boolean" &&
    typeof record.fileCount === "number" &&
    typeof record.totalBytes === "number" &&
    (record.latestMtimeMs === null || typeof record.latestMtimeMs === "number")
  );
}

export async function POST(req: Request) {
  const token = readBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(
    token
  );

  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let payload: ScanPayload | null = null;
  try {
    payload = (await req.json()) as ScanPayload;
  } catch {
    payload = null;
  }

  if (!payload?.targetId || !isScanStats(payload.working) || !isScanStats(payload.backup)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin
    .from("backup_targets")
    .select("id,user_id,working_path,backup_path")
    .eq("id", payload.targetId)
    .maybeSingle();

  if (!target || target.user_id !== authData.user.id) {
    return NextResponse.json({ error: "Target not found" }, { status: 404 });
  }

  const summary = buildScanSummary({
    workingPath: target.working_path,
    backupPath: target.backup_path,
    working: payload.working,
    backup: payload.backup,
  });

  await supabaseAdmin
    .from("backup_targets")
    .update({
      status: summary.status,
      notes: summary.notes,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.targetId)
    .eq("user_id", authData.user.id);

  return NextResponse.json({ ok: true, status: summary.status, notes: summary.notes });
}
