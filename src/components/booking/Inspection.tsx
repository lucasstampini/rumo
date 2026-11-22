"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Check } from "lucide-react";
import { recordInspectionPhoto } from "@/lib/actions/bookings";
import {
  ANGLE_LABEL,
  INSPECTION_ANGLES,
  type InspectionAngle,
  type InspectionKind,
} from "@/lib/booking";
import { uploadImage } from "@/lib/image";

export type InspectionPhotos = Partial<Record<InspectionAngle, string>>;

/** Vistoria: 4 fotos (frente, traseira, lados). Cada foto sobe para o bucket privado e é registrada. */
export function InspectionUploader({
  bookingId,
  kind,
  photos,
}: {
  bookingId: string;
  kind: InspectionKind;
  /** ângulo → URL assinada das fotos já enviadas */
  photos: InspectionPhotos;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState<InspectionAngle | null>(null);
  const [done, setDone] = useState<InspectionPhotos>(photos);
  const [error, setError] = useState<string | null>(null);

  async function upload(angle: InspectionAngle, file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(angle);
    try {
      const path = await uploadImage("inspections", `${bookingId}/${kind}-${angle}.jpg`, file);
      const result = await recordInspectionPhoto({ booking_id: bookingId, kind, angle, path });
      if (result?.error) throw new Error(result.error);
      setDone((prev) => ({ ...prev, [angle]: URL.createObjectURL(file) }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a foto.");
    }
    setUploading(null);
  }

  const count = INSPECTION_ANGLES.filter((a) => done[a]).length;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="shots">
        {INSPECTION_ANGLES.map((angle) => {
          const ok = Boolean(done[angle]);
          return (
            <label key={angle} className={`shot ${ok ? "ok" : ""}`} data-angle={angle} data-ok={ok}>
              {ok ? <Check size={22} strokeWidth={3} aria-hidden /> : <Camera size={22} aria-hidden />}
              <span>{uploading === angle ? "Enviando…" : ANGLE_LABEL[angle]}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label={`Foto: ${ANGLE_LABEL[angle]}${ok ? " (enviada, toque para trocar)" : ""}`}
                disabled={uploading !== null}
                onChange={(e) => {
                  void upload(angle, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          );
        })}
      </div>
      <p className="hint" role="status">
        {count === 4 ? "Vistoria completa. Fotos salvas na reserva." : `${count} de 4 fotos enviadas.`}
      </p>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Fotos de uma vistoria já enviada (somente leitura). */
export function InspectionGallery({ title, photos }: { title: string; photos: InspectionPhotos }) {
  const angles = INSPECTION_ANGLES.filter((a) => photos[a]);
  if (angles.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="panel-h">{title}</h3>
      <ul className="grid grid-cols-4 gap-2">
        {angles.map((angle) => (
          <li key={angle}>
            <a
              href={photos[angle]}
              target="_blank"
              rel="noopener"
              className="block aspect-square rounded-xl overflow-hidden bg-green-l"
            >
              <img
                src={photos[angle]}
                alt={`${title}: ${ANGLE_LABEL[angle]}`}
                className="w-full h-full object-cover"
              />
            </a>
            <span className="hint block text-center mt-1">{ANGLE_LABEL[angle]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
