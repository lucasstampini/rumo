import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app-col min-h-dvh pb-[calc(var(--nav-h)+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
