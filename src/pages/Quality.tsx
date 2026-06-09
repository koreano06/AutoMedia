import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileWarning,
  FlaskConical,
  HardDrive,
  KeyRound,
  Layers3,
  Link2,
  ListChecks,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Wifi,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { getLastApiError } from '@/api/httpClient';
import { cn } from '@/lib/utils';
import { getDiagnostics, runDiagnosticChecks, type DiagnosticServiceStatus, type DiagnosticsResponse } from '@/services/diagnostics';
import { listJobs } from '@/services/jobs';
import { listMediaAssets } from '@/services/mediaAssets';
import { listPlatformAccounts, type PlatformAccountWithConfig } from '@/services/platforms';
import { listPosts } from '@/services/posts';
import { listProducts } from '@/services/products';
import type { Job, MediaAsset, Post, Product } from '@/types/entities';

type TabId = 'health' | 'flows' | 'integrations' | 'jobs' | 'errors' | 'environment';
type CheckState = 'idle' | 'running' | 'ok' | 'warning' | 'error';

type FlowCheck = {
  id: string;
  label: string;
  description: string;
  status: CheckState;
  detail?: string;
};

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'health', label: 'Saúde', icon: Activity },
  { id: 'flows', label: 'Fluxos', icon: TestTube2 },
  { id: 'integrations', label: 'Integrações', icon: Link2 },
  { id: 'jobs', label: 'Jobs', icon: Clock3 },
  { id: 'errors', label: 'Erros', icon: FileWarning },
  { id: 'environment', label: 'Ambiente', icon: Server },
];

const initialFlowChecks: FlowCheck[] = [
  { id: 'auth', label: 'Autenticação', description: 'Valida token atual, usuário e workspace.', status: 'idle' },
  { id: 'database_write', label: 'Escrita segura no banco', description: 'Cria, atualiza e remove um job temporário.', status: 'idle' },
  { id: 'storage', label: 'Storage', description: 'Confere driver e configuração sem enviar arquivos reais.', status: 'idle' },
  { id: 'queue', label: 'Fila Redis', description: 'Valida resposta da fila usada por jobs.', status: 'idle' },
  { id: 'ai', label: 'OpenAI', description: 'Confere configuração da IA sem executar chamada paga.', status: 'idle' },
  { id: 'mock_publish', label: 'Publicação simulada', description: 'Verifica se o modo mock/live está apto sem publicar.', status: 'idle' },
  { id: 'latency', label: 'Latência', description: 'Mede consultas internas essenciais.', status: 'idle' },
  { id: 'contracts', label: 'Contratos', description: 'Confere formatos básicos de produtos, mídias, posts e jobs.', status: 'idle' },
  { id: 'permissions', label: 'Permissões', description: 'Valida papel e acesso a ações sensíveis.', status: 'idle' },
];

const statusStyle: Record<string, string> = {
  ok: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  completed: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  ready: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  connected: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  external: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  running: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  queued: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  processing: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  rendering: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  degraded: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  mock: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
  idle: 'border-border bg-muted text-muted-foreground',
  error: 'border-red-500/25 bg-red-500/10 text-red-300',
  failed: 'border-red-500/25 bg-red-500/10 text-red-300',
  disconnected: 'border-border bg-muted text-muted-foreground',
};

function getStatusClass(status?: string) {
  return statusStyle[String(status || 'idle').toLowerCase()] || statusStyle.idle;
}

function StatusPill({ status, label }: { status?: string; label?: string }) {
  const value = String(status || 'idle').toLowerCase();
  const Icon = value === 'ok' || value === 'connected' || value === 'completed' ? CheckCircle2
    : value === 'error' || value === 'failed' ? XCircle
      : value === 'running' || value === 'processing' || value === 'rendering' ? RefreshCw
        : AlertCircle;

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', getStatusClass(value))}>
      <Icon className={cn('h-3 w-3', ['running', 'processing', 'rendering'].includes(value) && 'animate-spin')} />
      {label || value}
    </span>
  );
}

function PanelCard({
  children,
  className,
  icon: Icon,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className={cn('rounded-3xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-syne text-sm font-bold text-foreground">{title}</h3>
          {subtitle && <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, status }: { icon: LucideIcon; label: string; value: string | number; status?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        {status && <StatusPill status={status} />}
      </div>
      <p className="mt-4 font-syne text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ServiceRow({ icon: Icon, label, service }: { icon: LucideIcon; label: string; service?: DiagnosticServiceStatus }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {service?.message || service?.driver || service?.bucket || service?.command || service?.image_model || 'Sem detalhes adicionais.'}
          </p>
        </div>
      </div>
      <StatusPill status={service?.status} />
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return 'Não informado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

export default function Quality() {
  const [activeTab, setActiveTab] = useState<TabId>('health');
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccountWithConfig[]>([]);
  const [flowChecks, setFlowChecks] = useState<FlowCheck[]>(initialFlowChecks);
  const [loading, setLoading] = useState(true);
  const [runningChecks, setRunningChecks] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const failedJobs = useMemo(() => jobs.filter((job) => job.status === 'failed'), [jobs]);
  const failedPosts = useMemo(() => posts.filter((post) => post.status === 'failed' || post.error_message), [posts]);
  const lastApiError = getLastApiError();
  const healthStatus = diagnostics?.status || (pageError ? 'error' : 'warning');
  const monitorAlerts = useMemo(() => {
    const alerts = [];
    if (pageError) alerts.push({ title: 'Diagnóstico indisponível', detail: pageError, status: 'error' });
    if (failedJobs.length > 0) alerts.push({ title: 'Jobs falhos', detail: `${failedJobs.length} job(s) precisam de revisão.`, status: 'error' });
    if (failedPosts.length > 0) alerts.push({ title: 'Publicações com erro', detail: `${failedPosts.length} publicação(ões) falharam ou possuem erro.`, status: 'error' });
    if (diagnostics?.services.storage?.status && diagnostics.services.storage.status !== 'ok') {
      alerts.push({ title: 'Storage requer atenção', detail: diagnostics.services.storage.message || 'Verifique driver e bucket.', status: diagnostics.services.storage.status });
    }
    if (diagnostics?.services.worker?.status && diagnostics.services.worker.status !== 'ok') {
      alerts.push({ title: 'Worker de vídeo requer atenção', detail: diagnostics.services.worker.message || 'Verifique serviço do worker.', status: diagnostics.services.worker.status });
    }
    if (lastApiError) alerts.push({ title: 'Último erro da API', detail: lastApiError.message, status: 'warning' });
    return alerts;
  }, [diagnostics, failedJobs.length, failedPosts.length, lastApiError, pageError]);

  async function loadDashboardData() {
    setLoading(true);
    setPageError(null);

    try {
      const [diagnosticsResult, productsResult, mediaResult, postsResult, jobsResult, platformsResult] = await Promise.all([
        getDiagnostics(),
        listProducts('-created_date', 20),
        listMediaAssets('-created_date', 20),
        listPosts('-created_at', 40),
        listJobs(),
        listPlatformAccounts(),
      ]);

      setDiagnostics(diagnosticsResult);
      setProducts(productsResult);
      setMediaAssets(mediaResult);
      setPosts(postsResult);
      setJobs(jobsResult);
      setPlatformAccounts(platformsResult);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Não foi possível carregar diagnóstico.');
    } finally {
      setLoading(false);
    }
  }

  async function runSafeChecks() {
    setRunningChecks(true);
    setFlowChecks((current) => current.map((check) => ({ ...check, status: 'running', detail: 'Executando...' })));

    try {
      const response = await runDiagnosticChecks(initialFlowChecks.map((check) => check.id));
      setFlowChecks((current) => current.map((check) => {
        const result = response.results.find((item) => item.id === check.id);
        return result ? {
          ...check,
          detail: `${result.message} (${result.duration_ms}ms)`,
          status: result.status,
        } : check;
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao executar testes.';
      setFlowChecks((current) => current.map((check) => ({ ...check, status: 'error', detail: message })));
    } finally {
      setRunningChecks(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div>
      <TopBar title="Qualidade" subtitle="Testes, diagnóstico e saúde operacional do AutoMedia" />
      <div className="space-y-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card">
          <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Central de qualidade
              </div>
              <h1 className="max-w-2xl font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Veja se o sistema está pronto para operar antes de publicar, gerar vídeos ou conectar plataformas.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Esta área reúne testes seguros, saúde do backend, integrações, jobs e últimos sinais de erro. Ela foi feita para leitura rápida em produção sem expor segredos.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={loadDashboardData} disabled={loading} variant="outline" className="gap-2">
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                  Atualizar painel
                </Button>
                <Button onClick={runSafeChecks} disabled={runningChecks} className="gap-2">
                  <FlaskConical className={cn('h-4 w-4', runningChecks && 'animate-pulse')} />
                  Rodar teste rápido
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={ShieldCheck} label="Saúde geral" value={healthStatus} status={healthStatus} />
              <MetricCard icon={Layers3} label="Anúncios" value={products.length} />
              <MetricCard icon={HardDrive} label="Mídias" value={mediaAssets.length} />
              <MetricCard icon={Clock3} label="Jobs falhos" value={failedJobs.length} status={failedJobs.length ? 'error' : 'ok'} />
            </div>
          </div>
          <div className="border-t border-border bg-muted/30 p-2">
            <div className="flex gap-2 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold transition-all',
                    activeTab === id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-card hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {pageError && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
            {pageError}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {monitorAlerts.length === 0 ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 md:col-span-2 xl:col-span-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-syne text-sm font-bold text-foreground">Nenhum alerta crítico detectado</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Backend, jobs e integrações não reportaram falhas críticas nesta leitura.</p>
                </div>
              </div>
            </div>
          ) : monitorAlerts.map((alert) => (
            <div key={`${alert.title}-${alert.detail}`} className={cn('rounded-3xl border p-5', getStatusClass(alert.status))}>
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-syne text-sm font-bold">{alert.title}</p>
                  <p className="mt-1 text-xs leading-5 opacity-85">{alert.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {activeTab === 'health' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelCard icon={Database} title="Serviços principais" subtitle="Leitura direta do endpoint protegido de diagnóstico.">
              <div className="space-y-3">
                <ServiceRow icon={Database} label="Banco de dados" service={diagnostics?.services.database} />
                <ServiceRow icon={Wifi} label="Redis / fila" service={diagnostics?.services.redis} />
                <ServiceRow icon={HardDrive} label="Storage" service={diagnostics?.services.storage} />
                <ServiceRow icon={Sparkles} label="OpenAI" service={diagnostics?.services.openai} />
                <ServiceRow icon={Bot} label="Worker de vídeo" service={diagnostics?.services.worker} />
              </div>
            </PanelCard>
            <PanelCard icon={ListChecks} title="Resumo operacional" subtitle="Sinais rápidos para decidir se seguimos ou investigamos.">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard icon={CheckCircle2} label="Posts com erro" value={failedPosts.length} status={failedPosts.length ? 'error' : 'ok'} />
                <MetricCard icon={Clock3} label="Jobs recentes" value={jobs.length} />
                <MetricCard icon={Link2} label="Integrações" value={platformAccounts.length} />
                <MetricCard icon={Activity} label="Última checagem" value={diagnostics ? formatDate(diagnostics.checked_at) : 'Pendente'} />
              </div>
            </PanelCard>
          </div>
        )}

        {activeTab === 'flows' && (
          <PanelCard icon={TestTube2} title="Testes de fluxo seguros" subtitle="Consultas sem criação ou exclusão de dados. Para CRUD destrutivo, use o smoke técnico do backend.">
            <div className="grid gap-3 lg:grid-cols-2">
              {flowChecks.map((check) => (
                <div key={check.id} className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{check.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{check.description}</p>
                    </div>
                    <StatusPill status={check.status} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{check.detail || 'Aguardando execução.'}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        )}

        {activeTab === 'integrations' && (
          <PanelCard icon={Link2} title="Integrações e conectividade" subtitle="Mostra modo, status e última sincronização das plataformas conectadas.">
            <div className="grid gap-3 lg:grid-cols-2">
              {platformAccounts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground lg:col-span-2">
                  Nenhuma conta conectada ainda. Use a tela Integrações para conectar plataformas.
                </div>
              ) : platformAccounts.map((account) => (
                <div key={account.id} className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-syne text-sm font-bold capitalize text-foreground">{account.platform}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{account.account_name || 'Conta sem nome'}</p>
                    </div>
                    <StatusPill status={account.setup_status || account.status || account.mode} />
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Modo: {account.mode || 'não informado'}</span>
                    <span>Sincronização: {formatDate(account.last_sync_at)}</span>
                    <span>Expira: {formatDate(account.expires_at)}</span>
                    <span>Escopos: {account.scopes?.length || 0}</span>
                  </div>
                  {account.setup_hint && <p className="mt-3 rounded-xl bg-muted p-3 text-xs text-muted-foreground">{account.setup_hint}</p>}
                </div>
              ))}
            </div>
          </PanelCard>
        )}

        {activeTab === 'jobs' && (
          <PanelCard icon={Clock3} title="Fila de jobs" subtitle="Últimos processos assíncronos: análise, coleta, geração de vídeo, publicação e comentários.">
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-3 bg-muted px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr]">
                <span>Job</span><span>Tipo</span><span>Status</span><span className="hidden sm:block">Atualizado</span>
              </div>
              {jobs.slice(0, 12).map((job) => (
                <div key={job.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-3 border-t border-border px-4 py-3 text-xs sm:grid-cols-[1.4fr_0.8fr_0.7fr_0.8fr]">
                  <span className="min-w-0 truncate font-medium text-foreground">{job.title}</span>
                  <span className="min-w-0 truncate text-muted-foreground">{job.type}</span>
                  <StatusPill status={job.status} />
                  <span className="hidden text-muted-foreground sm:block">{formatDate(job.updated_at || job.created_at)}</span>
                </div>
              ))}
              {jobs.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">Nenhum job encontrado.</div>}
            </div>
          </PanelCard>
        )}

        {activeTab === 'errors' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelCard icon={FileWarning} title="Erros recentes" subtitle="Últimos sinais capturados pelo frontend e dados com falha no backend.">
              <div className="space-y-3">
                {lastApiError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    API: {lastApiError.path} retornou {lastApiError.status} - {lastApiError.message}
                  </div>
                )}
                {failedJobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="rounded-2xl border border-border bg-background/50 p-4">
                    <p className="text-sm font-semibold text-foreground">{job.title}</p>
                    <p className="mt-1 text-xs text-red-300">{job.error_message || 'Job marcado como falho.'}</p>
                  </div>
                ))}
                {!lastApiError && failedJobs.length === 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Nenhum erro recente capturado nesta sessão.
                  </div>
                )}
              </div>
            </PanelCard>
            <PanelCard icon={AlertCircle} title="Publicações com falha" subtitle="Posts que precisam de revisão antes de nova tentativa.">
              <div className="space-y-3">
                {failedPosts.slice(0, 6).map((post) => (
                  <div key={post.id} className="rounded-2xl border border-border bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-semibold text-foreground">{post.product_name || post.caption || 'Publicação sem título'}</p>
                      <StatusPill status={post.status || 'failed'} />
                    </div>
                    <p className="mt-1 text-xs text-red-300">{post.error_message || 'Publicação marcada para revisão.'}</p>
                  </div>
                ))}
                {failedPosts.length === 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Nenhuma publicação com erro nos dados carregados.
                  </div>
                )}
              </div>
            </PanelCard>
          </div>
        )}

        {activeTab === 'environment' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelCard icon={Server} title="Ambiente do frontend" subtitle="Informações seguras, sem tokens ou secrets.">
              <div className="space-y-3 text-sm">
                <InfoRow label="Modo" value={import.meta.env.MODE} />
                <InfoRow label="API configurada" value={import.meta.env.VITE_API_BASE_URL || 'Não configurada'} />
                <InfoRow label="Origem atual" value={window.location.origin} />
                <InfoRow label="Build" value={import.meta.env.PROD ? 'Produção' : 'Desenvolvimento'} />
              </div>
            </PanelCard>
            <PanelCard icon={KeyRound} title="Ambiente do backend" subtitle="Lido do diagnóstico sem expor variáveis sensíveis.">
              <div className="space-y-3 text-sm">
                <InfoRow label="Status" value={diagnostics?.status || 'indisponível'} />
                <InfoRow label="Storage" value={diagnostics?.services.storage?.driver || 'não informado'} />
                <InfoRow label="OpenAI model" value={diagnostics?.services.openai?.image_model || 'não informado'} />
                <InfoRow label="Worker" value={diagnostics?.services.worker?.command || 'não informado'} />
              </div>
            </PanelCard>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="break-all font-medium text-foreground">{value}</span>
    </div>
  );
}
