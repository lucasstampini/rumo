"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ImagePlus, LocateFixed, X } from "lucide-react";
import { type CarInput, saveCar } from "@/lib/actions/cars";
import { brl, WEEKDAY_LETTERS, WEEKDAY_NAMES } from "@/lib/format";
import { type Bubble, isInsideBubble, type LatLng } from "@/lib/geo";
import { publicUrl, uniqueName, uploadImage } from "@/lib/image";
import { monthlyCostCents, simulateMonthlyIncomeCents } from "@/lib/pricing";
import { StickyFooter } from "@/components/ui/PageHeader";

const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" role="status" aria-label="Carregando mapa" />,
});

const STEPS = ["Carro", "Fotos", "Local", "Preço e custos", "Disponibilidade"] as const;
const MAX_PHOTOS = 6;
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export type CarFormValues = {
  id?: string;
  make: string;
  model: string;
  year: string;
  color: string;
  plate: string;
  category: "economy" | "sedan" | "suv";
  transmission: "manual" | "automatic";
  seats: string;
  description: string;
  photos: string[];
  position: LatLng | null;
  pickup_address: string;
  price_per_day: string;
  annual_ipva: string;
  annual_insurance: string;
  annual_maintenance: string;
  annual_depreciation: string;
  available_weekdays: number[];
};

export const EMPTY_CAR: CarFormValues = {
  make: "",
  model: "",
  year: "",
  color: "",
  plate: "",
  category: "economy",
  transmission: "manual",
  seats: "5",
  description: "",
  photos: [],
  position: null,
  pickup_address: "",
  price_per_day: "100",
  annual_ipva: "",
  annual_insurance: "",
  annual_maintenance: "",
  annual_depreciation: "",
  available_weekdays: [0, 1, 2, 3, 4, 5, 6],
};

const int = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(/\D/g, "")));

export function CarForm({ userId, bubble, bubbleName, initial }: { userId: string; bubble: Bubble; bubbleName: string; initial: CarFormValues }) {
  const [v, setV] = useState<CarFormValues>(initial);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(initial.id);

  const set = <K extends keyof CarFormValues>(key: K, value: CarFormValues[K]) => setV((prev) => ({ ...prev, [key]: value }));

  /** Valida o passo atual antes de avançar (o servidor valida tudo de novo ao salvar). */
  function stepError(s: number): string | null {
    if (s === 0) {
      if (v.make.trim().length < 2) return "Digite a marca do carro.";
      if (!v.model.trim()) return "Digite o modelo.";
      const year = int(v.year);
      if (year < 1995 || year > new Date().getFullYear() + 1) return "Digite um ano válido (1995 em diante).";
      if (v.color.trim().length < 3) return "Digite a cor.";
      if (!/^[A-Za-z]{3}-?\d[A-Za-z0-9]\d{2}$/.test(v.plate.trim())) return "Placa inválida. Use o formato ABC-1D23 ou ABC-1234.";
    }
    if (s === 2) {
      if (!v.position) return "Toque no mapa para marcar onde o carro fica.";
      if (!isInsideBubble(v.position, bubble)) return `O ponto precisa ficar dentro da bolha ${bubbleName} (círculo verde).`;
      if (v.pickup_address.trim().length < 5) return "Digite o endereço de retirada.";
    }
    if (s === 3) {
      const price = int(v.price_per_day);
      if (price < 30 || price > 2000) return "A diária deve ficar entre R$ 30 e R$ 2.000.";
    }
    if (s === 4 && v.available_weekdays.length === 0) return "Marque pelo menos um dia da semana.";
    return null;
  }

  function next() {
    const problem = stepError(step);
    setError(problem);
    if (!problem) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(true);
    try {
      const room = MAX_PHOTOS - v.photos.length;
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const path = await uploadImage("car-photos", `${userId}/${uniqueName("car")}`, file);
        urls.push(publicUrl("car-photos", path));
      }
      setV((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
      if (files.length > room) setError(`Você pode enviar até ${MAX_PHOTOS} fotos.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    }
    setUploading(false);
  }

  async function submit() {
    for (let s = 0; s < STEPS.length; s++) {
      const problem = stepError(s);
      if (problem) {
        setStep(s);
        setError(problem);
        return;
      }
    }
    setSaving(true);
    setError(null);
    const input: CarInput = {
      id: v.id,
      make: v.make,
      model: v.model,
      year: int(v.year),
      color: v.color,
      plate: v.plate,
      category: v.category,
      transmission: v.transmission,
      seats: int(v.seats) || 5,
      description: v.description,
      photos: v.photos,
      lat: v.position!.lat,
      lng: v.position!.lng,
      pickup_address: v.pickup_address,
      price_per_day: int(v.price_per_day),
      annual_ipva: int(v.annual_ipva),
      annual_insurance: int(v.annual_insurance),
      annual_maintenance: int(v.annual_maintenance),
      annual_depreciation: int(v.annual_depreciation),
      available_weekdays: v.available_weekdays,
    };
    const result = await saveCar(input); // sucesso redireciona para /earn
    if (result?.error) {
      setError(result.error);
      setSaving(false);
    }
  }

  const priceCents = int(v.price_per_day) * 100;
  const monthlyCost = monthlyCostCents({
    annual_ipva_cents: int(v.annual_ipva) * 100,
    annual_insurance_cents: int(v.annual_insurance) * 100,
    annual_maintenance_cents: int(v.annual_maintenance) * 100,
    annual_depreciation_cents: int(v.annual_depreciation) * 100,
  });
  const last = step === STEPS.length - 1;

  return (
    <>
      <form
        className="page !pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (last) void submit();
          else next();
        }}
      >
        <div>
          <p className="hint font-bold text-green-d" aria-live="polite">
            Passo {step + 1} de {STEPS.length}
          </p>
          <h2 className="title">{STEPS[step]}</h2>
          <div className="flex gap-1.5 mt-2.5" aria-hidden>
            {STEPS.map((s, i) => (
              <i key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-green" : "bg-line"}`} />
            ))}
          </div>
        </div>

        {step === 0 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="field">
                Marca
                <input className="input" value={v.make} onChange={(e) => set("make", e.target.value)} placeholder="Fiat" required />
              </label>
              <label className="field">
                Modelo
                <input className="input" value={v.model} onChange={(e) => set("model", e.target.value)} placeholder="Argo" required />
              </label>
              <label className="field">
                Ano
                <input className="input" inputMode="numeric" maxLength={4} value={v.year} onChange={(e) => set("year", e.target.value)} placeholder="2021" required />
              </label>
              <label className="field">
                Cor
                <input className="input" value={v.color} onChange={(e) => set("color", e.target.value)} placeholder="Prata" required />
              </label>
              <label className="field">
                Placa
                <input className="input uppercase" maxLength={8} value={v.plate} onChange={(e) => set("plate", e.target.value)} placeholder="ABC-1D23" required />
              </label>
              <label className="field">
                Lugares
                <select className="input" value={v.seats} onChange={(e) => set("seats", e.target.value)}>
                  {[2, 4, 5, 7].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="field mb-1.5">Categoria</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["economy", "Econômico"],
                    ["sedan", "Sedan"],
                    ["suv", "SUV"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" className="chip !shadow-none !py-2.5" aria-pressed={v.category === k} onClick={() => set("category", k)}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="field mb-1.5">Câmbio</legend>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["manual", "Manual"],
                    ["automatic", "Automático"],
                  ] as const
                ).map(([k, label]) => (
                  <button key={k} type="button" className="chip !shadow-none !py-2.5" aria-pressed={v.transmission === k} onClick={() => set("transmission", k)}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field">
              Descrição <span className="font-normal text-muted">(opcional)</span>
              <textarea className="input min-h-[90px]" maxLength={500} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Conte o que o carro tem de bom e algum combinado importante." />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <p className="hint">Até {MAX_PHOTOS} fotos. A primeira é a capa do anúncio. Fotos claras, de dia, alugam mais.</p>
            <ul className="grid grid-cols-3 gap-2.5">
              {v.photos.map((url, i) => (
                <li key={url} className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-green-l">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute left-1.5 bottom-1.5 badge !bg-card">Capa</span>}
                  <button
                    type="button"
                    className="absolute top-1.5 right-1.5 size-7 rounded-full bg-ink/80 text-white grid place-items-center"
                    aria-label={`Remover foto ${i + 1}`}
                    onClick={() => set("photos", v.photos.filter((p) => p !== url))}
                  >
                    <X size={15} aria-hidden />
                  </button>
                </li>
              ))}
              {v.photos.length < MAX_PHOTOS && (
                <li>
                  <label className="shot !aspect-[4/3] focus-within:outline-3">
                    <ImagePlus size={22} aria-hidden />
                    <span>{uploading ? "Enviando…" : "Adicionar"}</span>
                    <input type="file" accept="image/*" multiple className="sr-only" aria-label="Adicionar fotos do carro" disabled={uploading} onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
                  </label>
                </li>
              )}
            </ul>
            {v.photos.length === 0 && <p className="alert alert-warn">Sem foto o anúncio aparece com um espaço vazio. Você pode adicionar depois em “Editar anúncio”.</p>}
          </>
        )}

        {step === 2 && (
          <>
            <p className="hint">
              Toque no mapa para marcar onde o carro fica estacionado. Precisa ser dentro do círculo verde da bolha {bubbleName}.
            </p>
            <div className="h-[300px] rounded-3xl overflow-hidden relative isolate border border-line">
              <LocationPicker bubble={bubble} value={v.position} onChange={(p) => { set("position", p); setError(null); }} />
            </div>
            <p className="meta" aria-live="polite">
              <LocateFixed size={14} aria-hidden />
              {v.position
                ? isInsideBubble(v.position, bubble)
                  ? "Local marcado dentro da bolha."
                  : "Esse ponto está fora da bolha. Escolha outro."
                : "Nenhum local marcado ainda."}
            </p>
            <button type="button" className="ghost self-start !py-2 text-sm" onClick={() => set("position", { lat: bubble.center_lat, lng: bubble.center_lng })}>
              Usar o centro da bolha
            </button>
            <label className="field">
              Endereço de retirada
              <input className="input" value={v.pickup_address} onChange={(e) => set("pickup_address", e.target.value)} placeholder="R. do Matão, garagem 2" required />
              <span className="hint font-normal">Aparece no anúncio, para o locatário saber onde buscar o carro.</span>
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <label className="field">
              Diária (R$)
              <input className="input" inputMode="numeric" value={v.price_per_day} onChange={(e) => set("price_per_day", e.target.value)} required />
              <span className="hint font-normal">
                Carros parecidos na bolha saem por R$ 80 a R$ 220. Você recebe 85%: {brl(Math.round(priceCents * 0.85))} por diária.
              </span>
            </label>
            <fieldset className="panel">
              <legend className="panel-h float-left w-full mb-2">Custos anuais do carro (R$)</legend>
              <div className="grid grid-cols-2 gap-3 clear-both">
                {(
                  [
                    ["annual_ipva", "IPVA"],
                    ["annual_insurance", "Seguro"],
                    ["annual_maintenance", "Manutenção"],
                    ["annual_depreciation", "Depreciação"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="field">
                    {label}
                    <input className="input" inputMode="numeric" value={v[key]} onChange={(e) => set(key, e.target.value)} placeholder="0" />
                  </label>
                ))}
              </div>
              <p className="hint">
                Usamos esses valores para mostrar quanto do custo do carro o RUMO já cobriu.
                {monthlyCost > 0 && (
                  <>
                    {" "}
                    Custo mensal: <b className="text-ink">{brl(monthlyCost)}</b>. Com 12 dias alugados por mês você recebe{" "}
                    <b className="text-ink">{brl(simulateMonthlyIncomeCents(12, priceCents))}</b>.
                  </>
                )}
              </p>
            </fieldset>
          </>
        )}

        {step === 4 && (
          <>
            <p className="hint">Marque os dias da semana em que você não usa o carro. Ele só aparece para aluguel nesses dias.</p>
            <div className="wk" role="group" aria-label="Dias da semana disponíveis">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="!py-3.5 !bg-card aria-pressed:!bg-green-l"
                  aria-pressed={v.available_weekdays.includes(d)}
                  aria-label={WEEKDAY_NAMES[d]}
                  onClick={() => set("available_weekdays", v.available_weekdays.includes(d) ? v.available_weekdays.filter((x) => x !== d) : [...v.available_weekdays, d])}
                >
                  {WEEKDAY_LETTERS[d]}
                </button>
              ))}
            </div>
            <div className="panel">
              <h3 className="panel-h">Resumo do anúncio</h3>
              <div className="rows">
                <div>
                  <span>Carro</span>
                  <b>
                    {v.make} {v.model} {v.year}
                  </b>
                </div>
                <div>
                  <span>Diária</span>
                  <b>{brl(priceCents)}</b>
                </div>
                <div>
                  <span>Fotos</span>
                  <b>{v.photos.length}</b>
                </div>
                <div>
                  <span>Retirada</span>
                  <b className="text-right">{v.pickup_address}</b>
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="alert alert-error">
            {error}
          </p>
        )}
        {/* Enter nos campos avança o passo */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden>
          Continuar
        </button>
      </form>

      <StickyFooter>
        {step > 0 && (
          <button type="button" className="ghost" onClick={() => { setError(null); setStep(step - 1); }} disabled={saving}>
            Voltar
          </button>
        )}
        {last ? (
          <button type="button" className="cta flex-1" onClick={submit} disabled={saving || uploading}>
            {saving ? "Salvando…" : editing ? "Salvar anúncio" : "Publicar anúncio"}
          </button>
        ) : (
          <button type="button" className="cta flex-1" onClick={next} disabled={uploading}>
            {uploading ? "Enviando fotos…" : "Continuar"}
          </button>
        )}
      </StickyFooter>
    </>
  );
}
