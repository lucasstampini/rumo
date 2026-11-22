import type { Metadata } from "next";
import { LogOut, Star } from "lucide-react";
import { CopyCode } from "@/components/CopyCode";
import { ProfileForm } from "@/components/ProfileForm";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/lib/actions/auth";
import { firstName, plural, rating } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireProfile();
  const { data: stats } = await supabase
    .from("profile_ratings")
    .select("avg_rating, review_count")
    .eq("profile_id", user.id)
    .maybeSingle();

  const code = `${firstName(profile.full_name)
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()}-RUMO30`;

  return (
    <main className="page">
      <h1 className="h1">Perfil</h1>

      <section className="panel" aria-label="Seus dados">
        <div className="flex items-center gap-3">
          <Avatar name={profile.full_name} url={profile.avatar_url} size={56} />
          <div className="min-w-0">
            <b className="text-[17px] block truncate">{profile.full_name}</b>
            <div className="meta">
              <span className="inline-flex items-center gap-1">
                <Star size={12} fill="#f2a516" stroke="none" aria-hidden />
                {stats?.review_count
                  ? `${rating(stats.avg_rating)} · ${plural(stats.review_count, "avaliação", "avaliações")}`
                  : "Sem avaliações ainda"}
              </span>
            </div>
            <div className="meta mt-1">
              {profile.verified ? (
                <span className="badge">CNH verificada</span>
              ) : (
                <span className="badge !bg-[#fdf3dc] !text-[#7a5200]">CNH pendente</span>
              )}
              <span className="badge">Bolha Butantã</span>
            </div>
          </div>
        </div>
        <p className="hint break-all">{user.email}</p>
      </section>

      <section className="earn !flex-row items-center !gap-3.5" aria-label="Indique e ganhe">
        <div className="flex-1">
          <b className="text-base">Indique e ganhe R$ 30</b>
          <br />
          <small>Para cada amigo da USP que alugar ou anunciar um carro.</small>
        </div>
        <CopyCode code={code} />
      </section>

      <section aria-label="Editar perfil" className="flex flex-col gap-3">
        <h2 className="panel-h px-1">Editar perfil</h2>
        <ProfileForm
          mode="edit"
          userId={user.id}
          initial={{
            full_name: profile.full_name,
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            verified: profile.verified,
          }}
        />
      </section>

      <form action={signOut}>
        <button type="submit" className="ghost w-full !bg-card danger">
          <LogOut size={18} aria-hidden /> Sair da conta
        </button>
      </form>

      <p className="hint text-center">RUMO · MVP v0.1 · bolha piloto Butantã</p>
    </main>
  );
}
