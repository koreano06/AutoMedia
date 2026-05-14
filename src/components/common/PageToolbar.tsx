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
    <div className={cn('rounded-2xl border border-border bg-card p-3 sm:p-4', className)}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:flex-wrap">
          {children}
        </div>
        {actions && <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">{actions}</div>}
      </div>
      {resultText && (
        <div className="mt-3 flex min-w-0 items-start gap-2 text-xs text-muted-foreground sm:items-center">
          <Filter className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 sm:mt-0" />
          <span className="min-w-0 break-words">{resultText}</span>
        </div>
      )}
    </div>
  );
}
