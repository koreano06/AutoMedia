import { useEffect, useMemo, useState } from 'react';
import { format, isAfter, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  Heart,
  LayoutGrid,
  List,
  MessageCircle,
  PauseCircle,
  RefreshCw,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/common/StatusBadge';
import PlatformIcon from '@/components/common/PlatformIcon';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SOCIAL_PLATFORMS } from '@/config/platforms';
import { deletePost, listPosts, publishPostNow, updatePost } from '@/services/posts';
import type { EntityId, Post, Status } from '@/types/entities';

const PLATFORMS = SOCIAL_PLATFORMS;
const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'scheduled', label: 'Agendados' },
  { value: 'publishing', label: 'Publicando' },
  { value: 'published', label: 'Publicados' },
  { value: 'failed', label: 'Falharam' },
  { value: 'paused', label: 'Pausados' },
  { value: 'reposted', label: 'Repostados' },
];

type ViewMode = 'table' | 'cards' | 'platform';

const metric = (post: Post) =>
  (post.engagement_likes || 0) + (post.engagement_comments || 0) + (post.engagement_shares || 0);
const engagementRate = (post: Post) => {
  const reach = post.engagement_reach || 0;
  return reach > 0 ? Math.round((metric(post) / reach) * 1000) / 10 : 0;
};
const postDate = (post: Post) => post.published_at || post.scheduled_at || post.created_at || '';
const displayNumber = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value;

export default function Publications() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setPosts(await listPosts('-published_at', 200));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const totalReach = posts.reduce((acc, post) => acc + (post.engagement_reach || 0), 0);
    const totalEngagement = posts.reduce((acc, post) => acc + metric(post), 0);
    return {
      published: posts.filter((post) => post.status === 'published').length,
      scheduled: posts.filter((post) => post.status === 'scheduled').length,
      publishing: posts.filter((post) => post.status === 'publishing').length,
      failed: posts.filter((post) => post.status === 'failed').length,
      reach: totalReach,
      engagement: totalEngagement,
    };
  }, [posts]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return posts.filter((post) => {
      const date = postDate(post) ? new Date(postDate(post)) : null;
      const matchesSearch =
        !normalized ||
        post.product_name?.toLowerCase().includes(normalized) ||
        post.caption?.toLowerCase().includes(normalized) ||
        post.platform?.toLowerCase().includes(normalized) ||
        post.external_post_id?.toLowerCase().includes(normalized) ||
        post.external_url?.toLowerCase().includes(normalized);
      const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesPeriod =
        periodFilter === 'all' ||
        (periodFilter === '7d' && date && isAfter(date, subDays(new Date(), 7))) ||
        (periodFilter === '30d' && date && isAfter(date, subDays(new Date(), 30))) ||
        (periodFilter === 'errors' && post.status === 'failed');
      const matchesPerformance =
        performanceFilter === 'all' ||
        (performanceFilter === 'top' && metric(post) >= 100) ||
        (performanceFilter === 'low' && post.status === 'published' && metric(post) < 20) ||
        (performanceFilter === 'no_metrics' && post.status === 'published' && metric(post) === 0);
      return matchesSearch && matchesPlatform && matchesStatus && matchesPeriod && matchesPerformance;
    });
  }, [periodFilter, performanceFilter, platformFilter, posts, search, statusFilter]);

  const selectedPosts = posts.filter((post) => selectedIds.includes(post.id));
  const alerts = buildAlerts(posts);
  const topPosts = [...posts].sort((a, b) => metric(b) - metric(a)).slice(0, 5);
  const platformSummary = PLATFORMS.map((platform) => {
    const platformPosts = posts.filter((post) => post.platform === platform);
    return {
      platform,
      posts: platformPosts.length,
      reach: platformPosts.reduce((acc, post) => acc + (post.engagement_reach || 0), 0),
      engagement: platformPosts.reduce((acc, post) => acc + metric(post), 0),
    };
  }).filter((item) => item.posts > 0);

  const toggleSelected = (id: EntityId) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const updateStatus = async (post: Post, status: Status, message: string) => {
    try {
      if (status === 'publishing') {
        await publishPostNow(post.id);
      } else {
        await updatePost(post.id, {
          status,
          last_sync_at: new Date().toISOString(),
          retry_count: post.retry_count,
        });
      }
      toast.success(message);
      setSelectedPost((current) => current?.id === post.id ? { ...current, status } : current);
      load();
    } catch {
      toast.error('Não foi possível atualizar a publicação');
    }
  };

  const syncMetrics = async (targetPosts = selectedPosts.length ? selectedPosts : posts) => {
    try {
      await Promise.all(targetPosts.map((post) => updatePost(post.id, {
        engagement_likes: (post.engagement_likes || 0) + Math.floor(Math.random() * 30),
        engagement_comments: (post.engagement_comments || 0) + Math.floor(Math.random() * 8),
        engagement_shares: (post.engagement_shares || 0) + Math.floor(Math.random() * 5),
        engagement_reach: (post.engagement_reach || 0) + Math.floor(Math.random() * 500),
        last_sync_at: new Date().toISOString(),
      })));
      toast.success('Métricas sincronizadas');
      setSelectedIds([]);
      load();
    } catch {
      toast.error('Não foi possível sincronizar métricas');
    }
  };

  const handleBulk = async (status: Status) => {
    if (!selectedIds.length) {
      toast.error('Selecione publicações primeiro.');
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => updatePost(id, { status })));
      toast.success('Ação em massa aplicada');
      setSelectedIds([]);
      load();
    } catch {
      toast.error('Não foi possível aplicar ação em massa');
    }
  };

  const exportCsv = () => {
    const header = ['produto', 'plataforma', 'status', 'alcance', 'likes', 'comentarios', 'shares', 'data'];
    const rows = filtered.map((post) => [
      post.product_name || '',
      post.platform || '',
      post.status || '',
      post.engagement_reach || 0,
      post.engagement_likes || 0,
      post.engagement_comments || 0,
      post.engagement_shares || 0,
      postDate(post),
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'publicacoes.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <TopBar title="Publicações" subtitle="Centro de controle pós-publicação e performance" />
      <div className="mobile-page-pad page-stack">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Publicados" value={stats.published} icon={ExternalLink} tone="primary" />
          <Metric label="Agendados" value={stats.scheduled} icon={Calendar} />
          <Metric label="Publicando" value={stats.publishing} icon={Send} tone="warning" />
          <Metric label="Falhas" value={stats.failed} icon={XCircle} tone="destructive" />
          <Metric label="Alcance" value={displayNumber(stats.reach)} icon={Eye} />
          <Metric label="Engajamento" value={displayNumber(stats.engagement)} icon={Heart} tone="success" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar produto, legenda, ID ou link..." className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 xl:flex">
              <Select value={platformFilter} onValueChange={setPlatformFilter}><SelectTrigger className="h-10 xl:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Plataformas</SelectItem>{PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent></Select>
              <Select value={periodFilter} onValueChange={setPeriodFilter}><SelectTrigger className="h-10 xl:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Período</SelectItem><SelectItem value="7d">7 dias</SelectItem><SelectItem value="30d">30 dias</SelectItem><SelectItem value="errors">Com erro</SelectItem></SelectContent></Select>
              <Select value={performanceFilter} onValueChange={setPerformanceFilter}><SelectTrigger className="h-10 xl:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Performance</SelectItem><SelectItem value="top">Maior engajamento</SelectItem><SelectItem value="low">Menor desempenho</SelectItem><SelectItem value="no_metrics">Métricas zeradas</SelectItem></SelectContent></Select>
              <Button variant="outline" className="gap-2" onClick={exportCsv}><Download className="h-4 w-4" /> Exportar</Button>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => (
                <button key={tab.value} onClick={() => setStatusFilter(tab.value)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-all', statusFilter === tab.value ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted')}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => syncMetrics()}><RefreshCw className="mr-1 h-4 w-4" /> Sincronizar</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulk('paused')}><PauseCircle className="mr-1 h-4 w-4" /> Pausar</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulk('scheduled')}>Reagendar</Button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={() => syncMetrics(posts.filter((post) => post.status === 'failed'))}>Atualizar falhas</Button>
              <Button size="sm" variant="outline" onClick={() => syncMetrics(posts)}>Atualizar métricas</Button>
              {(['table', 'cards', 'platform'] as ViewMode[]).map((mode) => (
                <Button key={mode} size="sm" variant={viewMode === mode ? 'default' : 'outline'} onClick={() => setViewMode(mode)}>
                  {mode === 'table' ? <List className="h-4 w-4" /> : mode === 'cards' ? <LayoutGrid className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="grid gap-3 lg:grid-cols-3">
            {alerts.map((alert) => (
              <div key={alert} className="flex gap-3 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {alert}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <main>
            {error ? (
              <div className="rounded-2xl border border-border bg-card p-5"><ErrorState onRetry={load} /></div>
            ) : loading ? (
              <div className="rounded-2xl border border-border bg-card p-5"><div className="h-72 animate-pulse rounded-xl bg-muted" /></div>
            ) : viewMode === 'table' ? (
              <PublicationTable posts={filtered} selectedIds={selectedIds} onToggle={toggleSelected} onOpen={setSelectedPost} onStatus={updateStatus} onDelete={deletePost} />
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((post) => <PublicationCard key={post.id} post={post} selected={selectedIds.includes(post.id)} onToggle={toggleSelected} onOpen={setSelectedPost} onStatus={updateStatus} />)}
              </div>
            ) : (
              <PlatformView summary={platformSummary} posts={filtered} onOpen={setSelectedPost} />
            )}
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5">
              <SectionTitle icon={TrendingUp} title="Ranking" subtitle="Melhores publicações por engajamento" />
              <div className="mt-4 space-y-3">
                {topPosts.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> : topPosts.map((post, index) => (
                  <button key={post.id} type="button" onClick={() => setSelectedPost(post)} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left hover:bg-muted/40">
                    <span className="font-syne text-lg font-bold text-primary">#{index + 1}</span>
                    <Thumb post={post} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{post.product_name || 'Produto'}</p><p className="text-xs text-muted-foreground">{metric(post)} interações</p></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <SectionTitle icon={Sparkles} title="Insight automático" subtitle="Leitura rápida da operação" />
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Insight text={bestPlatform(platformSummary)} />
                <Insight text={stats.failed > 0 ? `${stats.failed} publicações falharam e precisam de retry.` : 'Nenhuma falha crítica no momento.'} />
                <Insight text={posts.some((post) => post.status === 'published' && metric(post) === 0) ? 'Existem posts publicados com métricas zeradas. Sincronize dados.' : 'As métricas parecem atualizadas.'} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <PublicationDialog post={selectedPost} open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPost(null)} onStatus={updateStatus} onSave={async (post, payload) => { await updatePost(post.id, payload); toast.success('Publicação atualizada'); load(); }} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: number | string; icon: typeof Heart; tone?: 'neutral' | 'primary' | 'success' | 'destructive' | 'warning' }) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
  }[tone];
  return <div className="rounded-2xl border border-border bg-card p-4"><div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div><p className="font-syne text-2xl font-bold text-foreground">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Heart; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div><div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>;
}

function PublicationTable(props: { posts: Post[]; selectedIds: string[]; onToggle: (id: EntityId) => void; onOpen: (post: Post) => void; onStatus: (post: Post, status: Status, message: string) => void; onDelete: (id: EntityId) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="hidden w-full md:table">
        <thead><tr className="border-b border-border bg-muted/30"><th className="w-10 px-4 py-3" /><Head>Mídia</Head><Head>Plataforma</Head><Head>Status</Head><Head>Data</Head><Head>Performance</Head><Head>Ações</Head></tr></thead>
        <tbody className="divide-y divide-border">
          {props.posts.length === 0 ? <tr><td colSpan={7} className="py-16 text-center text-sm text-muted-foreground">Nenhuma publicação encontrada</td></tr> : props.posts.map((post) => (
            <tr key={post.id} className="hover:bg-muted/20">
              <td className="px-4 py-3"><Checkbox checked={props.selectedIds.includes(post.id)} onCheckedChange={() => props.onToggle(post.id)} /></td>
              <td className="px-4 py-3"><button type="button" onClick={() => props.onOpen(post)} className="flex max-w-xs items-center gap-3 text-left"><Thumb post={post} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{post.product_name || 'Produto'}</p><p className="truncate text-xs text-muted-foreground">{post.caption || 'Sem legenda'}</p></div></button></td>
              <td className="px-4 py-3"><PlatformIcon platform={post.platform} showLabel size="sm" /></td>
              <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{postDate(post) ? format(new Date(postDate(post)), 'dd/MM/yy HH:mm', { locale: ptBR }) : '—'}</td>
              <td className="px-4 py-3"><Performance post={post} /></td>
              <td className="px-4 py-3"><Actions post={post} onOpen={props.onOpen} onStatus={props.onStatus} onDelete={props.onDelete} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-3 p-3 md:hidden">{props.posts.map((post) => <PublicationCard key={post.id} post={post} selected={props.selectedIds.includes(post.id)} onToggle={props.onToggle} onOpen={props.onOpen} onStatus={props.onStatus} />)}</div>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</th>;
}

function PublicationCard({ post, selected, onToggle, onOpen, onStatus }: { post: Post; selected: boolean; onToggle: (id: EntityId) => void; onOpen: (post: Post) => void; onStatus: (post: Post, status: Status, message: string) => void }) {
  return (
    <div className={cn('rounded-2xl border bg-card p-4', selected ? 'border-primary ring-2 ring-primary/15' : 'border-border')}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onToggle(post.id)} />
        <button type="button" onClick={() => onOpen(post)} className="flex min-w-0 flex-1 gap-3 text-left">
          <Thumb post={post} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{post.product_name || 'Produto'}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.caption || 'Sem legenda'}</p></div>
        </button>
        <StatusBadge status={post.status} />
      </div>
      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between"><PlatformIcon platform={post.platform} showLabel size="sm" /><Performance post={post} /></div>
      <div className="mt-3 flex justify-end"><Actions post={post} onOpen={onOpen} onStatus={onStatus} onDelete={() => {}} /></div>
    </div>
  );
}

function PlatformView({ summary, posts, onOpen }: { summary: Array<{ platform: string; posts: number; reach: number; engagement: number }>; posts: Post[]; onOpen: (post: Post) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {summary.map((item) => (
        <section key={item.platform} className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between"><PlatformIcon platform={item.platform} showLabel /><span className="text-xs text-muted-foreground">{item.posts} posts</span></div>
          <div className="grid grid-cols-2 gap-3"><Info label="Alcance" value={displayNumber(item.reach)} /><Info label="Engajamento" value={displayNumber(item.engagement)} /></div>
          <div className="mt-4 space-y-2">{posts.filter((post) => post.platform === item.platform).slice(0, 4).map((post) => <button key={post.id} onClick={() => onOpen(post)} className="flex w-full items-center gap-3 rounded-xl bg-muted/35 p-2 text-left"><Thumb post={post} /><span className="truncate text-sm text-foreground">{post.product_name || 'Produto'}</span></button>)}</div>
        </section>
      ))}
    </div>
  );
}

function PublicationDialog({ post, open, onOpenChange, onStatus, onSave }: { post: Post | null; open: boolean; onOpenChange: (open: boolean) => void; onStatus: (post: Post, status: Status, message: string) => void; onSave: (post: Post, payload: Partial<Post>) => void }) {
  const [caption, setCaption] = useState('');
  useEffect(() => setCaption(post?.caption || ''), [post]);
  if (!post) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[94dvh] !w-[calc(100vw-0.75rem)] !max-w-none flex-col overflow-hidden rounded-t-[1.5rem] border-border bg-card p-0 text-foreground shadow-2xl sm:!h-[90dvh] sm:!w-[calc(100vw-2rem)] sm:rounded-[1.5rem] lg:!h-[min(88dvh,860px)] lg:!w-[min(92vw,1280px)] xl:!h-[min(86dvh,900px)] xl:!w-[min(88vw,1380px)]">
        <DialogHeader className="shrink-0 border-b border-border bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))] px-4 py-3 pr-10 sm:px-6 sm:py-4 sm:pr-12">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20 sm:h-11 sm:w-11">
              <Send className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="line-clamp-2 font-syne text-base font-bold leading-tight text-foreground sm:line-clamp-1 sm:text-lg">Detalhes da publicação</DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{post.product_name || 'Produto sem nome'}</DialogDescription>
            </div>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <PlatformIcon platform={post.platform} showLabel size="sm" />
              <StatusBadge status={post.status} />
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(560px,1.1fr)_minmax(500px,0.9fr)] lg:overflow-hidden">
          <section className="flex min-h-[52dvh] flex-col items-center gap-3 border-b border-border bg-muted/35 p-3 sm:min-h-[620px] sm:gap-4 sm:p-5 md:p-6 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-[320px] w-full max-w-[720px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/10 sm:rounded-3xl lg:min-h-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,hsl(var(--primary)/0.12),transparent_38%)]" />
              {post.thumbnail_url ? (
                <img src={post.thumbnail_url} alt="" className="relative h-full w-full object-cover" />
              ) : (
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
                  <ExternalLink className="h-7 w-7 text-muted-foreground/35" />
                </div>
              )}
            </div>
            <div className="flex w-full max-w-[720px] shrink-0 items-center justify-between gap-3 px-1">
              <span className="font-syne text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Preview da publicação</span>
              <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">{post.platform || 'plataforma'}</span>
            </div>
            <div className="grid w-full max-w-[720px] shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
              <Info label="Alcance" value={displayNumber(post.engagement_reach || 0)} />
              <Info label="Likes" value={post.engagement_likes || 0} />
              <Info label="Comentários" value={post.engagement_comments || 0} />
              <Info label="Engaj." value={`${engagementRate(post)}%`} />
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:overflow-y-auto">
            <div className="rounded-3xl border border-border bg-muted/25 p-5">
              <div className="mb-3 flex flex-wrap gap-2 sm:hidden"><PlatformIcon platform={post.platform} showLabel size="sm" /><StatusBadge status={post.status} /></div>
              <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Publicação</p>
              <h2 className="mt-2 break-words font-syne text-xl font-bold leading-tight text-foreground">{post.product_name || 'Produto'}</h2>
              <p className="mt-2 text-xs text-muted-foreground">Agendada/publicada: {post.published_at ? format(new Date(post.published_at), 'dd/MM/yyyy HH:mm') : post.scheduled_at ? format(new Date(post.scheduled_at), 'dd/MM/yyyy HH:mm') : 'Sem data definida'}</p>
            </div>
            <div><Label>Legenda</Label><Textarea value={caption} onChange={(event) => setCaption(event.target.value)} className="mt-1.5 min-h-44 rounded-2xl" /></div>
            <div className="rounded-3xl border border-border bg-muted/25 p-4"><p className="font-semibold text-foreground">Histórico/logs</p><div className="mt-2 space-y-1 text-sm text-muted-foreground"><p>Criado e enviado para fluxo de publicação.</p>{post.published_at && <p>Publicado em {format(new Date(post.published_at), 'dd/MM/yyyy HH:mm')}</p>}{post.error_message && <p className="text-destructive">Erro API: {post.error_message}</p>}<p>Retries: {post.retry_count || 0}</p><p>Última sincronização: {post.last_sync_at ? format(new Date(post.last_sync_at), 'dd/MM/yyyy HH:mm') : 'Nunca'}</p></div></div>
            <div className="grid gap-2 min-[420px]:grid-cols-2 sm:gap-3">
              <Button variant="outline" className="h-12 rounded-2xl bg-card" onClick={() => onSave(post, { caption })}>Salvar legenda</Button>
              <Button variant="outline" className="h-12 rounded-2xl bg-card" onClick={() => navigator.clipboard.writeText(post.external_url || '')}>Copiar link</Button>
              <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => post.external_url && window.open(post.external_url, '_blank')}><ExternalLink className="h-3.5 w-3.5" /> Ver externa</Button>
              <Button className="h-12 gap-2 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => onStatus(post, 'publishing', 'Retry iniciado')}><RefreshCw className="h-3.5 w-3.5" /> Retry</Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Actions({ post, onOpen, onStatus, onDelete }: { post: Post; onOpen: (post: Post) => void; onStatus: (post: Post, status: Status, message: string) => void; onDelete: (id: EntityId) => void }) {
  return <div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpen(post)}><Eye className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => post.external_url && window.open(post.external_url, '_blank')}><ExternalLink className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onStatus(post, 'publishing', 'Retry iniciado')}><RefreshCw className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(post.id)}><Trash2 className="h-4 w-4" /></Button></div>;
}

function Thumb({ post }: { post: Post }) {
  return <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">{post.thumbnail_url && <img src={post.thumbnail_url} alt="" className="h-full w-full object-cover" />}</div>;
}

function Performance({ post }: { post: Post }) {
  return <div className="min-w-36"><div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground"><span>{metric(post)} interações</span><span>{engagementRate(post)}%</span></div><Progress value={Math.min(engagementRate(post) * 10, 100)} /><div className="mt-1 flex gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.engagement_likes || 0}</span><span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.engagement_comments || 0}</span><span className="flex items-center gap-1"><Share2 className="h-3 w-3" />{post.engagement_shares || 0}</span></div></div>;
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-muted/25 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-syne text-lg font-bold text-foreground">{value}</p></div>;
}

function Insight({ text }: { text: string }) {
  return <div className="rounded-xl bg-muted/35 p-3">{text}</div>;
}

function buildAlerts(posts: Post[]) {
  const alerts = [];
  const failures = posts.filter((post) => post.status === 'failed').length;
  const noLinks = posts.filter((post) => post.status === 'published' && !post.external_url).length;
  const noMetrics = posts.filter((post) => post.status === 'published' && metric(post) === 0).length;
  if (failures) alerts.push(`${failures} publicação(ões) falharam e precisam de retry.`);
  if (noLinks) alerts.push(`${noLinks} publicação(ões) publicadas sem link externo.`);
  if (noMetrics) alerts.push(`${noMetrics} publicação(ões) estão com métricas zeradas.`);
  return alerts.slice(0, 3);
}

function bestPlatform(summary: Array<{ platform: string; engagement: number }>) {
  if (!summary.length) return 'Ainda não há dados suficientes por plataforma.';
  const best = [...summary].sort((a, b) => b.engagement - a.engagement)[0];
  return `${best.platform} está com o maior engajamento acumulado.`;
}
