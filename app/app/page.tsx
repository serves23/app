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
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-300">Signed in as {user.email}</p>
            <h1 className="text-3xl font-semibold">Backup Health Dashboard</h1>
          </div>
          {active ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Subscription active
            </span>
          ) : (
            <form action={createCheckoutAction}>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
                Unlock with subscription
              </button>
            </form>
          )}
        </header>

        {!active ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Access locked</h2>
            <p className="mt-2 text-slate-200/80">
              Subscribe to run health checks, see risks, and get weekly reports.
            </p>
            <form action={createCheckoutAction} className="mt-4">
              <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
                Start subscription
              </button>
            </form>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Primary working folder",
                  value: "/Volumes/Projects",
                  status: "green",
                  meta: "Synced 2h ago",
                },
                {
                  title: "Backup location",
                  value: "Backblaze B2 /creative-archive",
                  status: "yellow",
                  meta: "Last sync: 14 days ago",
                },
                {
                  title: "Redundancy",
                  value: "Some files only in one place",
                  status: "red",
                  meta: "3 folders missing in backup",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {item.title}
                    </h3>
                    <span
                      className={`h-3 w-3 rounded-full ${
                        item.status === "green"
                          ? "bg-emerald-400"
                          : item.status === "yellow"
                          ? "bg-amber-300"
                          : "bg-rose-400"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{item.meta}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Risks detected</h2>
                  <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200 ring-1 ring-rose-400/40">
                    Needs attention
                  </span>
                </div>
                <ul className="mt-4 space-y-3 text-sm text-slate-200/90">
                  <li className="rounded-xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-400/30">
                    These 3 folders are not backed up: /ClientA/2024, /ClientB/Renders,
                    /PassionProject/RAW
                  </li>
                  <li className="rounded-xl bg-amber-400/10 px-4 py-3 ring-1 ring-amber-300/30">
                    Backup has not synced in 14 days — reconnect and run a sync.
                  </li>
                  <li className="rounded-xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-400/30">
                    18 files exist only on the primary drive (no redundancy).
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold">Weekly health report</h2>
                <p className="mt-2 text-sm text-slate-200/80">
                  A plain-English summary sent every week with risks and next steps.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 items-center rounded-full bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                    Enabled
                  </div>
                  <span className="text-xs text-slate-300">
                    (Connect your email provider to make this live.)
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                  Smoke detector for creative data
                </div>
                <p className="text-sm text-slate-200/80">
                  Checks last modified dates, backup freshness, and redundancy at a
                  glance.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
