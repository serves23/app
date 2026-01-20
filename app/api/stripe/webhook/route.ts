import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  async function userIdFromCustomer(customerId: string) {
    const supabaseAdmin = getSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from("customers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    return data?.user_id ?? null;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription & {
      current_period_end?: number | null;
    };
    const customerId = String(sub.customer);
    const userId = await userIdFromCustomer(customerId);

    if (userId) {
      const periodEnd =
        sub.current_period_end != null
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;

      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.from("subscriptions").upsert({
        user_id: userId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
