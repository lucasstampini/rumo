"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, FileCheck2, ShieldCheck } from "lucide-react";
import { saveProfile } from "@/lib/actions/profile";
import type { ActionState } from "@/lib/actions/types";
import { uniqueName, uploadImage } from "@/lib/image";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  mode: "onboarding" | "edit";
  userId: string;
  initial: { full_name: string; phone: string | null; avatar_url: string | null; verified: boolean };
};

/** Telefone, foto e CNH. Os arquivos sobem direto do navegador para o Storage; a action grava os caminhos. */
export function ProfileForm({ mode, userId, initial }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial.avatar_url);
  const [cnh, setCnh] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const onboarding = mode === "onboarding";

  function pickAvatar(file: File | undefined) {
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setState(null);
    try {
      const avatar_path = avatar
        ? await uploadImage("avatars", `${userId}/${uniqueName("avatar")}`, avatar)
        : undefined;
      const cnh_path = cnh
        ? await uploadImage("documents", `${userId}/${uniqueName("cnh")}`, cnh)
        : undefined;
      const result = await saveProfile({
        full_name: onboarding ? undefined : fullName,
        phone,
        avatar_path,
        cnh_path,
      });
      if (result?.error) {
        setState(result);
      } else if (onboarding) {
        router.push("/explore");
        return;
      } else {
        setState(result);
        setAvatar(null);
        setCnh(null);
        router.refresh();
      }
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : "Algo deu errado. Tente de novo." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="panel !flex-row items-center !gap-4">
        <Avatar name={fullName || "?"} url={avatarPreview} size={64} />
        <div className="flex-1 min-w-0">
          <b className="block">Foto de perfil {onboarding && <span className="font-medium text-muted">(opcional)</span>}</b>
          <label className="ghost !py-2 !px-3 mt-2 cursor-pointer text-sm focus-within:outline-3 focus-within:outline-amber">
            <Camera size={16} aria-hidden /> {avatarPreview ? "Trocar foto" : "Escolher foto"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickAvatar(e.target.files?.[0])}
            />
          </label>
        </div>
      </div>

      {!onboarding && (
        <label className="field">
          Nome completo
          <input
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
            minLength={2}
          />
        </label>
      )}

      <label className="field">
        Telefone (WhatsApp)
        <input
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 91234-5678"
        />
        <span className="hint font-normal">Usado só para combinar a entrega das chaves.</span>
      </label>

      <div className="panel">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-green-d" aria-hidden />
          <b>CNH</b>
          {initial.verified && <span className="badge ml-auto">CNH verificada</span>}
        </div>
        {initial.verified ? (
          <p className="hint">Sua CNH já foi enviada. Você pode reservar e anunciar carros.</p>
        ) : (
          <>
            <p className="hint">
              Envie uma foto da sua CNH para ganhar o selo <b>Verificado</b>. Só você tem acesso ao
              arquivo.
            </p>
            <label className="ghost cursor-pointer !justify-start focus-within:outline-3 focus-within:outline-amber">
              <FileCheck2 size={18} aria-hidden />
              <span className="truncate">{cnh ? cnh.name : "Escolher foto da CNH"}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Foto da CNH"
                onChange={(e) => setCnh(e.target.files?.[0] ?? null)}
              />
            </label>
          </>
        )}
      </div>

      {onboarding && (
        <div className="panel !flex-row items-center">
          <div className="flex-1">
            <b>Sua bolha: Butantã</b>
            <p className="hint">Piloto na região da USP. Você vê os carros a poucos minutos a pé.</p>
          </div>
          <span className="badge">Piloto</span>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="alert alert-error">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="alert alert-ok">
          {state.ok}
        </p>
      )}

      <button type="submit" className="cta w-full" disabled={busy}>
        {busy ? "Salvando…" : onboarding ? "Concluir e explorar carros" : "Salvar alterações"}
      </button>
      {onboarding && (
        <button
          type="button"
          className="text-muted font-semibold underline underline-offset-2 py-1"
          onClick={() => router.push("/explore")}
        >
          Pular por enquanto
        </button>
      )}
    </form>
  );
}
