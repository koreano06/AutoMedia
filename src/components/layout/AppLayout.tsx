import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { NotificationProvider, useNotifications } from "@/lib/NotificationContext";

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { counts } = useNotifications();

  return (
    <div className="min-h-screen bg-transparent md:flex md:p-4 lg:p-5">
      <Sidebar counts={counts} open={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <button
        type="button"
        aria-label="Abrir menu"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 md:hidden"
        onClick={() => setMobileMenuOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
      <main className="automedia-shell min-h-screen min-w-0 flex-1 overflow-x-clip pb-20 md:ml-[17.5rem] md:min-h-[calc(100dvh-2rem)] md:rounded-[2rem] md:border md:border-border/70 md:shadow-2xl md:shadow-black/15 lg:ml-[18rem] lg:min-h-[calc(100dvh-2.5rem)] lg:rounded-[2.25rem]">
        <Outlet />
      </main>
    </div>
  );
}

export default function AppLayout() {
  return (
    <NotificationProvider>
      <AppShell />
    </NotificationProvider>
  );
}
