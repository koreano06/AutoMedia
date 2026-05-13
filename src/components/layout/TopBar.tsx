import { Bell, Search, ChevronDown, LogOut, RefreshCw, Moon, Sun } from "lucide-react";
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
  const { user, logout } = useAuth();
  const { notifications, unreadCount, refresh, loading } = useNotifications();
  const { resolvedTheme, toggleTheme } = useTheme();
  const displayName = user?.name || user?.username || "Admin";
  const username = user?.username || "admin";
  const initial = displayName.trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="font-syne font-bold text-lg text-foreground leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos, mídias..."
            className="pl-9 h-8 w-60 text-sm bg-muted border-0 focus-visible:ring-1"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
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
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl">
            <div className="flex items-center justify-between px-2 py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Notificações</p>
                <p className="text-xs text-muted-foreground">Alertas operacionais do painel</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refresh()} disabled={loading}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Tudo tranquilo por aqui.
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
                  <Link to={notification.href || "/"} className="flex flex-col items-start gap-0.5 rounded-lg px-2 py-2">
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
            <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                <span className="text-xs font-bold text-white">{initial}</span>
              </div>
              <span className="hidden text-sm font-medium md:block">{displayName}</span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{username}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
