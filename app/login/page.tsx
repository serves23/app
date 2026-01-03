import { loginAction } from "./server-actions";

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "60px auto" }}>
      <h1>Login</h1>
      <form action={loginAction} style={{ display: "grid", gap: 12 }}>
        <input name="email" placeholder="Email" type="email" required />
        <input name="password" placeholder="Password" type="password" required />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
