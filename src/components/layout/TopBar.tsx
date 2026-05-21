import { useState } from "react";
import { Bell, Search, ChevronDown, LogOut, RefreshCw, Moon, Sun, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/AuthContext";
import { useNotifications } from "@/lib/NotificationContext";
import { useTheme } from "@/lib/ThemeContext";

export default function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, unreadCount, refresh, loading } = useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();
  const displayName = user?.name || user?.username || "Admin";
  const username = user?.username || "admin";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

  return (
    <>
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/80 bg-card/90 shadow-sm shadow-black/[0.03] backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 md:left-64">
      <div className="flex min-h-14 items-center justify-between gap-2 px-3 py-2.5 sm:min-h-16 sm:gap-4 sm:px-6 sm:py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-syne text-[15px] font-bold leading-tight text-foreground sm:text-lg">{title}</h1>
          {subtitle && <p className="max-w-[46vw] truncate text-[11px] text-muted-foreground sm:max-w-none sm:text-xs">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <div className="relative hidden items-center md:flex">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar anúncios, mídias..."
              className="h-9 w-72 rounded-2xl border-border/60 bg-muted/60 pl-9 pr-12 text-sm shadow-inner shadow-black/[0.02] focus-visible:ring-1"
            />
            <span className="pointer-events-none absolute right-2 rounded-lg border border-border bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              /
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl sm:h-9 sm:w-9 md:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? "Fechar busca" : "Abrir busca"}
          >
            {mobileSearchOpen ? (
              <X className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
            onClick={toggleTheme}
            title={resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            aria-label={resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-xl sm:h-9 sm:w-9">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] w-[calc(100vw-2rem)] max-w-96 overflow-y-auto rounded-2xl p-2">
              <div className="flex items-center justify-between rounded-xl bg-muted/45 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Notificações</p>
                  <p className="text-xs text-muted-foreground">Alertas operacionais do painel</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => refresh()} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <DropdownMenuSeparator className="my-2" />
              {notifications.length === 0 ? (
                <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                  Tudo tranquilo por aqui.
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} asChild className="cursor-pointer rounded-xl">
                    <Link to={notification.href || "/"} className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-medium text-foreground">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.description}</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-2xl border border-transparent px-1 py-1 transition-colors hover:border-border hover:bg-muted/70 sm:px-2">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-sm shadow-primary/25">
                  <span className="text-xs font-bold text-white">{initial}</span>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                </div>
                <div className="hidden min-w-0 text-left md:block">
                  <span className="block max-w-32 truncate text-sm font-semibold leading-4 text-foreground">{displayName}</span>
                  <span className="block text-[10px] leading-3 text-muted-foreground">Administrador</span>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
              <div className="rounded-xl bg-muted/45 px-3 py-3">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">@{username}</p>
                <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Administrador
                </span>
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer rounded-xl text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="border-t border-border/70 px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Buscar anúncios, mídias..."
              className="h-10 rounded-2xl border-border/70 bg-muted/60 pl-9 text-sm"
            />
          </div>
        </div>
      )}
    </header>
    <div className={mobileSearchOpen ? "h-[7.25rem] sm:h-16" : "h-14 sm:h-16"} aria-hidden="true" />
    </>
  );
}
