import { signupAction } from "./server-actions";

export default function SignupPage() {
  return (
    <main style={{ maxWidth: 420, margin: "60px auto" }}>
      <h1>Create account</h1>
      <form action={signupAction} style={{ display: "grid", gap: 12 }}>
        <input name="email" placeholder="Email" type="email" required />
        <input name="password" placeholder="Password" type="password" required />
        <button type="submit">Create account</button>
      </form>
    </main>
  );
}
