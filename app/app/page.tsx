import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import {
  createCheckoutAction,
  createTargetAction,
  deleteTargetAction,
  scanTargetAction,
} from "./server-actions";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await supabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError?.message?.toLowerCase().includes("invalid refresh token")) {
    await supabase.auth.signOut();
    redirect("/login?session=expired");
  }

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
  const { data: targets } = await supabase
    .from("backup_targets")
    .select("id, working_path, backup_path, status, last_synced_at, notes")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  const { data: logs } = await supabase
    .from("backup_health_log")
    .select(
      "id, target_id, status, notes, metrics, created_at, backup_targets!inner(working_path, user_id)"
    )
    .eq("backup_targets.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const active = sub?.status === "active" || sub?.status === "trialing";
  const now = Number(new Date());

  type LogItem = NonNullable<typeof logs>[number];

  function getLogTargetPath(log: LogItem) {
    const target = Array.isArray(log.backup_targets)
      ? log.backup_targets[0]
      : log.backup_targets;
    return target?.working_path || "Unknown target";
  }

  function statusBadge(status?: string, lastSynced?: string | null) {
    const asDate = lastSynced ? new Date(lastSynced) : null;
    const ageHours = asDate ? (now - asDate.getTime()) / 3.6e6 : Infinity;

    const resolvedStatus =
      status ||
      (ageHours <= 48 ? "healthy" : ageHours <= 14 * 24 ? "warning" : "critical");

    const map: Record<
      string,
      { color: string; text: string; dot: string }
    > = {
      healthy: {
        color: "bg-emerald-500/10 text-emerald-200 ring-emerald-400/30",
        text: "Green · Healthy",
        dot: "bg-emerald-300",
      },
      warning: {
        color: "bg-amber-400/10 text-amber-200 ring-amber-300/30",
        text: "Yellow · Needs attention",
        dot: "bg-amber-300",
      },
      critical: {
        color: "bg-rose-500/10 text-rose-200 ring-rose-400/30",
        text: "Red · At risk",
        dot: "bg-rose-400",
      },
    };

    const picked = map[resolvedStatus] ?? map.critical;

    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${picked.color}`}
      >
        <span className={`h-2 w-2 rounded-full ${picked.dot}`} />
        {picked.text}
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <nav className="text-xs text-slate-300">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/"
                className="rounded-full border border-white/10 px-2 py-1 transition hover:border-white/30 hover:text-white"
              >
                Home
              </Link>
            </li>
            <li className="text-slate-500">/</li>
            <li className="rounded-full bg-[var(--accent)]/20 px-2 py-1 text-[var(--accent)] ring-1 ring-[var(--accent)]/40">
              Dashboard
            </li>
          </ol>
        </nav>

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
              <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[var(--accent-strong)]">
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
              <button className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[var(--accent-strong)]">
                Start subscription
              </button>
            </form>
          </div>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold">Locations</h2>
                <p className="mt-1 text-sm text-slate-200/80">
                  Track your primary folders and where they’re backed up. Add a pair to
                  get a quick health read.
                </p>
                <form
                  action={createTargetAction}
                  className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-4"
                >
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-200/90">Primary working folder</span>
                    <input
                      name="workingPath"
                      required
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-400"
                      placeholder="/Volumes/Projects"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-slate-200/90">Backup folder or cloud</span>
                    <input
                      name="backupPath"
                      required
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-400"
                      placeholder="Backblaze B2 /creative-archive"
                    />
                  </label>
                  <div className="flex justify-end">
                    <button className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[var(--accent-strong)]">
                      Add location
                    </button>
                  </div>
                </form>

                <div className="mt-4 grid gap-3">
                  {(targets ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            {item.working_path}
                          </p>
                          <p className="text-xs text-slate-300">
                            Backup: {item.backup_path}
                          </p>
                        </div>
                        {statusBadge(item.status, item.last_synced_at)}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                        <span>
                          Last sync:{" "}
                          {item.last_synced_at
                            ? new Date(item.last_synced_at).toLocaleString()
                            : "Unknown"}
                        </span>
                        {item.notes ? <span>Note: {item.notes}</span> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <form action={scanTargetAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button className="text-xs text-slate-200 underline underline-offset-4 hover:text-white">
                            Scan now
                          </button>
                        </form>
                        <form action={deleteTargetAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button className="text-xs text-slate-300 underline underline-offset-4 hover:text-slate-100">
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                  {(targets ?? []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-200/80">
                      No locations yet. Add your primary folder and backup target to see
                      health.
                    </div>
                  )}
                </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Weekly health report</h2>
            <p className="mt-2 text-sm text-slate-200/80">
                  A plain-English email summary of freshness and redundancy. Hook your
                  email provider to send this automatically.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 items-center rounded-full bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                    Planned
                  </div>
                  <span className="text-xs text-slate-300">
                    (Enable via your email provider integration.)
                  </span>
                </div>
                <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/50 p-4 text-xs text-slate-200/80">
                  <p className="font-semibold text-slate-100">Sample report</p>
                  <ul className="mt-3 space-y-2">
                    <li>• Green: /Volumes/Projects → Backblaze B2 (synced 2h ago)</li>
                    <li>• Yellow: /ClientB/Renders → NAS (last sync 7d ago)</li>
                    <li>• Red: /PassionProject/RAW missing in backup</li>
                  </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent health checks</h2>
            <p className="text-xs text-slate-300">Last 10 entries</p>
          </div>
          <div className="mt-4 space-y-3">
            {(logs ?? []).map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {getLogTargetPath(log)}
                  </p>
                  <p className="text-xs text-slate-300">
                    {log.notes || "No notes"} •{" "}
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  {statusBadge(log.status, log.created_at)}
                  {log.metrics?.freshness_hours != null && (
                    <span className="rounded-full bg-white/5 px-3 py-1">
                      Δ {Math.round(log.metrics.freshness_hours)}h
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(logs ?? []).length === 0 && (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-sm text-slate-200/80">
                No health checks yet. Run the agent to send status updates.
              </div>
            )}
          </div>
        </section>
      </>
    )}
  </div>
</main>
  );
}
