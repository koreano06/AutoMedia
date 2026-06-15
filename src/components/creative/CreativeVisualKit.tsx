import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  CircleDot,
  Clock,
  Film,
  Flag,
  Image,
  Layers3,
  Megaphone,
  Play,
  Radar,
  Rocket,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type JourneyStage = {
  id: string;
  label: string;
  description: string;
  status?: 'done' | 'active' | 'waiting' | 'blocked';
  icon?: LucideIcon;
};

type StoryScene = {
  title: string;
  text?: string;
  duration?: string;
};

type CockpitItem = {
  label: string;
  value: string | number;
  hint: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
  icon?: LucideIcon;
};

const defaultStages: JourneyStage[] = [
  { id: 'input', label: 'Anúncio', description: 'Produto ou link base', icon: Target, status: 'done' },
  { id: 'script', label: 'Roteiro IA', description: 'Gancho, cenas e CTA', icon: Wand2, status: 'active' },
  { id: 'assets', label: 'Assets', description: 'Imagem, vídeo e marca', icon: Image, status: 'waiting' },
  { id: 'render', label: 'Render', description: 'Vídeo final com movimento', icon: Film, status: 'waiting' },
  { id: 'publish', label: 'Postagem', description: 'Agenda e plataformas', icon: Rocket, status: 'waiting' },
];

const toneClasses = {
  primary: 'border-primary/30 bg-primary/10 text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  muted: 'border-border bg-muted/40 text-muted-foreground',
};

const statusTone = {
  done: 'border-success/35 bg-success/10 text-success',
  active: 'border-primary/45 bg-primary/10 text-primary shadow-primary/10',
  waiting: 'border-border bg-muted/30 text-muted-foreground',
  blocked: 'border-destructive/35 bg-destructive/10 text-destructive',
};

export function CreativeJourney({ stages = defaultStages, compact = false }: { stages?: JourneyStage[]; compact?: boolean }) {
  return (
    <div className="rounded-3xl border border-border bg-card/80 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Fluxo criativo</p>
          <h3 className="mt-2 font-syne text-lg font-bold text-foreground">Jornada do vídeo até a publicação</h3>
        </div>
        <span className="text-xs text-muted-foreground">visual de produção ponta a ponta</span>
      </div>
      <div className={cn('mt-5 grid gap-3', compact ? 'sm:grid-cols-5' : 'md:grid-cols-5')}>
        {stages.map((stage, index) => {
          const Icon = stage.icon || CircleDot;
          const status = stage.status || 'waiting';
          return (
            <div key={stage.id} className="relative">
              {index < stages.length - 1 && (
                <div className="absolute left-9 top-5 hidden h-px w-[calc(100%-1.75rem)] bg-border md:block" />
              )}
              <div className="relative rounded-2xl border border-border bg-background/70 p-3">
                <div className="flex items-center gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border shadow-sm', statusTone[status])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{stage.label}</p>
                    {!compact && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{stage.description}</p>}
                  </div>
                </div>
                {compact && <p className="mt-2 line-clamp-2 text-[10px] text-muted-foreground">{stage.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PhoneCreativePreview({
  title,
  subtitle,
  imageUrl,
  badge = 'IA',
  cta = 'Comente "eu quero"',
  progress = 72,
}: {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  cta?: string;
  progress?: number;
}) {
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-[2.2rem] border border-border bg-[#080b10] p-3 shadow-2xl shadow-black/30">
      <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-gradient-to-b from-slate-900 to-black">
        <div className="relative aspect-[9/16]">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.35),transparent_36%),linear-gradient(160deg,#111827,#030712)]">
              <Film className="h-12 w-12 text-white/25" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
          <div className="absolute left-4 right-4 top-4 flex items-center justify-between">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">{badge}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
          </div>
          <div className="absolute bottom-5 left-4 right-4">
            <p className="line-clamp-2 font-syne text-lg font-bold leading-tight text-white">{title}</p>
            {subtitle && <p className="mt-1 line-clamp-2 text-xs text-white/70">{subtitle}</p>}
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">CTA</p>
              <p className="mt-1 text-xs font-semibold text-white">{cta}</p>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoryboardStrip({ scenes }: { scenes: StoryScene[] }) {
  const visibleScenes = scenes.length > 0 ? scenes : [
    { title: 'Gancho', text: 'Promessa principal', duration: '0-3s' },
    { title: 'Benefício', text: 'Mostre o valor', duration: '3-8s' },
    { title: 'CTA', text: 'Chamada final', duration: '8-15s' },
  ];

  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Storyboard</p>
          <h3 className="mt-1 font-syne text-base font-bold text-foreground">Cenas do vídeo</h3>
        </div>
        <Layers3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleScenes.slice(0, 4).map((scene, index) => (
          <div key={`${scene.title}-${index}`} className="rounded-2xl border border-border bg-muted/25 p-3">
            <div className="flex items-center justify-between">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <span className="text-[10px] text-muted-foreground">{scene.duration || `${index * 3}-${(index + 1) * 3}s`}</span>
            </div>
            <p className="mt-3 line-clamp-1 text-sm font-semibold text-foreground">{scene.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{scene.text || 'Texto e direção visual ainda em construção.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QualityTrafficLight({ score, label }: { score: number; label?: string }) {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  const tone = normalized >= 80 ? 'success' : normalized >= 55 ? 'warning' : 'danger';
  const status = normalized >= 80 ? 'Pronto' : normalized >= 55 ? 'Revisar' : 'Risco';

  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 rounded-full border border-border bg-muted/30 p-1.5">
          <span className={cn('h-3 w-3 rounded-full', normalized < 55 ? 'bg-destructive shadow-[0_0_12px_hsl(var(--destructive))]' : 'bg-muted')} />
          <span className={cn('h-3 w-3 rounded-full', normalized >= 55 && normalized < 80 ? 'bg-warning shadow-[0_0_12px_hsl(var(--warning))]' : 'bg-muted')} />
          <span className={cn('h-3 w-3 rounded-full', normalized >= 80 ? 'bg-success shadow-[0_0_12px_hsl(var(--success))]' : 'bg-muted')} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{label || 'Qualidade criativa'}</p>
          <p className={cn('text-xs font-medium', toneClasses[tone])}>{status} · {normalized}%</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full', tone === 'success' ? 'bg-success' : tone === 'warning' ? 'bg-warning' : 'bg-destructive')} style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

export function CampaignMap({
  title,
  productCount,
  mediaCount,
  videoCount,
  scheduledCount,
}: {
  title: string;
  productCount: number;
  mediaCount: number;
  videoCount: number;
  scheduledCount: number;
}) {
  const nodes = [
    { label: 'Anúncios', value: productCount, icon: Target, tone: 'primary' as const },
    { label: 'Mídias', value: mediaCount, icon: Image, tone: 'success' as const },
    { label: 'Vídeos', value: videoCount, icon: Film, tone: 'warning' as const },
    { label: 'Posts', value: scheduledCount, icon: Megaphone, tone: 'danger' as const },
  ];

  return (
    <div className="rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_34%),hsl(var(--card))] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Mapa de campanha</p>
          <h3 className="mt-1 font-syne text-lg font-bold text-foreground">{title}</h3>
        </div>
        <Radar className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {nodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <div key={node.label} className="relative rounded-2xl border border-border bg-background/65 p-3">
              {index < nodes.length - 1 && <div className="absolute -right-3 top-1/2 hidden h-px w-3 bg-border sm:block" />}
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', toneClasses[node.tone])}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-2xl font-bold text-foreground">{node.value}</p>
              <p className="text-xs text-muted-foreground">{node.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MissingStepsPanel({ items }: { items: { label: string; done: boolean; hint: string }[] }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-syne text-base font-bold text-foreground">O que falta para decolar?</h3>
          <p className="text-xs text-muted-foreground">Lista objetiva para não perder o fio da operação.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-3">
            {item.done ? <CheckCircle className="mt-0.5 h-4 w-4 text-success" /> : <Clock className="mt-0.5 h-4 w-4 text-warning" />}
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MaturityMeter({ score, label = 'Maturidade operacional' }: { score: number; label?: string }) {
  const normalized = Math.min(100, Math.max(0, Math.round(score)));
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Maturidade</p>
          <h3 className="mt-1 font-syne text-base font-bold text-foreground">{label}</h3>
        </div>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-5 flex items-end justify-between">
        <span className="font-syne text-4xl font-bold text-primary">{normalized}%</span>
        <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
          {normalized >= 80 ? 'Escalável' : normalized >= 55 ? 'Em preparo' : 'Inicial'}
        </span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-to-r from-primary via-warning to-success" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}

export function CockpitPanel({ items }: { items: CockpitItem[] }) {
  return (
    <div className="rounded-3xl border border-border bg-[#090d14] p-4 text-white shadow-xl shadow-black/20 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Cockpit</p>
          <h3 className="mt-1 font-syne text-lg font-bold">Centro de operação</h3>
        </div>
        <Flag className="h-5 w-5 text-primary" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon || Sparkles;
          return (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center gap-3">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl border', toneClasses[item.tone || 'primary'])}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-white/55">{item.label}</p>
                  <p className="font-syne text-lg font-bold text-white">{item.value}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/45">{item.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FlowGuide({
  title = 'Como usar esta etapa',
  items,
}: {
  title?: string;
  items: Array<{ label: string; description: string; icon?: LucideIcon }>;
}) {
  return (
    <div className="rounded-3xl border border-primary/15 bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--card)))] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Guia rápido</p>
          <h3 className="font-syne text-base font-bold text-foreground">{title}</h3>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon || CircleDot;
          return (
            <div key={item.label} className="rounded-2xl border border-border bg-background/65 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">{item.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
