import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="panel empty">
        <b className="text-ink text-base">Não encontramos essa página</b>
        <span>O carro ou a reserva pode ter sido removido, ou o link está incompleto.</span>
        <Link href="/explore" className="cta !py-3 !px-5">
          Explorar carros
        </Link>
      </div>
    </main>
  );
}
