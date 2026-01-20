import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

function readBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice("Bearer ".length).trim();
}

export async function GET(req: Request) {
  const token = readBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(
    token
  );

  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("backup_targets")
    .select("id,working_path,backup_path")
    .eq("user_id", authData.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ targets: data ?? [] });
}
