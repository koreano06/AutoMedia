import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import { NotificationProvider, useNotifications } from "@/lib/NotificationContext";

function AppShell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { counts } = useNotifications();

  return (
    <div className="min-h-screen bg-background md:flex">
      <Sidebar counts={counts} open={mobileMenuOpen} onNavigate={() => setMobileMenuOpen(false)} />
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <main className="min-h-screen min-w-0 flex-1 overflow-x-clip pb-28 md:ml-64 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav counts={counts} onOpenMenu={() => setMobileMenuOpen(true)} />
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
