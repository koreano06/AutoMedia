import { CheckCircle, Loader2, XCircle, Clock3, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobStatus } from '@/types/entities';

const jobStatusConfig = {
  queued: {
    label: 'Na fila',
    className: 'border-blue-500/20 bg-blue-500/10 text-blue-600',
    icon: Clock3,
  },
  processing: {
    label: 'Processando',
    className: 'border-primary/20 bg-primary/10 text-primary',
    icon: Loader2,
  },
  completed: {
    label: 'Concluído',
    className: 'border-success/20 bg-success/10 text-success',
    icon: CheckCircle,
  },
  failed: {
    label: 'Falhou',
    className: 'border-destructive/20 bg-destructive/10 text-destructive',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'border-border bg-muted text-muted-foreground',
    icon: Ban,
  },
} satisfies Record<JobStatus, { label: string; className: string; icon: typeof Clock3 }>;

type JobStatusBadgeProps = {
  status: JobStatus;
  className?: string;
};

export default function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = jobStatusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', config.className, className)}>
      <Icon className={cn('h-3 w-3', status === 'processing' && 'animate-spin')} />
      {config.label}
    </span>
  );
}
