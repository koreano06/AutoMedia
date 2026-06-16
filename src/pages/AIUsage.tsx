import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Cpu,
  DollarSign,
  ExternalLink,
  Film,
  RefreshCw,
  Sparkles,
  Video,
  XCircle,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/api/httpClient';
import { getAIUsageSummary, type AIRecentVideoCost, type AIPeriodUsage, type AIProviderStatus, type AIProviderUsage, type AIUsageSummary } from '@/services/aiUsage';
import { cn } from '@/lib/utils';

type PeriodKey = 'day' | 'week' | 'month';

const periods: Array<{ id: PeriodKey; label: string; hint: string }> = [
  { id: 'day', label: 'Hoje', hint: 'Uso desde 00:00' },
  { id: 'week', label: 'Semana', hint: 'Uso desde segunda-feira' },
  { id: 'month', label: 'Mês', hint: 'Uso desde o dia 1' },
];

type PageError = {
  message: string;
  detail?: string;
  status?: number;
};

function number(value?: number | null) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function money(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    replicate_kling: 'Kling via Replicate',
    ffmpeg: 'FFmpeg',
    ffmpeg_fallback: 'Fallback FFmpeg',
    unknown: 'Não identificado',
  };
  return labels[provider] || provider;
}

function statusTone(status: 'ok' | 'warning' | 'error' | 'neutral') {
  return {
    ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    error: 'border-red-500/25 bg-red-500/10 text-red-300',
    neutral: 'border-border bg-muted text-muted-foreground',
  }[status];
}

function ProviderStatusCard({ provider }: { provider: AIProviderStatus }) {
  const configured = provider.configured;
  const models = [provider.text_model, provider.image_model, provider.video_model, provider.mode && `Modo ${provider.mode}`].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="relative p-5">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {provider.id === 'openai' ? <Sparkles className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-syne text-sm font-bold text-foreground">{provider.name}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{provider.credit_message}</p>
            </div>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', statusTone(configured ? 'ok' : 'error'))}>
            {configured ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {configured ? 'Configurado' : 'Pendente'}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {models.map((model) => (
            <span key={model} className="rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              {model}
            </span>
          ))}
        </div>
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 text-amber-300">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-semibold">Saldo de crédito</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Leitura automática ainda não disponível. Use o painel oficial do provedor para confirmar o saldo real.
          </p>
        </div>
      </div>
    </article>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'neutral' }: { icon: typeof Bot; label: string; value: string | number; detail?: string; tone?: 'ok' | 'warning' | 'error' | 'neutral' }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', statusTone(tone))}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-5 font-syne text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
      {detail && <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{detail}</p>}
    </div>
  );
}

function PeriodSelector({ selected, onSelect }: { selected: PeriodKey; onSelect: (period: PeriodKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1">
      {periods.map((period) => (
        <button
          key={period.id}
          type="button"
          onClick={() => onSelect(period.id)}
          className={cn(
            'rounded-xl px-3 py-2 text-left transition',
            selected === period.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <span className="block text-xs font-bold">{period.label}</span>
          <span className={cn('mt-0.5 block text-[10px]', selected === period.id ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{period.hint}</span>
        </button>
      ))}
    </div>
  );
}

function UsageTable({ providers }: { providers: AIProviderUsage[] }) {
  if (!providers.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <Bot className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 font-syne text-sm font-bold text-foreground">Sem uso registrado neste período</p>
        <p className="mt-1 text-xs text-muted-foreground">Gere um roteiro ou vídeo para aparecer aqui.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="hidden grid-cols-[1.4fr_1fr_repeat(6,minmax(80px,0.6fr))] gap-3 border-b border-border px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground lg:grid">
        <span>Provider</span>
        <span>Modelo</span>
        <span>Requests</span>
        <span>Vídeos</span>
        <span>Concluídos</span>
        <span>Falhas</span>
        <span>Fallback</span>
        <span>Custo</span>
      </div>
      <div className="divide-y divide-border">
        {providers.map((usage) => (
          <div key={`${usage.provider}-${usage.model || 'default'}`} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.4fr_1fr_repeat(6,minmax(80px,0.6fr))] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-foreground">{providerLabel(usage.provider)}</p>
              <p className="text-[11px] text-muted-foreground lg:hidden">{usage.model || 'Modelo padrão'}</p>
            </div>
            <p className="hidden truncate text-xs text-muted-foreground lg:block">{usage.model || 'Modelo padrão'}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:contents">
              <SmallMetric label="Req." value={usage.requests} />
              <SmallMetric label="Vídeos" value={usage.videos} />
              <SmallMetric label="OK" value={usage.completed} tone="ok" />
              <SmallMetric label="Falhas" value={usage.failed} tone={usage.failed ? 'error' : 'neutral'} />
              <SmallMetric label="Fallback" value={usage.fallback} tone={usage.fallback ? 'warning' : 'neutral'} />
              <SmallCurrency label="Custo" value={usage.estimated_cost_usd} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallCurrency({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-amber-300 lg:border-0 lg:bg-transparent lg:p-0 lg:text-left lg:text-foreground">
      <p className="text-sm font-bold">{money(value)}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70 lg:hidden">{label}</p>
    </div>
  );
}

function SmallMetric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'ok' | 'warning' | 'error' | 'neutral' }) {
  return (
    <div className={cn('rounded-2xl border px-3 py-2 text-center lg:border-0 lg:bg-transparent lg:p-0 lg:text-left', statusTone(tone))}>
      <p className="text-sm font-bold lg:text-foreground">{number(value)}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70 lg:hidden">{label}</p>
    </div>
  );
}

function SummaryMetrics({ usage }: { usage: AIPeriodUsage }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard icon={Film} label="Vídeos gerados" value={number(usage.videos)} detail="Mídias do tipo generated_video criadas no período." tone="ok" />
      <MetricCard icon={Cpu} label="Jobs de vídeo" value={number(usage.jobs)} detail="Pedidos enviados ao pipeline de geração." />
      <MetricCard icon={CheckCircle2} label="Concluídos" value={number(usage.completed)} detail="Jobs finalizados com resultado." tone="ok" />
      <MetricCard icon={AlertCircle} label="Fallback/Falhas" value={`${number(usage.fallback)} / ${number(usage.failed)}`} detail="Fallback FFmpeg e jobs com erro." tone={usage.failed || usage.fallback ? 'warning' : 'neutral'} />
      <MetricCard icon={DollarSign} label="Custo estimado" value={money(usage.estimated_cost_usd)} detail="Estimativa por vídeo baseada nas taxas configuradas no backend." tone="warning" />
    </div>
  );
}

function costSourceLabel(source: AIRecentVideoCost['cost_source']) {
  return {
    configured_estimate: 'Estimado',
    free_local: 'Local',
    unknown: 'Sem taxa',
  }[source];
}

function RecentVideoCosts({ videos }: { videos: AIRecentVideoCost[] }) {
  if (!videos.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <Video className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 font-syne text-sm font-bold text-foreground">Nenhum vídeo recente neste período</p>
        <p className="mt-1 text-xs text-muted-foreground">Quando um vídeo for gerado, o custo estimado aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {videos.map((video) => (
        <article key={video.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-bold text-orange-300">
                  <Video className="h-3 w-3" />
                  {providerLabel(video.provider)}
                </span>
                <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {costSourceLabel(video.cost_source)}
                </span>
                <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {video.duration_seconds ? `${video.duration_seconds}s` : 'Duração não informada'}
                </span>
              </div>
              <h3 className="mt-3 truncate font-syne text-sm font-bold text-foreground">{video.title || 'Vídeo sem título'}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{video.product_name || 'Produto não informado'} · {new Date(video.created_at).toLocaleString('pt-BR')}</p>
              {video.model && <p className="mt-1 truncate text-[11px] text-muted-foreground">Modelo: {video.model}</p>}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300">Custo estimado</p>
                <p className="mt-1 font-syne text-xl font-bold text-foreground">{money(video.estimated_cost_usd)}</p>
              </div>
              {video.url && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={video.url} target="_blank" rel="noreferrer">
                    Abrir vídeo
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function AIUsage() {
  const [summary, setSummary] = useState<AIUsageSummary | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSummary(await getAIUsageSummary());
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 404) {
        setError({
          status: err.status,
          message: 'A rota de uso de IA ainda não foi encontrada no backend conectado.',
          detail: 'Isso costuma acontecer quando o frontend está apontando para uma API antiga ou quando o deploy da VM ainda não puxou o último código.',
        });
      } else {
        setError({
          status: err instanceof ApiRequestError ? err.status : undefined,
          message: err instanceof Error ? err.message : 'Não foi possível carregar o uso de IA.',
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const currentUsage = useMemo(() => summary?.periods[period], [period, summary]);

  return (
    <div>
      <TopBar title="Uso de IA" subtitle="Modelos, créditos e volume de geração da plataforma" />
      <main className="space-y-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:p-7">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-300">
                <Bot className="h-3.5 w-3.5" />
                Central de consumo IA
              </span>
              <h1 className="mt-4 max-w-2xl font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Acompanhe quanto a automação criativa está usando em roteiros e vídeos.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Esta tela cruza jobs, mídias geradas e provedores para mostrar uso por dia, semana e mês. O saldo financeiro fica marcado como manual até conectarmos APIs oficiais de billing.
              </p>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-background/50 p-4">
              <PeriodSelector selected={period} onSelect={setPeriod} />
              <Button onClick={load} disabled={loading} className="gap-2">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                Atualizar uso
              </Button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-syne text-base font-bold">{error.message}</p>
                {error.detail && <p className="mt-2 max-w-3xl text-xs leading-5 text-red-100/75">{error.detail}</p>}
                {error.status && (
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-100/60">
                    Status HTTP {error.status}
                  </p>
                )}
              </div>
              <Button onClick={load} disabled={loading} variant="outline" className="shrink-0 gap-2 border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {loading && !summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl bg-muted" />)}
          </div>
        ) : summary && currentUsage ? (
          <>
            <SummaryMetrics usage={currentUsage} />

            <section className="grid gap-4 lg:grid-cols-2">
              {summary.providers.map((provider) => (
                <ProviderStatusCard key={provider.id} provider={provider} />
              ))}
            </section>

            <section className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-syne text-lg font-bold text-foreground">Uso por modelo</h2>
                  <p className="text-xs text-muted-foreground">
                    Período iniciado em {new Date(currentUsage.since).toLocaleString('pt-BR')}.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Atualizado em {new Date(summary.generated_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <UsageTable providers={currentUsage.providers} />
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-syne text-lg font-bold text-foreground">Custo por vídeo gerado</h2>
                <p className="text-xs text-muted-foreground">
                  Valores estimados com base nas taxas configuradas no backend. Use como controle operacional, não como fatura oficial.
                </p>
              </div>
              <RecentVideoCosts videos={currentUsage.recent_videos} />
            </section>

            <section className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-syne text-sm font-bold text-foreground">Leitura sobre créditos</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    OpenAI e Replicate tratam billing em painéis próprios. A plataforma já mostra uso operacional real; o próximo passo é adicionar campos manuais de orçamento mensal ou integrar billing quando o provedor liberar endpoint apropriado para a conta.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
