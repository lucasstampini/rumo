"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Banknote, KeyRound, Map, UserRound } from "lucide-react";

const TABS = [
  { href: "/explore", label: "Explorar", icon: Map, match: ["/explore", "/cars", "/bookings"] },
  { href: "/rentals", label: "Aluguéis", icon: KeyRound, match: ["/rentals"] },
  { href: "/earn", label: "Ganhar", icon: Banknote, match: ["/earn"] },
  { href: "/profile", label: "Perfil", icon: UserRound, match: ["/profile"] },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 z-[1000] pointer-events-none"
    >
      <ul className="app-col pointer-events-auto grid grid-cols-4 bg-card border-t border-line px-1.5 pt-2 pb-[calc(10px+env(safe-area-inset-bottom,0px))] h-[calc(var(--nav-h)+env(safe-area-inset-bottom,0px))]">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match.some((m) => path === m || path.startsWith(m + "/"));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-[3px] text-[11.5px] font-semibold py-1 rounded-xl ${
                  active ? "text-green-d" : "text-muted"
                }`}
              >
                <Icon size={24} aria-hidden strokeWidth={2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
