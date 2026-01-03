import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createCheckoutAction } from "./server-actions";

export default async function AppPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  if (!user) {
    return (
      <main style={{ maxWidth: 720, margin: "60px auto" }}>
        <h1>You’re not logged in</h1>
        <Link href="/login">Go to login</Link>
      </main>
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const active = sub?.status === "active" || sub?.status === "trialing";

  return (
    <main style={{ maxWidth: 720, margin: "60px auto" }}>
      <h1>Dashboard</h1>
      <p>Signed in as: {user.email}</p>

      {active ? (
        <>
          <p>✅ Subscription active.</p>
          <div style={{ marginTop: 24 }}>
            <h2>Your tool goes here</h2>
            <p>Keep this section ultra-minimal for v1.</p>
          </div>
        </>
      ) : (
        <>
          <p>🔒 Locked. Subscribe to access.</p>
          <form action={createCheckoutAction}>
            <button type="submit">Start subscription</button>
          </form>
        </>
      )}
    </main>
  );
}
