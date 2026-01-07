"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
