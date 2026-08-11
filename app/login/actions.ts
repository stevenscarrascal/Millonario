"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function login(formData: FormData) {
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  if (!email || !password) redirect("/login?error=Completa%20todos%20los%20campos");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Correo%20o%20contraseña%20incorrectos");
  redirect("/panel");
}

export async function signup(formData: FormData) {
  const fullName = text(formData, "fullName");
  const company = text(formData, "company");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "password");
  if (!fullName || !company || !email || password.length < 8) redirect("/login?mode=signup&error=Completa%20los%20campos%20y%20usa%208%20caracteres");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, company } } });
  if (error) redirect("/login?mode=signup&error=No%20fue%20posible%20crear%20la%20cuenta");
  redirect("/login?message=Revisa%20tu%20correo%20para%20confirmar%20la%20cuenta");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
