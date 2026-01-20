import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Payload = {
  target_id: string;
  status?: string;
  notes?: string;
  metrics?: Record<string, unknown>;
  last_synced_at?: string;
};

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7)
    : null;

  if (!token || token !== process.env.AGENT_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.target_id) {
    return NextResponse.json({ error: "target_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const status = payload.status ?? "unknown";
  const notes = payload.notes ?? null;
  const metrics = payload.metrics ?? null;
  const lastSynced = payload.last_synced_at ?? null;

  // Update the target status/last_synced_at for quick reads
  await supabase
    .from("backup_targets")
    .update({
      status,
      last_synced_at: lastSynced,
      updated_at: new Date().toISOString(),
      notes,
    })
    .eq("id", payload.target_id)
    .throwOnError();

  // Append to health log
  await supabase
    .from("backup_health_log")
    .insert({
      target_id: payload.target_id,
      status,
      notes,
      metrics,
    })
    .throwOnError();

  return NextResponse.json({ ok: true });
}
