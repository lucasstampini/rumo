import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

/** Usuário logado + perfil completo (inclui telefone/CNH, que só o dono lê). Redireciona se não houver sessão. */
export async function requireProfile() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.rpc("get_my_profile");
  if (!profile?.id) redirect("/login");
  return { supabase, user, profile };
}
