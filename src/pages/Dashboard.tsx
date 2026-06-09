import { useState, useEffect } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import PlatformIcon from '@/components/common/PlatformIcon';
import ErrorState from '@/components/common/ErrorState';
import { Package, Zap, Clock, CheckCircle, Film, Link2, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { listProducts } from '@/services/products';
import { listPosts } from '@/services/posts';
import type { Product, Post } from '@/types/entities';

const chartData = [
  { day: 'Seg', posts: 4, reach: 1200 },
  { day: 'Ter', posts: 7, reach: 2800 },
  { day: 'Qua', posts: 5, reach: 1900 },
  { day: 'Qui', posts: 9, reach: 4200 },
  { day: 'Sex', posts: 12, reach: 5800 },
  { day: 'Sáb', posts: 8, reach: 3500 },
  { day: 'Dom', posts: 6, reach: 2600 },
];

const platformData = [
  { platform: 'instagram', posts: 28, reach: 12500 },
  { platform: 'tiktok', posts: 19, reach: 8900 },
  { platform: 'facebook', posts: 14, reach: 6200 },
  { platform: 'youtube', posts: 7, reach: 3800 },
];

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => localStorage.getItem('automedia_onboarding_hidden') !== 'true');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, postData] = await Promise.all([
        listProducts('-created_date', 10),
        listPosts('-created_date', 5),
      ]);
      setProducts(productData);
      setPosts(postData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = {
    totalProducts: products.length,
    published: posts.filter(p => p.status === 'published').length,
    pending: products.filter(p => ['review', 'generating'].includes(p.status)).length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
  };
  const onboardingSteps = [
    { label: 'Cadastrar primeiro anúncio', done: products.length > 0, href: '/products', icon: Package },
    { label: 'Importar mídia base', done: products.some((product) => (product.media_count || 0) > 0), href: '/media', icon: Film },
    { label: 'Gerar vídeo com IA', done: products.some((product) => (product.videos_generated || 0) > 0), href: '/videos', icon: Zap },
    { label: 'Aprovar e agendar', done: posts.some((post) => ['scheduled', 'published'].includes(String(post.status))), href: '/approval', icon: CheckCircle },
    { label: 'Conectar plataforma', done: posts.some((post) => Boolean(post.platform)), href: '/integrations', icon: Link2 },
  ];
  const onboardingProgress = Math.round((onboardingSteps.filter((step) => step.done).length / onboardingSteps.length) * 100);
  const executiveMetrics = [
    {
      label: 'Taxa publicada',
      value: `${posts.length ? Math.round((posts.filter((post) => post.status === 'published').length / posts.length) * 100) : 0}%`,
      detail: 'posts publicados / total',
    },
    {
      label: 'Fila ativa',
      value: stats.scheduled + stats.pending,
      detail: 'agendados + pendentes',
    },
    {
      label: 'Cobertura de anúncio',
      value: `${products.length ? Math.round((products.filter((product) => (product.videos_generated || 0) > 0).length / products.length) * 100) : 0}%`,
      detail: 'anúncios com vídeo',
    },
    {
      label: 'Próxima ação',
      value: products.length === 0 ? 'Criar anúncio' : posts.length === 0 ? 'Agendar post' : stats.pending > 0 ? 'Aprovar' : 'Monitorar',
      detail: 'prioridade operacional',
    },
  ];
  const hideOnboarding = () => {
    localStorage.setItem('automedia_onboarding_hidden', 'true');
    setShowOnboarding(false);
  };

  return (
    <div>
      <TopBar title="Dashboard" subtitle="Visão geral da automação de marketing" />
      <div className="mobile-page-pad page-stack">
        {error && <ErrorState onRetry={load} />}

        {showOnboarding && !loading && (
          <section className="responsive-card overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
              <div className="relative p-4 sm:p-5 lg:p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))]" />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Primeiros passos</span>
                      <h2 className="mt-4 max-w-2xl font-syne text-xl font-bold leading-tight text-foreground sm:text-2xl">
                        Configure sua operação de criativos em poucos passos.
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Esse checklist ajuda a sair do zero até o primeiro vídeo pronto para divulgação, sem precisar decorar o fluxo.
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={hideOnboarding} aria-label="Ocultar onboarding">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {onboardingSteps.map(({ label, done, href, icon: Icon }) => (
                      <Link key={label} to={href} className="rounded-2xl border border-border bg-background/55 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                          {done ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <p className="text-xs font-semibold text-foreground">{label}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-muted/25 p-4 sm:p-5 lg:border-l lg:border-t-0">
                <p className="font-syne text-sm font-bold text-foreground">Progresso de implantação</p>
                <p className="mt-1 text-xs text-muted-foreground">Quanto mais completo, mais pronta fica a plataforma para uso real.</p>
                <div className="mt-5 flex items-end justify-between">
                  <span className="font-syne text-4xl font-bold text-primary">{onboardingProgress}%</span>
                  <span className="text-xs text-muted-foreground">{onboardingSteps.filter((step) => step.done).length}/{onboardingSteps.length} etapas</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${onboardingProgress}%` }} />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <StatCard title="Anúncios Base" value={loading ? '—' : stats.totalProducts} icon={Package} color="primary" trendValue="+12%" trend="up" loading={loading} />
          <StatCard title="Publicações Hoje" value={loading ? '—' : stats.published} icon={Zap} color="success" trendValue="+8%" trend="up" loading={loading} />
          <StatCard title="Aguardando Aprovação" value={loading ? '—' : stats.pending} icon={Clock} color="warning" loading={loading} />
          <StatCard title="Agendados" value={loading ? '—' : stats.scheduled} icon={CheckCircle} color="blue" loading={loading} />
        </div>

        <section className="responsive-card responsive-card-pad">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Visão executiva</span>
              <h2 className="mt-3 font-syne text-xl font-bold text-foreground">Resumo para tomada de decisão</h2>
              <p className="mt-1 text-sm text-muted-foreground">Leitura rápida do que precisa de atenção antes de escalar os disparos.</p>
            </div>
            <Link to="/quality" className="text-sm font-medium text-primary hover:underline">Abrir central de qualidade</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {executiveMetrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-border bg-muted/25 p-4">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-2 font-syne text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="responsive-card responsive-card-pad lg:col-span-2">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-syne font-bold text-foreground">Publicações & Alcance</h3>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Posts</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-chart-2" />Alcance</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="posts" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#colorPosts)" />
                <Area type="monotone" dataKey="reach" stroke="hsl(var(--chart-4))" strokeWidth={2} fill="url(#colorReach)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="responsive-card responsive-card-pad">
            <h3 className="font-syne font-bold text-foreground mb-1">Por Plataforma</h3>
            <p className="text-xs text-muted-foreground mb-5">Desempenho esta semana</p>
            <div className="space-y-4">
              {platformData.map(({ platform, posts: p }) => (
                <div key={platform} className="flex items-center gap-3">
                  <PlatformIcon platform={platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-foreground capitalize">{platform}</span>
                      <span className="text-xs text-muted-foreground">{p} posts</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(p / 28) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="responsive-card responsive-card-pad">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-syne font-bold text-foreground">Anúncios Base Recentes</h3>
              <Link to="/products" className="text-xs text-primary hover:underline font-medium">Ver todos</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState icon={Package} message="Nenhum anúncio base cadastrado ainda" action="/products" actionLabel="Adicionar Anúncio" />
            ) : (
              <div className="space-y-2">
                {products.slice(0, 5).map(product => (
                  <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} className="w-full h-full object-cover rounded-lg" alt="" />
                      ) : (
                        <Package className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category || 'Sem categoria'}</p>
                    </div>
                    <StatusBadge status={product.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="responsive-card responsive-card-pad">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-syne font-bold text-foreground">Publicações Recentes</h3>
              <Link to="/publications" className="text-xs text-primary hover:underline font-medium">Ver todas</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState icon={Zap} message="Nenhuma publicação ainda" action="/schedule" actionLabel="Agendar Post" />
            ) : (
              <div className="space-y-2">
                {posts.slice(0, 5).map(post => (
                  <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                    <PlatformIcon platform={post.platform} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{post.product_name || 'Produto'}</p>
                      <p className="text-xs text-muted-foreground truncate">{post.caption?.slice(0, 50)}...</p>
                    </div>
                    <StatusBadge status={post.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      <Link to={action} className="text-xs font-medium text-primary hover:underline">{actionLabel}</Link>
    </div>
  );
}
