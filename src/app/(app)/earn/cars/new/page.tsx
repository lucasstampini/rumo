import type { Metadata } from "next";
import { CarForm, EMPTY_CAR } from "@/components/earn/CarForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBubble } from "@/lib/data";
import { requireProfile } from "@/lib/session";

export const metadata: Metadata = { title: "Anunciar carro" };

export default async function NewCarPage() {
  const { supabase, user, profile } = await requireProfile();
  const bubble = await getBubble(supabase, profile.bubble_id);
  return (
    <>
      <PageHeader title="Anunciar carro" backHref="/earn" />
      <main>
        <CarForm userId={user.id} bubble={bubble} bubbleName={bubble.name} initial={EMPTY_CAR} />
      </main>
    </>
  );
}
