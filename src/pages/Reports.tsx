import { useEffect, useMemo, useState } from 'react';
import { isAfter, subDays } from 'date-fns';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Download,
  Eye,
  Heart,
  LineChart as LineChartIcon,
  MessageCircle,
  Package,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import TopBar from '@/components/layout/TopBar';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ALL_PLATFORMS } from '@/config/platforms';
import { listProducts } from '@/services/products';
import { listPosts } from '@/services/posts';
import type { Post, Product } from '@/types/entities';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--success))',
];
const PLATFORMS = ALL_PLATFORMS;
const displayNumber = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;
const engagement = (post: Post) => (post.engagement_likes || 0) + (post.engagement_comments || 0) + (post.engagement_shares || 0);

export default function Reports() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState('30d');
  const [platformFilter, setPlatformFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [postData, productData] = await Promise.all([
        listPosts('-published_at', 300),
        listProducts('-created_date', 150),
      ]);
      setPosts(postData);
      setProducts(productData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const date = post.published_at || post.scheduled_at || post.created_at;
      const matchesPeriod = period === 'all' || (date && isAfter(new Date(date), subDays(new Date(), period === '7d' ? 7 : period === '90d' ? 90 : 30)));
      const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
      return matchesPeriod && matchesPlatform;
    });
  }, [period, platformFilter, posts]);

  const totals = useMemo(() => {
    const published = filteredPosts.filter((post) => post.status === 'published').length;
    const reach = filteredPosts.reduce((sum, post) => sum + (post.engagement_reach || 0), 0);
    const interactions = filteredPosts.reduce((sum, post) => sum + engagement(post), 0);
    const comments = filteredPosts.reduce((sum, post) => sum + (post.engagement_comments || 0), 0);
    return {
      publishRate: products.length ? Math.round((published / Math.max(products.length * 3, 1)) * 100) : 0,
      published,
      reach,
      interactions,
      comments,
      averageEngagement: filteredPosts.length ? Math.round(interactions / filteredPosts.length) : 0,
    };
  }, [filteredPosts, products.length]);

  const platformData = PLATFORMS.map((platform) => {
    const platformPosts = filteredPosts.filter((post) => post.platform === platform);
    return {
      name: platform,
      posts: platformPosts.length,
      reach: platformPosts.reduce((sum, post) => sum + (post.engagement_reach || 0), 0),
      engagement: platformPosts.reduce((sum, post) => sum + engagement(post), 0),
      comments: platformPosts.reduce((sum, post) => sum + (post.engagement_comments || 0), 0),
    };
  }).filter((item) => item.posts > 0);

  const categoryData = [...new Set(products.map((product) => product.category).filter(Boolean))].map((category) => {
    const categoryProducts = products.filter((product) => product.category === category);
    const categoryPosts = filteredPosts.filter((post) => categoryProducts.some((product) => product.id === post.product_id));
    return {
      name: category,
      produtos: categoryProducts.length,
      posts: categoryPosts.length,
      engagement: categoryPosts.reduce((sum, post) => sum + engagement(post), 0),
    };
  });

  const trendData = Array.from({ length: 7 }, (_, index) => {
    const day = subDays(new Date(), 6 - index);
    const dayPosts = filteredPosts.filter((post) => {
      const date = post.published_at || post.scheduled_at;
      return date && new Date(date).toDateString() === day.toDateString();
    });
    return {
      day: day.toLocaleDateString('pt-BR', { weekday: 'short' }),
      posts: dayPosts.length,
      reach: dayPosts.reduce((sum, post) => sum + (post.engagement_reach || 0), 0),
      engagement: dayPosts.reduce((sum, post) => sum + engagement(post), 0),
    };
  });

  const topProducts = products
    .map((product) => ({
      ...product,
      posts: filteredPosts.filter((post) => post.product_id === product.id).length,
      engagement: filteredPosts.filter((post) => post.product_id === product.id).reduce((sum, post) => sum + engagement(post), 0),
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 6);

  const insights = buildInsights(platformData, totals, filteredPosts);

  const exportCsv = () => {
    const csv = [
      ['plataforma', 'posts', 'alcance', 'engajamento', 'comentarios'],
      ...platformData.map((item) => [item.name, item.posts, item.reach, item.engagement, item.comments]),
    ].map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-plataformas.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <TopBar title="Relatórios" subtitle="Painel executivo de desempenho, operação e oportunidades" />
      <div className="space-y-6 p-4 sm:p-6">
        {error && <ErrorState onRetry={load} />}

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-syne text-lg font-bold text-foreground">Visão estratégica</h2>
            <p className="text-sm text-muted-foreground">Filtre por período e plataforma para entender performance real.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="7d">7 dias</SelectItem><SelectItem value="30d">30 dias</SelectItem><SelectItem value="90d">90 dias</SelectItem><SelectItem value="all">Tudo</SelectItem></SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas plataformas</SelectItem>{PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="Taxa publicação" value={`${totals.publishRate}%`} icon={Target} tone="primary" loading={loading} />
          <Metric label="Posts publicados" value={totals.published} icon={Zap} tone="success" loading={loading} />
          <Metric label="Alcance" value={displayNumber(totals.reach)} icon={Eye} loading={loading} />
          <Metric label="Engajamento" value={displayNumber(totals.interactions)} icon={Heart} tone="warning" loading={loading} />
          <Metric label="Comentários" value={displayNumber(totals.comments)} icon={MessageCircle} loading={loading} />
          <Metric label="Média/post" value={totals.averageEngagement} icon={TrendingUp} loading={loading} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={LineChartIcon} title="Tendência dos últimos dias" subtitle="Posts, alcance e engajamento por dia" />
              <div className="mt-5 h-[280px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="reach" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} /><stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="reach" stroke="hsl(var(--chart-1))" fill="url(#reach)" strokeWidth={2} name="Alcance" />
                    <Area type="monotone" dataKey="engagement" stroke="hsl(var(--chart-2))" fill="transparent" strokeWidth={2} name="Engajamento" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
                <SectionTitle icon={BarChart3} title="Comparação por plataforma" subtitle="Alcance, engajamento e comentários" />
                <div className="mt-5 h-[260px] min-w-[520px] overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="reach" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Alcance" />
                      <Bar dataKey="engagement" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Engajamento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <SectionTitle icon={Award} title="Distribuição de posts" subtitle="Participação por plataforma" />
                {platformData.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sem dados ainda</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={platformData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={3} dataKey="posts">
                        {platformData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend formatter={(value) => <span className="text-xs capitalize">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </section>
            </div>

            {categoryData.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5">
                <SectionTitle icon={Package} title="Desempenho por categoria" subtitle="Produtos, posts e engajamento" />
                <div className="mt-5 h-[260px] min-w-[620px] overflow-x-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="posts" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} name="Posts" />
                      <Bar dataKey="engagement" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} name="Engajamento" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Sparkles} title="Insights automáticos" subtitle="O que merece atenção agora" />
              <div className="mt-4 space-y-3">
                {insights.map((insight) => <Insight key={insight} text={insight} />)}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Award} title="Top produtos" subtitle="Ranking por engajamento" />
              <div className="mt-4 space-y-3">
                {topProducts.length === 0 ? <p className="text-sm text-muted-foreground">Sem produtos ranqueados.</p> : topProducts.map((product, index) => (
                  <div key={product.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-syne text-lg font-bold text-primary">#{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.posts} posts · {product.engagement} interações</p>
                      </div>
                    </div>
                    <Progress value={Math.min(product.engagement, 100)} className="mt-3" />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Target} title="Metas operacionais" subtitle="Saúde do funil de conteúdo" />
              <div className="mt-4 space-y-4">
                <Goal label="Publicação" value={totals.publishRate} target="80%" />
                <Goal label="Engajamento médio" value={Math.min(totals.averageEngagement, 100)} target="100/post" />
                <Goal label="Cobertura de produtos" value={Math.min(Math.round((filteredPosts.length / Math.max(products.length, 1)) * 100), 100)} target="100%" />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '12px',
  fontSize: '12px',
};

function Metric({ label, value, icon: Icon, tone = 'neutral', loading }: { label: string; value: string | number; icon: typeof Target; tone?: 'neutral' | 'primary' | 'success' | 'warning'; loading: boolean }) {
  const toneClass = { neutral: 'bg-muted text-muted-foreground', primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning' }[tone];
  return <div className="rounded-2xl border border-border bg-card p-4"><div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div><p className="truncate font-syne text-xl font-bold text-foreground sm:text-2xl">{loading ? '—' : value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Target; title: string; subtitle: string }) {
  return <div className="flex items-start gap-3"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div><div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>;
}

function Insight({ text }: { text: string }) {
  return <div className="flex gap-3 rounded-xl bg-muted/35 p-3 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />{text}</div>;
}

function Goal({ label, value, target }: { label: string; value: number; target: string }) {
  return <div><div className="mb-1 flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold text-foreground">{value}% / {target}</span></div><Progress value={Math.min(value, 100)} /></div>;
}

function buildInsights(platformData: Array<{ name: string; engagement: number; reach: number }>, totals: { published: number; averageEngagement: number }, posts: Post[]) {
  const insights: string[] = [];
  if (platformData.length) {
    const best = [...platformData].sort((a, b) => b.engagement - a.engagement)[0];
    insights.push(`${best.name} está liderando em engajamento acumulado.`);
  }
  if (totals.published === 0) insights.push('Ainda não há publicações no período selecionado.');
  if (totals.averageEngagement < 20 && totals.published > 0) insights.push('Engajamento médio baixo: teste CTAs mais diretos e horários diferentes.');
  if (posts.filter((post) => post.status === 'failed').length) insights.push('Existem publicações com falha que podem distorcer a análise operacional.');
  if (!insights.length) insights.push('Performance estável no período. Continue monitorando variações por plataforma.');
  return insights.slice(0, 4);
}
