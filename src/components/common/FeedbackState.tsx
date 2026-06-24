import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackStateProps = {
  tone?: 'loading' | 'success' | 'warning' | 'error' | 'empty';
  icon?: ComponentType<LucideProps>;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
};

export default function FeedbackState({ tone = 'empty', icon: Icon, title, message, action, className }: FeedbackStateProps) {
  const toneClass = {
    loading: 'border-primary/20 bg-primary/5 text-primary',
    success: 'border-success/20 bg-success/5 text-success',
    warning: 'border-warning/20 bg-warning/5 text-warning',
    error: 'border-destructive/20 bg-destructive/5 text-destructive',
    empty: 'border-border bg-muted/20 text-muted-foreground',
  }[tone];
  const DefaultIcon = tone === 'loading' ? Loader2 : tone === 'success' ? CheckCircle : tone === 'warning' || tone === 'error' ? AlertTriangle : undefined;
  const StateIcon = Icon || DefaultIcon;

  return (
    <div className={cn('rounded-2xl border p-5 text-center', toneClass, className)}>
      {StateIcon && (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-background/70">
          <StateIcon className={cn('h-5 w-5', tone === 'loading' && 'animate-spin')} />
        </div>
      )}
      <p className="font-syne text-sm font-bold text-foreground">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-muted-foreground">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
