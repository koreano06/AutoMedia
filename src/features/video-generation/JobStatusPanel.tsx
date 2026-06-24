import { CheckCircle, Clock, Film, Layers3, RefreshCw, UploadCloud, Wand2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import SectionHeader from '@/components/common/SectionHeader';
import FeedbackState from '@/components/common/FeedbackState';
import { cn } from '@/lib/utils';
import type { Job } from '@/types/entities';

type JobStatusPanelProps = {
  jobs: Job[];
  onRetry: (job: Job) => void;
};

export default function JobStatusPanel({ jobs, onRetry }: JobStatusPanelProps) {
  if (jobs.length === 0) {
    return (
      <FeedbackState
        tone="empty"
        icon={Clock}
        title="Nenhum job em andamento"
        message="Quando um vídeo for enviado para geração, cada etapa aparece aqui em tempo real."
      />
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <SectionHeader icon={Clock} title="Fila de geração em tempo real" subtitle="Acompanhe roteiro, IA, concatenação, upload e revisão do criativo." />
      <div className="mt-4 space-y-3">
        {jobs.map((job) => (
          <JobProgressRow key={job.id} job={job} onRetry={() => onRetry(job)} />
        ))}
      </div>
    </section>
  );
}

function JobProgressRow({ job, onRetry }: { job: Job; onRetry: () => void }) {
  const step = getJobStep(job);
  const failed = job.status === 'failed' || Boolean(job.error_message);
  const completed = job.status === 'completed';

  return (
    <article className={cn('rounded-2xl border p-3', failed ? 'border-destructive/20 bg-destructive/5' : completed ? 'border-success/20 bg-success/5' : 'border-border bg-muted/20')}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="truncate font-syne text-sm font-bold text-foreground">{job.title || 'Geração de vídeo'}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{failed ? job.error_message || 'Falha não informada.' : step.description}</p>
        </div>
        {failed ? (
          <Button size="sm" variant="outline" className="h-9 shrink-0 gap-2" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
        ) : (
          <span className="shrink-0 rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {completed ? 'Pronto' : job.status}
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-5">
        {getSteps(step.index, failed, completed).map((item) => (
          <div key={item.label} className={cn('rounded-xl border px-3 py-2', item.active ? 'border-primary/30 bg-primary/10 text-primary' : item.done ? 'border-success/20 bg-success/10 text-success' : 'border-border bg-background/60 text-muted-foreground')}>
            <item.icon className="mb-1 h-3.5 w-3.5" />
            <p className="text-[10px] font-semibold">{item.label}</p>
          </div>
        ))}
      </div>

      <Progress value={failed ? 100 : completed ? 100 : step.progress} className="mt-3 h-1.5" />
    </article>
  );
}

function getJobStep(job: Job) {
  const payload = (job.payload || {}) as Record<string, unknown>;
  const stage = String(payload.stage || payload.ai_video_stage || job.status || '').toLowerCase();
  const segmentIndex = Number(payload.segment_index || payload.current_segment || 0);
  const segmentTotal = Number(payload.segment_total || payload.total_segments || payload.segments || 0);

  if (job.status === 'completed') return { index: 4, progress: 100, description: 'Vídeo pronto e enviado para a biblioteca.' };
  if (job.status === 'failed') return { index: 4, progress: 100, description: job.error_message || 'Falha na geração.' };
  if (stage.includes('script') || stage.includes('roteiro')) return { index: 0, progress: 18, description: 'Criando roteiro e plano de cenas.' };
  if (stage.includes('segment') || stage.includes('kling') || stage.includes('replicate')) {
    const segmentText = segmentTotal > 0 ? ` ${Math.max(1, segmentIndex)}/${segmentTotal}` : '';
    return { index: 1, progress: segmentTotal > 0 ? 25 + Math.min(40, (segmentIndex / segmentTotal) * 40) : 42, description: `Gerando segmento de IA${segmentText}.` };
  }
  if (stage.includes('concat') || stage.includes('ffmpeg') || job.status === 'rendering') return { index: 2, progress: 74, description: 'Juntando segmentos e finalizando render com FFmpeg.' };
  if (stage.includes('upload') || job.status === 'uploading') return { index: 3, progress: 88, description: 'Enviando vídeo final para storage e biblioteca.' };
  return { index: 0, progress: 8, description: 'Job entrou na fila e aguarda processamento.' };
}

function getSteps(activeIndex: number, failed: boolean, completed: boolean) {
  const steps = [
    { label: 'Roteiro', icon: Wand2 },
    { label: 'IA cenas', icon: Film },
    { label: 'Concat', icon: Layers3 },
    { label: 'Upload', icon: UploadCloud },
    { label: 'Pronto', icon: completed ? CheckCircle : failed ? XCircle : CheckCircle },
  ];

  return steps.map((step, index) => ({
    ...step,
    active: !completed && !failed && index === activeIndex,
    done: completed || (!failed && index < activeIndex),
  }));
}
