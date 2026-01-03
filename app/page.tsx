import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { logoutAction } from "./actions";

export default async function Home() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold tracking-tight">Ultra SaaS</div>
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
                href="/login"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold transition hover:bg-slate-200"
              >
                Start free trial
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-24 pt-10">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
              Subscription ready starter
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Launch a paid app fast with Supabase auth + Stripe subscriptions.
            </h1>
            <p className="max-w-2xl text-lg text-slate-200/80">
              Password auth, profiles, customer mapping, subscription gating, and a
              Stripe webhook that keeps entitlements in sync. Ship a working SaaS
              shell in minutes, not days.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={user ? "/app" : "/signup"}
                className="rounded-full bg-white text-slate-900 px-5 py-3 text-sm font-semibold transition hover:bg-slate-200"
              >
                {user ? "Open dashboard" : "Create account"}
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
                >
                  I already have an account
                </Link>
              )}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase text-slate-300">Auth state</p>
                <p className="text-base font-semibold text-white">
                  {user ? `Signed in as ${user.email}` : "Not signed in"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase text-slate-300">Paywall</p>
                <p className="text-base font-semibold text-white">
                  Subscription gating wired to Supabase + Stripe
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-xs uppercase text-slate-300">Webhooks</p>
                <p className="text-base font-semibold text-white">
                  Stripe webhook updates entitlements automatically
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:grid-cols-3">
          {[
            {
              title: "Supabase auth",
              desc: "Password login, profile upsert, RLS policies enforced.",
            },
            {
              title: "Stripe billing",
              desc: "Checkout session, customer map, subscription sync via webhook.",
            },
            {
              title: "Fast start",
              desc: "Minimal UI shell so you can drop in your tool immediately.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-slate-900/50 p-4"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-200/80">{item.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
