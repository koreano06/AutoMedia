import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

export default function SurfaceCard({ children, className, interactive }: SurfaceCardProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/[0.02] sm:p-5',
        interactive && 'transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5',
        className,
      )}
    >
      {children}
    </section>
  );
}
