import { type BookingStatus, STATUS_LABEL, STATUS_TONE, type Tone } from "@/lib/booking";

const TONES: Record<Tone, string> = {
  amber: "bg-[#fdf3dc] text-[#7a5200]",
  green: "bg-green-l text-green-d",
  blue: "bg-[#e3ecfd] text-[#1d4fb8]",
  gray: "bg-[#e8ede9] text-[#44564b]",
  red: "bg-[#fbeaea] text-[#a12c2c]",
};

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center text-[11.5px] font-bold px-2 py-[3px] rounded-full whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Situação da reserva em uma pill colorida. */
export function StatusPill({ status, label }: { status: BookingStatus; label?: string }) {
  return <Pill tone={STATUS_TONE[status]}>{label ?? STATUS_LABEL[status]}</Pill>;
}
