import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'destructive' | 'accent';
  loading?: boolean;
  helper?: string;
};

const tones = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent text-accent-foreground',
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
  loading = false,
  helper,
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="truncate font-syne text-xl font-bold text-foreground sm:text-2xl">{loading ? '—' : value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {helper && <p className="mt-2 text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}
