import Link from "next/link";
import { PlayCircle } from "lucide-react";

const DEMO_URL = "https://lucasstampini.github.io/rumo/demo.html";

export default function LandingPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-[440px] flex flex-col gap-6">
        <img
          src="/logo.png"
          alt="Logo RUMO"
          width={84}
          height={84}
          className="w-[84px] rounded-[20px]"
        />
        <h1 className="font-display font-black text-[40px] sm:text-[44px] leading-[1.02] tracking-[-0.02em] text-balance">
          Seu carro parado vira <em className="not-italic text-green-d">renda</em>. O do
          vizinho vira seu <em className="not-italic text-green-d">rumo</em>.
        </h1>
        <p className="text-muted text-base leading-relaxed">
          Marketplace peer-to-peer de aluguel de carros. Conectamos o dono do carro
          ocioso a quem precisa de mobilidade, começando por bolhas hiperlocais de alta
          densidade.
        </p>
        <dl className="grid grid-cols-3 gap-3 border-t border-line pt-[18px]">
          {[
            ["R$ 52 bi", "faturados pelo setor de locação em 2024"],
            ["90%", "do tempo um carro fica parado na garagem"],
            ["<10 min", "a pé até o carro mais próximo, na bolha"],
          ].map(([n, t]) => (
            <div key={n} className="flex flex-col-reverse justify-end">
              <dt className="text-[12.5px] text-muted leading-snug">{t}</dt>
              <dd className="font-display font-extrabold text-2xl text-green-d tabular-nums">
                {n}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3">
          <Link href="/signup" className="cta">
            Criar conta
          </Link>
          <Link href="/login" className="ghost !bg-card border border-line !py-[14px] text-base">
            Entrar
          </Link>
          <a
            href={DEMO_URL}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center justify-center gap-2 text-green-d font-bold py-2"
          >
            <PlayCircle size={20} aria-hidden /> Ver vídeo demo (1min46)
          </a>
        </div>
        <p className="hint text-center">RUMO · MVP · bolha piloto Butantã</p>
      </section>
    </main>
  );
}
