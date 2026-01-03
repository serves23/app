"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function signupAction(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);

  if (data.user) {
    await supabase.from("profiles").upsert({ id: data.user.id, email });
  }

  redirect("/app");
}
