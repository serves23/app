import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError?.message?.toLowerCase().includes("invalid refresh token")) {
    await supabase.auth.signOut();
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
        <main className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-6 py-10">
          <h1 className="text-2xl font-semibold">Session expired</h1>
          <p className="text-sm text-slate-200/80">
            Your session was invalid. Please log in again.
          </p>
          <Link
            href="/login"
            className="rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold transition hover:bg-slate-200"
          >
            Go to login
          </Link>
        </main>
      </div>
    );
  }

  const user = auth.user;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <h1 className="text-4xl sm:text-5xl lg:text-[72px] xl:text-[100px] font-bold leading-none tracking-tight text-white">
          FlowFile
        </h1>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-slate-200">{user.email}</span>
              <form action={logoutAction}>
                <button className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10">
                  Log out
                </button>
              </form>
              <Link
                href="/app"
                className="rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold transition hover:bg-slate-200"
              >
                Go to app
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="rounded-full bg-[var(--accent)] text-slate-900 px-4 py-2 text-sm font-semibold transition hover:bg-[var(--accent-strong)]"
              >
                Start free trial
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 pb-20 pt-8 sm:px-6">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Know your creative work is safe — without thinking about it.
            </h1>
            <p className="max-w-3xl text-lg text-slate-200/80">
              A small utility that quietly checks your creative files and workflows, so
              nothing slips through the cracks.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={user ? "/app" : "/signup"}
                className="rounded-full bg-[var(--accent)] text-slate-900 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--accent-strong)]"
              >
                Start free trial
              </Link>
              <Link
                href={user ? "/app" : "/login"}
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Most creators assume their systems are working.
                </p>
                <p className="text-lg text-slate-50">They usually aren’t.</p>
                <p className="mt-3 text-sm text-slate-200/80">
                  This tool exists to remove that anxiety — calmly, automatically, and
                  without complexity.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase text-slate-300">What it checks</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-200/85">
                  <li>• Are your important folders actually backed up?</li>
                  <li>• When was the last successful sync?</li>
                  <li>• Which files exist in only one location?</li>
                  <li>• What projects or ideas have gone stale?</li>
                  <li>• Where is friction quietly building?</li>
                </ul>
                <p className="mt-3 text-xs text-slate-300">
                  No dashboards to manage. No settings to obsess over. You get clear
                  answers — and calm.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">The problem</h2>
            <p className="mt-2 text-slate-200/80">
              Creative work fails in boring ways. You don’t notice until it’s too late.
              This app notices before that happens.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Backups stop running",
                "Files live in only one place",
                "Drives fail silently",
                "Projects get stuck half-finished",
                "Weeks pass without publishing",
                "Friction accumulates quietly",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-200/85"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-200/85">
              <li>
                <span className="font-semibold text-slate-100">1. Connect what matters</span>{" "}
                — Select the folders or workflows you care about.
              </li>
              <li>
                <span className="font-semibold text-slate-100">2. Let it run quietly</span>{" "}
                — The app checks in the background — no micromanaging.
              </li>
              <li>
                <span className="font-semibold text-slate-100">3. Get clear signals</span>{" "}
                — Weekly summaries tell you what’s healthy and what needs attention.
                Green is good. Yellow means check soon. Red means act now.
              </li>
            </ol>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">Who this is for</h2>
          <p className="mt-2 text-slate-200/80">
            For serious creators who have years of work they can’t afford to lose, value
            simple, reliable systems, and prefer clarity over complexity.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["Photographers", "Videographers", "YouTubers", "Independent creators"].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-sm text-slate-200/85"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">Why this exists</h2>
          <p className="mt-2 text-sm text-slate-200/80">
            Built by someone technical enough to see where systems fail and creative
            enough to know how disruptive that failure feels. Most tools are built by
            people who don’t live with creative work every day. This one is.
          </p>
        </section>

        <section className="grid gap-6 rounded-3xl border border-[var(--accent)]/40 bg-white/10 p-6 shadow-xl lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <p className="inline-flex items-center rounded-full bg-[var(--accent)]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent)] ring-1 ring-[var(--accent)]/40">
              Early access offer
            </p>
            <h2 className="text-3xl font-semibold text-white">Simple, honest pricing</h2>
            <p className="text-lg font-semibold text-white">
              $7/month during beta · $10/month after launch
            </p>
            <p className="text-sm text-slate-200/80">
              Free for 30 days · Cancel anytime · No lock-in · No long onboarding.
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-3">
            <Link
              href={user ? "/app" : "/signup"}
              className="rounded-full bg-[var(--accent)] text-slate-900 px-6 py-3 text-sm font-semibold transition hover:bg-[var(--accent-strong)]"
            >
              Start free trial
            </Link>
            <Link
              href={user ? "/app" : "/login"}
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/50 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
          <h2 className="text-2xl font-semibold">
            Stop wondering if things are working.
          </h2>
          <p className="mt-2 text-sm text-slate-200/80">
            Let a small, quiet tool keep an eye on it — so you don’t have to.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href={user ? "/app" : "/signup"}
              className="rounded-full bg-[var(--accent)] text-slate-900 px-5 py-3 text-sm font-semibold transition hover:bg-[var(--accent-strong)]"
            >
              Start free trial
            </Link>
            <Link
              href={user ? "/app" : "/login"}
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-300">
            No ads · No tracking beyond usage · No data sold — ever
          </p>
        </section>
      </main>
    </div>
  );
}
