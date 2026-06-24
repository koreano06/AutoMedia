import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
  icon?: ComponentType<LucideProps>;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
};

export default function SectionHeader({ icon: Icon, title, subtitle, eyebrow, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>}
          <h3 className="font-syne text-sm font-bold text-foreground sm:text-base">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
