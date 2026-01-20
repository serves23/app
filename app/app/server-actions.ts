"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildScanSummary, type ScanStats } from "@/lib/scanner";
import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SCAN_MAX_FILES = 50000;
const SCAN_IGNORE_DIRS = new Set([
  ".git",
  ".next",
  "node_modules",
  "dist",
  "build",
]);

async function scanPathStats(rootPath: string): Promise<ScanStats> {
  try {
    const rootStats = await fs.stat(rootPath);
    if (!rootStats.isDirectory()) {
      const latest = rootStats.mtimeMs ?? null;
      return {
        exists: true,
        fileCount: rootStats.isFile() ? 1 : 0,
        totalBytes: rootStats.isFile() ? rootStats.size : 0,
        latestMtimeMs: latest,
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

  const stats: ScanStats = {
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

    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      stats.error = error instanceof Error ? error.message : "Failed to read dir";
      continue;
    }

    for (const entry of entries) {
      if (stats.fileCount >= SCAN_MAX_FILES) {
        stats.truncated = true;
        break;
      }

      if (entry.isSymbolicLink()) continue;

      const entryPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (SCAN_IGNORE_DIRS.has(entry.name)) continue;
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

export async function createCheckoutAction() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const supabaseAdmin = getSupabaseAdmin();
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    await supabaseAdmin.from("customers").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?canceled=1`,
    allow_promotion_codes: true,
  });

  redirect(session.url!);
}

export async function createTargetAction(formData: FormData) {
  const workingPath = String(formData.get("workingPath") || "").trim();
  const backupPath = String(formData.get("backupPath") || "").trim();

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  if (!workingPath || !backupPath) redirect("/app?error=missing_paths");

  await supabase
    .from("backup_targets")
    .insert({
      user_id: user.id,
      working_path: workingPath,
      backup_path: backupPath,
      status: "healthy",
      last_synced_at: new Date().toISOString(),
      notes: "Placeholder status — connect real scanner to update this.",
    })
    .throwOnError();

  redirect("/app");
}

export async function deleteTargetAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  if (!id) redirect("/app?error=missing_id");

  await supabase.from("backup_targets").delete().eq("id", id).eq("user_id", user.id);
  redirect("/app");
}

export async function scanTargetAction(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  if (!id) redirect("/app?error=missing_id");

  const { data: target } = await supabase
    .from("backup_targets")
    .select("id, working_path, backup_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!target) redirect("/app?error=missing_target");

  const workingPath = target.working_path;
  const backupPath = target.backup_path;

  if (!path.isAbsolute(workingPath) || !path.isAbsolute(backupPath)) {
    const status = "critical";
    const notes = "Scanner requires absolute local paths for both locations.";
    await supabase
      .from("backup_targets")
      .update({
        status,
        notes,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);
    redirect("/app");
  }

  const [workingStats, backupStats] = await Promise.all([
      scanPathStats(workingPath),
      scanPathStats(backupPath),
  ]);

  const summary = buildScanSummary({
    workingPath,
    backupPath,
    working: workingStats,
    backup: backupStats,
  });

  await supabase
    .from("backup_targets")
    .update({
      status: summary.status,
      notes: summary.notes,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  redirect("/app");
}
