import Link from "next/link";
import { signupAction } from "./server-actions";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-12 lg:flex-row lg:items-stretch lg:gap-12">
        <div className="flex-1 space-y-4 text-center lg:text-left">
          <p className="text-sm uppercase tracking-wide text-slate-300">
            Start free trial
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white">
            Create your account and keep your creative work safe.
          </h1>
          <p className="text-base text-slate-200/80">
            Add your folders, let the app run quietly, and get clear signals each week.
          </p>
          <div className="flex items-center justify-center gap-3 text-sm text-slate-300 lg:justify-start">
            <span className="rounded-full bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
              $7/month during beta
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-100 ring-1 ring-white/20">
              Cancel anytime
            </span>
          </div>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur lg:w-[420px]">
          <form action={signupAction} className="grid gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-100">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/30"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-100">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/30"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-[var(--accent-strong)]"
            >
              Create account
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-300">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-white underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
