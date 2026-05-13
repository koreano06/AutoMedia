import { cn } from "@/lib/utils";
import type { Status } from "@/types/entities";

const statusConfig = {
  analyzing: { label: "Analisando", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  collecting: { label: "Coletando", class: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  generating: { label: "Gerando", class: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  review: { label: "Em Revisão", class: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  approved: { label: "Aprovado", class: "bg-success/10 text-success border-success/20" },
  publishing: { label: "Publicando", class: "bg-primary/10 text-primary border-primary/20" },
  published: { label: "Publicado", class: "bg-success/10 text-success border-success/20" },
  draft: { label: "Rascunho", class: "bg-muted text-muted-foreground border-border" },
  scheduled: { label: "Agendado", class: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  failed: { label: "Falhou", class: "bg-destructive/10 text-destructive border-destructive/20" },
  collected: { label: "Coletado", class: "bg-muted text-muted-foreground border-border" },
  pending_review: { label: "Aguardando Revisão", class: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  rejected: { label: "Rejeitado", class: "bg-destructive/10 text-destructive border-destructive/20" },
  needs_changes: { label: "Precisa Ajuste", class: "bg-warning/10 text-warning border-warning/20" },
  paused: { label: "Pausado", class: "bg-muted text-muted-foreground border-border" },
  reposted: { label: "Repostado", class: "bg-primary/10 text-primary border-primary/20" },
  removed: { label: "Removido", class: "bg-muted text-muted-foreground border-border" },
};

type StatusBadgeProps = {
  status?: Status;
  className?: string;
};

export default function StatusBadge({ status = "draft", className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, class: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border", config.class, className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {config.label}
    </span>
  );
}
