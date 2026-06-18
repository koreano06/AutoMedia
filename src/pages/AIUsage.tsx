import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  DollarSign,
  ExternalLink,
  Film,
  Info,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Video,
  WalletCards,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { ApiRequestError } from '@/api/httpClient';
import {
  getAIUsageSummary,
  type AIRecentVideoCost,
  type AIPeriodUsage,
  type AIProviderStatus,
  type AIProviderUsage,
  type AIUsageSummary,
} from '@/services/aiUsage';
import { cn } from '@/lib/utils';

type PeriodKey = 'day' | 'week' | 'month';

type PageError = {
  message: string;
  detail?: string;
  status?: number;
};

const periods: Array<{ id: PeriodKey; label: string; hint: string }> = [
  { id: 'day', label: 'Hoje', hint: 'desde 00:00' },
  { id: 'week', label: 'Semana', hint: 'desde segunda' },
  { id: 'month', label: 'Mês', hint: 'desde o dia 1' },
];

function number(value?: number | null) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}

function money(value?: number | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(value || 0);
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function providerLabel(provider: string) {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    replicate_kling: 'Kling via Replicate',
    ffmpeg: 'FFmpeg local',
    ffmpeg_fallback: 'Fallback FFmpeg',
    unknown: 'Não identificado',
  };
  return labels[provider] || provider;
}

function toneClass(tone: 'ok' | 'warning' | 'error' | 'neutral') {
  return {
    ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
    error: 'border-red-500/25 bg-red-500/10 text-red-300',
    neutral: 'border-border bg-background/60 text-muted-foreground',
  }[tone];
}

function billingTone(status?: string) {
  if (status === 'available') return 'ok';
  if (status === 'error') return 'error';
  if (status === 'not_configured') return 'warning';
  return 'neutral';
}

function billingLabel(status?: string) {
  if (status === 'available') return 'Billing oficial ativo';
  if (status === 'error') return 'Falha no billing';
  if (status === 'not_configured') return 'Chave admin pendente';
  return 'Sem billing oficial';
}

function costSourceLabel(source: AIRecentVideoCost['cost_source'] | AIProviderUsage['cost_source']) {
  return {
    official_api: 'Oficial',
    free_local: 'Local',
    unavailable: 'Indisponível',
  }[source];
}

function PeriodSelector({ selected, onSelect }: { selected: PeriodKey; onSelect: (period: PeriodKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-background/70 p-1">
      {periods.map((period) => (
        <button
          key={period.id}
          type="button"
          onClick={() => onSelect(period.id)}
          className={cn(
            'rounded-xl px-3 py-2.5 text-left transition',
            selected === period.id ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <span className="block text-xs font-bold">{period.label}</span>
          <span className={cn('mt-0.5 block text-[10px]', selected === period.id ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
            {period.hint}
          </span>
        </button>
      ))}
    </div>
  );
}

function HeroPanel({
  period,
  onSelectPeriod,
  onRefresh,
  loading,
}: {
  period: PeriodKey;
  onSelectPeriod: (period: PeriodKey) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="grid gap-6 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <Bot className="h-3.5 w-3.5" />
            Central de consumo IA
          </span>
          <h1 className="mt-4 max-w-4xl font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Acompanhe o trabalho da IA sem misturar dados reais com estimativas.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Este painel mostra jobs, vídeos, falhas e custos oficiais quando o provedor libera billing por API. Se a plataforma não informar custo real, marcamos como indisponível.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-background/45 p-4">
          <PeriodSelector selected={period} onSelect={onSelectPeriod} />
          <Button onClick={onRefresh} disabled={loading} className="mt-4 w-full gap-2">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Atualizar dados
          </Button>
        </div>
      </div>
    </section>
  );
}

function InfoCard({ icon: Icon, title, detail, value }: { icon: LucideIcon; title: string; detail: string; value: string }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-syne text-sm font-bold text-foreground">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
      <p className="mt-5 font-syne text-2xl font-bold text-foreground">{value}</p>
    </article>
  );
}

function ExplainCards({ usage }: { usage: AIPeriodUsage }) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <InfoCard
        icon={Database}
        title="Uso real"
        detail="Jobs, vídeos e falhas vêm diretamente do backend, banco e fila."
        value={`${number(usage.jobs)} jobs`}
      />
      <InfoCard
        icon={WalletCards}
        title="Custo auditável"
        detail="Só entra no total financeiro o custo retornado por API oficial."
        value={money(usage.official_cost_usd)}
      />
      <InfoCard
        icon={ShieldCheck}
        title="Sem chute"
        detail="Quando não existe billing oficial, o painel mostra isso de forma transparente."
        value="Dados limpos"
      />
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  tone?: 'ok' | 'warning' | 'error' | 'neutral';
}) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border', toneClass(tone))}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">Real</span>
      </div>
      <p className="mt-5 font-syne text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{detail}</p>
    </article>
  );
}

function SummaryMetrics({ usage }: { usage: AIPeriodUsage }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard icon={Film} label="Vídeos gerados" value={number(usage.videos)} detail="Mídias geradas no período." tone="ok" />
      <MetricCard icon={Cpu} label="Jobs de vídeo" value={number(usage.jobs)} detail="Pedidos enviados ao pipeline." />
      <MetricCard icon={CheckCircle2} label="Concluídos" value={number(usage.completed)} detail="Jobs finalizados com resultado." tone="ok" />
      <MetricCard
        icon={AlertCircle}
        label="Fallback/Falhas"
        value={`${number(usage.fallback)} / ${number(usage.failed)}`}
        detail="Fallback local e jobs com erro."
        tone={usage.failed || usage.fallback ? 'warning' : 'neutral'}
      />
      <MetricCard icon={DollarSign} label="Gasto oficial" value={money(usage.official_cost_usd)} detail="Retornado por API oficial." tone="ok" />
    </section>
  );
}

function ProviderStatusCard({ provider }: { provider: AIProviderStatus }) {
  const configured = provider.configured;
  const models = [provider.text_model, provider.image_model, provider.video_model, provider.mode && `Modo ${provider.mode}`].filter(Boolean);
  const tone = billingTone(provider.credit_status);

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {provider.id === 'openai' ? <Sparkles className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-syne text-sm font-bold text-foreground">{provider.name}</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{provider.credit_message}</p>
          </div>
        </div>

        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', toneClass(configured ? 'ok' : 'error'))}>
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

      <div className={cn('mt-5 rounded-2xl border p-4', toneClass(tone))}>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="text-xs font-bold">{billingLabel(provider.credit_status)}</span>
        </div>
        <p className="mt-1 text-xs leading-5 opacity-80">{provider.credit_message}</p>
      </div>
    </article>
  );
}

function SmallMetric({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'ok' | 'warning' | 'error' | 'neutral' }) {
  return (
    <div className={cn('rounded-2xl border px-3 py-2 text-center lg:border-0 lg:bg-transparent lg:p-0 lg:text-left', toneClass(tone))}>
      <p className="text-sm font-bold lg:text-foreground">{number(value)}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70 lg:hidden">{label}</p>
    </div>
  );
}

function SmallCurrency({ label, value, source }: { label: string; value: number | null; source: AIProviderUsage['cost_source'] }) {
  const available = value !== null;

  return (
    <div
      className={cn(
        'rounded-2xl border px-3 py-2 text-center lg:border-0 lg:bg-transparent lg:p-0 lg:text-left',
        available ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 lg:text-foreground' : 'border-amber-500/25 bg-amber-500/10 text-amber-300 lg:text-muted-foreground',
      )}
    >
      <p className="text-sm font-bold">{available ? money(value) : 'Indisponível'}</p>
      <p className="text-[9px] font-semibold uppercase tracking-wider opacity-70 lg:hidden">{label}</p>
      <p className="hidden text-[10px] text-muted-foreground lg:block">{costSourceLabel(source)}</p>
    </div>
  );
}

function UsageTable({ providers }: { providers: AIProviderUsage[] }) {
  if (!providers.length) {
    return <EmptyState icon={Bot} title="Sem uso registrado neste período" detail="Gere um roteiro ou vídeo para aparecer aqui." />;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="hidden grid-cols-[1.3fr_1fr_repeat(6,minmax(76px,0.55fr))] gap-3 border-b border-border px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground lg:grid">
        <span>Provider</span>
        <span>Modelo</span>
        <span>Req.</span>
        <span>Vídeos</span>
        <span>OK</span>
        <span>Falhas</span>
        <span>Fallback</span>
        <span>Custo</span>
      </div>

      <div className="divide-y divide-border">
        {providers.map((usage) => (
          <div key={`${usage.provider}-${usage.model || 'default'}`} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.3fr_1fr_repeat(6,minmax(76px,0.55fr))] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-foreground">{providerLabel(usage.provider)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground lg:hidden">{usage.model || 'Modelo padrão'}</p>
            </div>
            <p className="hidden truncate text-xs text-muted-foreground lg:block">{usage.model || 'Modelo padrão'}</p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:contents">
              <SmallMetric label="Req." value={usage.requests} />
              <SmallMetric label="Vídeos" value={usage.videos} />
              <SmallMetric label="OK" value={usage.completed} tone="ok" />
              <SmallMetric label="Falhas" value={usage.failed} tone={usage.failed ? 'error' : 'neutral'} />
              <SmallMetric label="Fallback" value={usage.fallback} tone={usage.fallback ? 'warning' : 'neutral'} />
              <SmallCurrency label="Custo" value={usage.official_cost_usd} source={usage.cost_source} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentVideoCosts({ videos }: { videos: AIRecentVideoCost[] }) {
  if (!videos.length) {
    return <EmptyState icon={Video} title="Nenhum vídeo recente neste período" detail="Quando um vídeo for gerado, os dados oficiais disponíveis aparecerão aqui." />;
  }

  return (
    <div className="grid gap-3">
      {videos.map((video) => (
        <article key={video.id} className="rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
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
              <p className="mt-1 text-xs text-muted-foreground">{video.product_name || 'Produto não informado'} · {dateTime(video.created_at)}</p>
              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-muted-foreground">{video.cost_message}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-left sm:min-w-36 sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Custo oficial</p>
                <p className="mt-1 font-syne text-lg font-bold text-foreground">{video.official_cost_usd !== null ? money(video.official_cost_usd) : 'Indisponível'}</p>
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

function BillingNote({ title, status, message }: { title: string; status: string; message: string }) {
  const tone = billingTone(status);

  return (
    <article className={cn('rounded-3xl border p-5', toneClass(tone))}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-background/40">
          {tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
        </div>
        <div>
          <p className="font-syne text-sm font-bold">{title}</p>
          <p className="mt-1 text-xs leading-5 opacity-80">{message}</p>
        </div>
      </div>
    </article>
  );
}

function BillingNotes({ usage }: { usage: AIPeriodUsage }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <BillingNote title="OpenAI" status={usage.billing_status.openai} message={usage.billing_status.openai_message} />
      <BillingNote title="Replicate/Kling" status={usage.billing_status.replicate} message={usage.billing_status.replicate_message} />
    </section>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p className="mt-3 font-syne text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, detail, aside }: { icon: LucideIcon; title: string; detail: string; aside?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-syne text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
        </div>
      </div>
      {aside && (
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          {aside}
        </span>
      )}
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
        <HeroPanel period={period} onSelectPeriod={setPeriod} onRefresh={load} loading={loading} />

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
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : summary && currentUsage ? (
          <>
            <ExplainCards usage={currentUsage} />
            <SummaryMetrics usage={currentUsage} />

            <section className="grid gap-4 lg:grid-cols-2">
              {summary.providers.map((provider) => (
                <ProviderStatusCard key={provider.id} provider={provider} />
              ))}
            </section>

            <section className="space-y-4">
              <SectionHeader
                icon={BarChart3}
                title="Uso por modelo"
                detail={`Período iniciado em ${new Date(currentUsage.since).toLocaleString('pt-BR')}.`}
                aside={`Atualizado em ${new Date(summary.generated_at).toLocaleTimeString('pt-BR')}`}
              />
              <UsageTable providers={currentUsage.providers} />
            </section>

            <section className="space-y-4">
              <SectionHeader
                icon={Film}
                title="Vídeos gerados e custo oficial"
                detail="Sem estimativas: quando o provedor não entregar billing por API, o valor fica marcado como indisponível."
              />
              <RecentVideoCosts videos={currentUsage.recent_videos} />
            </section>

            <section className="space-y-4">
              <SectionHeader
                icon={Info}
                title="Como interpretar os dados"
                detail="A plataforma mostra operação e financeiro separadamente para evitar leitura errada de crédito ou gasto."
              />
              <BillingNotes usage={currentUsage} />
            </section>

            <div className="rounded-3xl border border-border bg-card p-5 text-xs leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  Para substituir totalmente os painéis oficiais, ainda precisamos que cada provedor libere uma API de billing confiável. Onde isso já existe, mostramos custo oficial; onde não existe, mantemos a informação transparente.
                </p>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
