import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/** Cabeçalho fixo das telas internas, com botão de voltar. */
export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2.5 px-4 py-3.5 bg-card border-b border-line">
      <Link href={backHref} className="iconbtn" aria-label="Voltar">
        <ChevronLeft size={20} strokeWidth={2.4} aria-hidden />
      </Link>
      <h1 className="text-base font-bold flex-1 truncate">{title}</h1>
    </header>
  );
}

/** Barra de ação fixa acima da navegação inferior. */
export function StickyFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky z-20 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom,0px))] bg-card border-t border-line px-4 py-3 flex items-center gap-3.5">
      {children}
    </div>
  );
}
