import type { Metadata } from "next";
import { ProfileForm } from "@/components/ProfileForm";
import { firstName } from "@/lib/format";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function OnboardingPage() {
  const { user, profile } = await requireProfile();
  return (
    <main className="page">
      <h1 className="h1">Olá, {firstName(profile.full_name)}!</h1>
      <p className="sub">Falta pouco. Complete seu perfil para alugar e anunciar com confiança.</p>
      <ProfileForm
        mode="onboarding"
        userId={user.id}
        initial={{
          full_name: profile.full_name,
          phone: profile.phone,
          avatar_url: profile.avatar_url,
          verified: profile.verified,
        }}
      />
    </main>
  );
}
