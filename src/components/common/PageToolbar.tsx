import type { ReactNode } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

type PageToolbarProps = {
  children: ReactNode;
  resultText?: string;
  actions?: ReactNode;
  className?: string;
};

export default function PageToolbar({ children, resultText, actions, className }: PageToolbarProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4', className)}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex">
          {children}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {resultText && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          {resultText}
        </div>
      )}
    </div>
  );
}
