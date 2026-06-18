import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Film,
  Layers3,
  Megaphone,
  Package,
  PlayCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react';

import ErrorState from '@/components/common/ErrorState';
import PlatformIcon from '@/components/common/PlatformIcon';
import StatusBadge from '@/components/common/StatusBadge';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { listJobs } from '@/services/jobs';
import { listPosts } from '@/services/posts';
import { listProducts } from '@/services/products';
import type { Job, Post, Product } from '@/types/entities';

type IconType = ComponentType<{ className?: string }>;
type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const toneClasses: Record<Tone, string> = {
  primary: 'border-primary/25 bg-primary/10 text-primary',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/25 bg-warning/10 text-warning',
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  muted: 'border-border bg-muted/35 text-muted-foreground',
};

const stageCopy = {
  product: {
    title: 'Criar anúncio base',
    description: 'Cadastre o produto ou oferta que vai virar criativo.',
    href: '/products',
    action: 'Cadastrar anúncio',
    icon: Package,
  },
  media: {
    title: 'Adicionar mídia',
    description: 'Use imagens reais, referências ou materiais gerados por IA.',
    href: '/media',
    action: 'Abrir biblioteca',
    icon: Layers3,
  },
  video: {
    title: 'Gerar vídeo IA',
    description: 'Crie roteiro, cenas e renderização do criativo.',
    href: '/videos',
    action: 'Gerar vídeo',
    icon: Wand2,
  },
  approval: {
    title: 'Aprovar criativos',
    description: 'Revise vídeos antes de agendar ou publicar.',
    href: '/approval',
    action: 'Revisar aprovação',
    icon: ShieldCheck,
  },
  schedule: {
    title: 'Agendar publicação',
    description: 'Defina plataforma, horário e legenda.',
    href: '/schedule',
    action: 'Agendar post',
    icon: CalendarClock,
  },
};

function getNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isVideoJob(job: Job) {
  return job.type === 'video_generation';
}

function formatDate(value?: string) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, postData, jobData] = await Promise.all([
        listProducts('-created_date', 25),
        listPosts('-created_date', 25),
        listJobs(),
      ]);
      setProducts(productData);
      setPosts(postData);
      setJobs(jobData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const dashboard = useMemo(() => {
    const mediaCount = products.reduce((sum, product) => sum + getNumber(product.media_count), 0);
    const generatedVideos = products.reduce((sum, product) => sum + getNumber(product.videos_generated), 0);
    const publishedPosts = posts.filter((post) => post.status === 'published');
    const scheduledPosts = posts.filter((post) => post.status === 'scheduled');
    const approvalQueue = products.filter((product) => ['review', 'pending_review', 'generating'].includes(String(product.status)));
    const activeJobs = jobs.filter((job) => ['queued', 'processing', 'rendering', 'uploading'].includes(String(job.status)));
    const failedJobs = jobs.filter((job) => job.status === 'failed');
    const videoJobs = jobs.filter(isVideoJob);
    const completedVideoJobs = videoJobs.filter((job) => job.status === 'completed');
    const connectedPlatforms = new Set(posts.map((post) => post.platform).filter(Boolean));

    const readinessParts = [
      products.length > 0,
      mediaCount > 0,
      generatedVideos > 0 || completedVideoJobs.length > 0,
      approvalQueue.length > 0 || scheduledPosts.length > 0 || publishedPosts.length > 0,
      connectedPlatforms.size > 0,
    ];
    const readiness = Math.round((readinessParts.filter(Boolean).length / readinessParts.length) * 100);

    const nextStepKey =
      products.length === 0
        ? 'product'
        : mediaCount === 0
          ? 'media'
          : generatedVideos === 0 && completedVideoJobs.length === 0
            ? 'video'
            : approvalQueue.length > 0
              ? 'approval'
              : scheduledPosts.length === 0 && publishedPosts.length === 0
                ? 'schedule'
                : 'video';

    const conversion = products.length ? Math.round(((generatedVideos || completedVideoJobs.length) / products.length) * 100) : 0;
    const publishRate = posts.length ? Math.round((publishedPosts.length / posts.length) * 100) : 0;

    return {
      mediaCount,
      generatedVideos,
      publishedPosts,
      scheduledPosts,
      approvalQueue,
      activeJobs,
      failedJobs,
      videoJobs,
      completedVideoJobs,
      connectedPlatforms,
      readiness,
      nextStep: stageCopy[nextStepKey],
      conversion,
      publishRate,
    };
  }, [jobs, posts, products]);

  const recentActivities = useMemo(() => {
    const productEvents = products.slice(0, 4).map((product) => ({
      id: `product-${product.id}`,
      title: product.name,
      subtitle: product.category || 'Anúncio base',
      date: product.updated_at || product.created_at,
      status: product.status || 'draft',
      icon: Package,
      href: '/products',
    }));

    const postEvents = posts.slice(0, 4).map((post) => ({
      id: `post-${post.id}`,
      title: post.product_name || post.campaign_name || 'Publicação',
      subtitle: post.platform ? `Post para ${post.platform}` : 'Publicação sem plataforma',
      date: post.published_at || post.scheduled_at || post.updated_at || post.created_at,
      status: post.status || 'draft',
      icon: Megaphone,
      href: '/publications',
    }));

    return [...productEvents, ...postEvents]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 6);
  }, [posts, products]);

  const funnel = [
    {
      label: 'Anúncios',
      value: products.length,
      hint: 'Produtos/ofertas cadastrados',
      icon: Package,
      tone: 'primary' as Tone,
      href: '/products',
    },
    {
      label: 'Mídias',
      value: dashboard.mediaCount,
      hint: 'Assets prontos para roteiro',
      icon: Layers3,
      tone: 'success' as Tone,
      href: '/media',
    },
    {
      label: 'Vídeos',
      value: dashboard.generatedVideos || dashboard.completedVideoJobs.length,
      hint: 'Criativos gerados',
      icon: Film,
      tone: 'warning' as Tone,
      href: '/videos',
    },
    {
      label: 'Aprovação',
      value: dashboard.approvalQueue.length,
      hint: 'Itens exigem revisão',
      icon: ShieldCheck,
      tone: dashboard.approvalQueue.length ? 'warning' as Tone : 'muted' as Tone,
      href: '/approval',
    },
    {
      label: 'Agendados',
      value: dashboard.scheduledPosts.length,
      hint: 'Posts na fila de disparo',
      icon: CalendarClock,
      tone: 'success' as Tone,
      href: '/schedule',
    },
  ];

  const kpis = [
    {
      label: 'Anúncios ativos',
      value: products.length,
      description: 'Base de produtos para criar vídeos.',
      icon: Package,
      tone: 'primary' as Tone,
    },
    {
      label: 'Vídeos prontos',
      value: dashboard.generatedVideos || dashboard.completedVideoJobs.length,
      description: `${dashboard.conversion}% dos anúncios com criativo.`,
      icon: PlayCircle,
      tone: 'warning' as Tone,
    },
    {
      label: 'Aguardando ação',
      value: dashboard.approvalQueue.length + dashboard.failedJobs.length,
      description: 'Revisões ou falhas para resolver.',
      icon: AlertCircle,
      tone: dashboard.approvalQueue.length + dashboard.failedJobs.length ? 'danger' as Tone : 'success' as Tone,
    },
    {
      label: 'Publicações',
      value: dashboard.publishedPosts.length,
      description: `${dashboard.publishRate}% dos posts publicados.`,
      icon: Rocket,
      tone: 'success' as Tone,
    },
  ];

  return (
    <div>
      <TopBar title="Dashboard" subtitle="Central de operação da AutoMedia" />
      <div className="mobile-page-pad page-stack">
        {error && <ErrorState onRetry={load} />}

        <section className="responsive-card overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[1fr_420px]">
            <div className="relative p-5 sm:p-6 lg:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,hsl(var(--primary)/0.16),transparent_32%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.28))]" />
              <div className="relative max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Prioridade operacional
                </div>
                <h1 className="mt-5 max-w-3xl font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl lg:text-4xl">
                  {loading ? 'Carregando operação...' : dashboard.nextStep.title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {loading
                    ? 'Buscando anúncios, posts e jobs para montar uma visão real do funil.'
                    : dashboard.nextStep.description}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button asChild className="gap-2">
                    <Link to={loading ? '/products' : dashboard.nextStep.href}>
                      {loading ? 'Abrir operação' : dashboard.nextStep.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={load} disabled={loading}>
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                    Atualizar dados
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-background/40 p-5 sm:p-6 xl:border-l xl:border-t-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Prontidão</p>
                  <p className="mt-1 text-sm text-muted-foreground">Quanto falta para operar ponta a ponta.</p>
                </div>
                <span className="font-syne text-4xl font-bold text-primary">{loading ? '--' : `${dashboard.readiness}%`}</span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${loading ? 0 : dashboard.readiness}%` }} />
              </div>
              <div className="mt-5 grid gap-2">
                {[
                  ['Anúncio base', products.length > 0],
                  ['Mídia disponível', dashboard.mediaCount > 0],
                  ['Vídeo gerado', dashboard.generatedVideos > 0 || dashboard.completedVideoJobs.length > 0],
                  ['Post agendado/publicado', dashboard.scheduledPosts.length > 0 || dashboard.publishedPosts.length > 0],
                ].map(([label, done]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-border bg-card/70 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    {done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock3 className="h-4 w-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <MetricCard key={item.label} loading={loading} {...item} />
          ))}
        </section>

        <section className="responsive-card responsive-card-pad">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Funil principal</p>
              <h2 className="mt-2 font-syne text-xl font-bold text-foreground">Da oferta ao disparo</h2>
            </div>
            <span className="text-xs text-muted-foreground">Dados reais do backend</span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            {funnel.map((stage, index) => (
              <FunnelStep key={stage.label} index={index} loading={loading} {...stage} />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="responsive-card responsive-card-pad">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Atenção agora</p>
                <h2 className="mt-2 font-syne text-lg font-bold text-foreground">Filas que precisam de ação</h2>
              </div>
              <Link to="/quality" className="text-xs font-semibold text-primary hover:underline">
                Qualidade
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <QueueCard
                icon={ShieldCheck}
                title="Aprovação"
                value={dashboard.approvalQueue.length}
                description="Criativos aguardando revisão."
                href="/approval"
                tone={dashboard.approvalQueue.length ? 'warning' : 'success'}
                loading={loading}
              />
              <QueueCard
                icon={Clock3}
                title="Jobs ativos"
                value={dashboard.activeJobs.length}
                description="Geração ou upload em andamento."
                href="/videos"
                tone="primary"
                loading={loading}
              />
              <QueueCard
                icon={AlertCircle}
                title="Falhas"
                value={dashboard.failedJobs.length}
                description="Itens que podem ser reenfileirados."
                href="/quality"
                tone={dashboard.failedJobs.length ? 'danger' : 'success'}
                loading={loading}
              />
            </div>
          </section>

          <section className="responsive-card responsive-card-pad">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Canais</p>
                <h2 className="mt-2 font-syne text-lg font-bold text-foreground">Publicações por plataforma</h2>
              </div>
              <Link to="/integrations" className="text-xs font-semibold text-primary hover:underline">
                Integrações
              </Link>
            </div>
            <PlatformSummary posts={posts} loading={loading} />
          </section>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <RecentProducts products={products} loading={loading} />
          <RecentActivity activities={recentActivities} loading={loading} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  description: string;
  icon: IconType;
  tone: Tone;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {loading ? (
        <div className="mt-6 space-y-2">
          <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        </div>
      ) : (
        <>
          <p className="mt-6 font-syne text-3xl font-bold text-foreground">{value}</p>
          <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        </>
      )}
    </div>
  );
}

function FunnelStep({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
  index,
  loading,
}: {
  label: string;
  value: number;
  hint: string;
  icon: IconType;
  tone: Tone;
  href: string;
  index: number;
  loading: boolean;
}) {
  return (
    <Link to={href} className="group relative rounded-3xl border border-border bg-background/55 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/35">
      {index > 0 && <div className="absolute -left-3 top-1/2 hidden h-px w-3 bg-border lg:block" />}
      <div className="flex items-center justify-between gap-3">
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-5 font-syne text-3xl font-bold text-foreground">{loading ? '--' : value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
    </Link>
  );
}

function QueueCard({
  icon: Icon,
  title,
  value,
  description,
  href,
  tone,
  loading,
}: {
  icon: IconType;
  title: string;
  value: number;
  description: string;
  href: string;
  tone: Tone;
  loading: boolean;
}) {
  return (
    <Link to={href} className="rounded-3xl border border-border bg-background/55 p-4 transition-colors hover:border-primary/35">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-2xl border', toneClasses[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-4 font-syne text-2xl font-bold text-foreground">{loading ? '--' : value}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </Link>
  );
}

function PlatformSummary({ posts, loading }: { posts: Post[]; loading: boolean }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((post) => {
      if (!post.platform) return;
      map.set(String(post.platform), (map.get(String(post.platform)) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

  if (loading) {
    return (
      <div className="mt-5 space-y-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  if (counts.length === 0) {
    return <EmptyPanel icon={Megaphone} text="Nenhuma plataforma usada ainda." href="/integrations" label="Conectar canal" />;
  }

  const max = Math.max(...counts.map(([, count]) => count), 1);
  return (
    <div className="mt-5 space-y-3">
      {counts.map(([platform, count]) => (
        <div key={platform} className="rounded-2xl border border-border bg-background/55 p-3">
          <div className="flex items-center gap-3">
            <PlatformIcon platform={platform} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold capitalize text-foreground">{platform}</p>
                <p className="text-xs text-muted-foreground">{count} post(s)</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentProducts({ products, loading }: { products: Product[]; loading: boolean }) {
  return (
    <section className="responsive-card responsive-card-pad">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Base criativa</p>
          <h2 className="mt-2 font-syne text-lg font-bold text-foreground">Anúncios recentes</h2>
        </div>
        <Link to="/products" className="text-xs font-semibold text-primary hover:underline">Ver todos</Link>
      </div>
      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : products.length === 0 ? (
          <EmptyPanel icon={Package} text="Nenhum anúncio cadastrado." href="/products" label="Cadastrar anúncio" />
        ) : (
          <div className="space-y-2">
            {products.slice(0, 5).map((product) => (
              <Link key={product.id} to="/products" className="flex items-center gap-3 rounded-2xl border border-border bg-background/55 p-3 transition-colors hover:border-primary/35">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{product.category || product.brand || 'Sem categoria'}</p>
                </div>
                <StatusBadge status={product.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RecentActivity({
  activities,
  loading,
}: {
  activities: Array<{ id: string; title: string; subtitle: string; date?: string; status: string; icon: IconType; href: string }>;
  loading: boolean;
}) {
  return (
    <section className="responsive-card responsive-card-pad">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Atividade</p>
          <h2 className="mt-2 font-syne text-lg font-bold text-foreground">Últimos movimentos</h2>
        </div>
        <Link to="/quality" className="text-xs font-semibold text-primary hover:underline">Logs</Link>
      </div>
      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
          </div>
        ) : activities.length === 0 ? (
          <EmptyPanel icon={Sparkles} text="A operação ainda não gerou atividade." href="/products" label="Começar agora" />
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <Link key={activity.id} to={activity.href} className="flex items-center gap-3 rounded-2xl border border-border bg-background/55 p-3 transition-colors hover:border-primary/35">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{activity.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{activity.subtitle} · {formatDate(activity.date)}</p>
                  </div>
                  <StatusBadge status={activity.status} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyPanel({ icon: Icon, text, href, label }: { icon: IconType; text: string; href: string; label: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/40 p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      <Link to={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
        {label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
