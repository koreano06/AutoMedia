import { useEffect, useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  CalendarClock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  ListChecks,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  Shuffle,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import Can from '@/components/auth/Can';
import PlatformIcon from '@/components/common/PlatformIcon';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import { CockpitPanel, CreativeJourney, FlowGuide, QualityTrafficLight } from '@/components/creative/CreativeVisualKit';
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
import { createPost, deletePost as deletePostById, listPosts, publishDuePosts, publishPostNow, updatePost } from '@/services/posts';
import { filterMediaAssets } from '@/services/mediaAssets';
import type { EntityId, MediaAsset, Post, Status } from '@/types/entities';

const PLATFORMS = SOCIAL_PLATFORMS;
const statusOptions = ['all', 'scheduled', 'published', 'failed', 'paused', 'draft'];
const timeSlots = ['08:00', '10:30', '12:30', '14:30', '16:30', '19:00', '21:00'];

type ViewMode = 'week' | 'month' | 'day';
type DraftSettings = {
  start: string;
  end: string;
  minInterval: string;
  maxPerDay: string;
  activeDays: number[];
};

const defaultSettings: DraftSettings = {
  start: '08:00',
  end: '22:00',
  minInterval: '90',
  maxPerDay: '6',
  activeDays: [1, 2, 3, 4, 5, 6],
};

const postDate = (post: Post) => post.scheduled_at ? new Date(post.scheduled_at) : null;
const postTime = (post: Post) => post.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '--:--';
const getPreview = (post: Post) => post.thumbnail_url || '';

export default function Schedule() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [readyAssets, setReadyAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rangeFilter, setRangeFilter] = useState('week');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [postData, approvedAssets] = await Promise.all([
        listPosts('-scheduled_at', 200),
        filterMediaAssets({ status: 'approved' }, '-created_date', 40),
      ]);
      setPosts(postData);
      setReadyAssets(approvedAssets.filter((asset) => !postData.some((post) => post.media_asset_id === asset.id)));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: addDays(startOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }), 6),
  });

  const filteredPosts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return posts.filter((post) => {
      const date = postDate(post);
      const matchesSearch = !normalized || post.product_name?.toLowerCase().includes(normalized) || post.caption?.toLowerCase().includes(normalized);
      const matchesPlatform = platformFilter === 'all' || post.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
      const matchesRange =
        rangeFilter === 'all' ||
        (rangeFilter === 'today' && date && isSameDay(date, new Date())) ||
        (rangeFilter === 'week' && date && weekDays.some((day) => isSameDay(day, date))) ||
        (rangeFilter === 'month' && date && isSameMonth(date, currentDate));
      return matchesSearch && matchesPlatform && matchesStatus && matchesRange;
    });
  }, [currentDate, platformFilter, posts, rangeFilter, search, statusFilter, weekDays]);

  const selectedDayPosts = filteredPosts
    .filter((post) => post.scheduled_at && isSameDay(new Date(post.scheduled_at), selectedDay))
    .sort((a, b) => postTime(a).localeCompare(postTime(b)));

  const stats = {
    today: posts.filter((post) => post.status === 'scheduled' && post.scheduled_at && isSameDay(new Date(post.scheduled_at), new Date())).length,
    week: posts.filter((post) => post.status === 'scheduled' && post.scheduled_at && weekDays.some((day) => isSameDay(day, new Date(post.scheduled_at!)))).length,
    published: posts.filter((post) => post.status === 'published').length,
    failed: posts.filter((post) => post.status === 'failed').length,
  };

  const alerts = useMemo(() => buildAlerts(posts, settings), [posts, settings]);
  const naturalityScore = Math.max(35, 100 - alerts.length * 12);
  const dayDistribution = useMemo(() => {
    const scheduled = posts.filter((post) => post.status === 'scheduled' && post.scheduled_at);
    const buckets = [
      { label: 'Manhã', range: '08h-12h', count: 0 },
      { label: 'Tarde', range: '12h-18h', count: 0 },
      { label: 'Noite', range: '18h-22h', count: 0 },
    ];

    scheduled.forEach((post) => {
      const hour = new Date(post.scheduled_at!).getHours();
      if (hour < 12) buckets[0].count += 1;
      else if (hour < 18) buckets[1].count += 1;
      else buckets[2].count += 1;
    });

    const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
    return buckets.map((bucket) => ({ ...bucket, percent: Math.round((bucket.count / max) * 100) }));
  }, [posts]);
  const platformPipeline = useMemo(() => {
    return PLATFORMS.map((platform) => {
      const platformPosts = posts.filter((post) => post.platform === platform);
      return {
        platform,
        scheduled: platformPosts.filter((post) => post.status === 'scheduled').length,
        published: platformPosts.filter((post) => post.status === 'published').length,
        failed: platformPosts.filter((post) => post.status === 'failed').length,
      };
    }).filter((item) => item.scheduled || item.published || item.failed).slice(0, 5);
  }, [posts]);
  const scheduleStages = [
    { id: 'ready', label: 'Aprovado', description: `${readyAssets.length} criativo(s) prontos`, icon: CheckCircle, status: readyAssets.length ? 'active' as const : 'waiting' as const },
    { id: 'calendar', label: 'Calendário', description: `${stats.week} post(s) na semana`, icon: Calendar, status: stats.week ? 'active' as const : 'waiting' as const },
    { id: 'random', label: 'Naturalidade', description: `${naturalityScore}% de equilíbrio`, icon: Shuffle, status: naturalityScore >= 75 ? 'done' as const : 'active' as const },
    { id: 'publish', label: 'Disparo', description: `${stats.published} publicado(s)`, icon: Send, status: stats.published ? 'done' as const : 'waiting' as const },
    { id: 'learn', label: 'Ajuste', description: `${alerts.length} alerta(s)`, icon: AlertTriangle, status: alerts.length ? 'blocked' as const : 'done' as const },
  ];
  const cockpitItems = [
    { label: 'Posts na semana', value: stats.week, hint: 'Volume previsto para os próximos dias.', tone: 'primary' as const, icon: Calendar },
    { label: 'Naturalidade', value: `${naturalityScore}%`, hint: alerts.length ? 'Revise alertas antes de escalar.' : 'Distribuição saudável.', tone: naturalityScore >= 75 ? 'success' as const : 'warning' as const, icon: Shuffle },
    { label: 'Falhas', value: stats.failed, hint: 'Publicações que precisam de nova tentativa.', tone: stats.failed ? 'danger' as const : 'success' as const, icon: XCircle },
    { label: 'Prontos sem agenda', value: readyAssets.length, hint: 'Conteúdos aprovados aguardando horário.', tone: readyAssets.length ? 'warning' as const : 'muted' as const, icon: PlayCircle },
  ];

  const updateSelectedPost = async (payload: Partial<Post>) => {
    if (!selectedPost) return;
    try {
      await updatePost(selectedPost.id, payload);
      toast.success('Post atualizado');
      setSelectedPost({ ...selectedPost, ...payload });
      load();
    } catch {
      toast.error('Não foi possível atualizar o post');
    }
  };

  const toggleSelected = (id: EntityId) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const publishNow = async (post: Post) => {
    try {
      await publishPostNow(post.id);
      toast.success('Publicado agora!');
      load();
    } catch {
      toast.error('Não foi possível publicar agora');
    }
  };

  const deletePost = async (id: EntityId) => {
    try {
      await deletePostById(id);
      toast.success('Post removido');
      if (selectedPost?.id === id) setSelectedPost(null);
      load();
    } catch {
      toast.error('Não foi possível remover o post');
    }
  };

  const handleBulk = async (status: Status) => {
    if (selectedIds.length === 0) {
      toast.error('Selecione posts primeiro.');
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

  const processDuePosts = async () => {
    try {
      const result = await publishDuePosts(25);
      if (result.total === 0) {
        toast.success('Nenhum post vencido para publicar agora.');
      } else {
        toast.success(`${result.published || 0} disparo(s) processado(s), ${result.failed || 0} falha(s).`);
      }
      load();
    } catch {
      toast.error('Não foi possível processar os posts agendados.');
    }
  };

  const smartSchedule = async () => {
    const candidates = readyAssets.slice(0, Number(settings.maxPerDay || 6));
    if (candidates.length === 0) {
      toast.error('Nenhum conteúdo aprovado pronto para agendar.');
      return;
    }

    try {
      await Promise.all(candidates.map((asset, index) => {
        const scheduledAt = buildSmartDate(selectedDay, settings, index);
        return createPost({
          product_id: asset.product_id,
          product_name: asset.product_name,
          media_asset_id: asset.id,
          platform: asset.platforms?.[0] || 'instagram',
          caption: asset.caption || `Conheça ${asset.product_name || 'este produto'}`,
          status: 'scheduled',
          scheduled_at: scheduledAt.toISOString(),
          thumbnail_url: asset.thumbnail_url || asset.url,
          campaign_name: campaignName || undefined,
        });
      }));
      toast.success('Agenda inteligente criada');
      load();
    } catch {
      toast.error('Não foi possível criar a agenda inteligente');
    }
  };

  const scheduleAsset = async (asset: MediaAsset) => {
    try {
      await createPost({
        product_id: asset.product_id,
        product_name: asset.product_name,
        media_asset_id: asset.id,
        platform: asset.platforms?.[0] || 'instagram',
        caption: asset.caption || `Confira ${asset.product_name || 'este produto'}`,
        status: 'scheduled',
        scheduled_at: buildSmartDate(selectedDay, settings, selectedDayPosts.length).toISOString(),
        thumbnail_url: asset.thumbnail_url || asset.url,
        campaign_name: campaignName || undefined,
      });
      toast.success('Conteúdo agendado');
      load();
    } catch {
      toast.error('Não foi possível agendar conteúdo');
    }
  };

  return (
    <div>
      <TopBar title="Agendamento" subtitle="Calendário editorial automático e controle de publicações" />
      <div className="mobile-page-pad page-stack">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Hoje" value={stats.today} icon={CalendarClock} tone="primary" />
          <Metric label="Semana" value={stats.week} icon={Calendar} />
          <Metric label="Publicados" value={stats.published} icon={CheckCircle} tone="success" />
          <Metric label="Falhas" value={stats.failed} icon={XCircle} tone="destructive" />
          <Metric label="Naturalidade" value={`${naturalityScore}%`} icon={Shuffle} tone={naturalityScore >= 75 ? 'success' : 'warning'} />
        </div>

        {!loading && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-5">
              <CreativeJourney stages={scheduleStages} compact />
              <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Mapa de disparo</p>
                    <h3 className="mt-1 font-syne text-lg font-bold text-foreground">Plataformas na agenda</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{platformPipeline.length || 0} canal(is) ativos</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(platformPipeline.length ? platformPipeline : [{ platform: 'instagram', scheduled: 0, published: 0, failed: 0 }]).map((item) => (
                    <div key={item.platform} className="rounded-2xl border border-border bg-muted/20 p-3">
                      <div className="flex items-center gap-3">
                        <PlatformIcon platform={item.platform} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold capitalize text-foreground">{item.platform}</p>
                          <p className="text-xs text-muted-foreground">{item.scheduled} agendado(s)</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-background/70 p-2">
                          <p className="font-syne text-sm font-bold text-foreground">{item.scheduled}</p>
                          <p className="text-[9px] text-muted-foreground">Fila</p>
                        </div>
                        <div className="rounded-xl bg-background/70 p-2">
                          <p className="font-syne text-sm font-bold text-success">{item.published}</p>
                          <p className="text-[9px] text-muted-foreground">Pub.</p>
                        </div>
                        <div className="rounded-xl bg-background/70 p-2">
                          <p className="font-syne text-sm font-bold text-destructive">{item.failed}</p>
                          <p className="text-[9px] text-muted-foreground">Erro</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="space-y-5">
              <QualityTrafficLight score={naturalityScore} label="Semáforo da agenda" />
              <CockpitPanel items={cockpitItems} />
            </div>
          </div>
        )}

        {!loading && (
          <FlowGuide
            title="Agendar sem parecer robô"
            items={[
              { label: 'Distribua horários', description: 'Espalhe posts entre manhã, tarde e noite para manter naturalidade.', icon: Shuffle },
              { label: 'Revise alertas', description: 'Corrija posts muito próximos, repetição de plataforma ou falta de mídia.', icon: AlertTriangle },
              { label: 'Publique com controle', description: 'Processe vencidos e acompanhe falhas antes de escalar volume.', icon: Send },
            ]}
          />
        )}

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <SectionTitle icon={Clock} title="Distribuição visual da agenda" subtitle="Equilibre horários para evitar disparos com cara de automação" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {dayDistribution.map((bucket) => (
              <div key={bucket.label} className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="font-syne text-sm font-bold text-foreground">{bucket.label}</p>
                    <p className="text-xs text-muted-foreground">{bucket.range}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{bucket.count} posts</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${bucket.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full xl:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Buscar produto ou legenda..." className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex">
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="h-10 xl:w-40"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Plataformas</SelectItem>{PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-10 xl:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{statusOptions.map((status) => <SelectItem key={status} value={status}>{status === 'all' ? 'Status' : status}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={rangeFilter} onValueChange={setRangeFilter}>
                    <SelectTrigger className="h-10 xl:w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="week">Semana</SelectItem><SelectItem value="month">Mês</SelectItem><SelectItem value="all">Tudo</SelectItem></SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-2" onClick={() => setSimulationOpen(true)}><Sparkles className="h-4 w-4" /> Simular</Button>
                  <Can permission="post:publish">
                    <Button className="gap-2" onClick={processDuePosts}><Send className="h-4 w-4" /> Processar vencidos</Button>
                  </Can>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" /> {filteredPosts.length} posts
                  {selectedIds.length > 0 && <span className="font-medium text-primary">{selectedIds.length} selecionados</span>}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:flex md:flex-wrap">
                  {selectedIds.length > 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleBulk('paused')}><PauseCircle className="mr-1 h-4 w-4" /> Pausar</Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulk('scheduled')}><RefreshCw className="mr-1 h-4 w-4" /> Reagendar</Button>
                      <Can permission="post:publish">
                        <Button size="sm" variant="outline" onClick={() => handleBulk('published')}><Send className="mr-1 h-4 w-4" /> Publicar</Button>
                      </Can>
                    </>
                  )}
                  {(['week', 'month', 'day'] as ViewMode[]).map((mode) => (
                    <Button key={mode} size="sm" variant={viewMode === mode ? 'default' : 'outline'} onClick={() => setViewMode(mode)}>
                      {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Dia'}
                    </Button>
                  ))}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'month' ? -30 : -7))}><ChevronLeft className="h-4 w-4" /></Button>
                  <h3 className="min-w-0 flex-1 text-center font-syne text-sm font-bold text-foreground sm:text-left">
                    {viewMode === 'month'
                      ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
                      : `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} - ${format(addDays(weekStart, 6), "dd 'de' MMM, yyyy", { locale: ptBR })}`}
                  </h3>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'month' ? 30 : 7))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>Hoje</Button>
              </div>
              {error ? (
                <div className="p-5"><ErrorState onRetry={load} /></div>
              ) : loading ? (
                <div className="grid grid-cols-7 gap-px bg-border"><div className="col-span-7 h-72 animate-pulse bg-muted" /></div>
              ) : viewMode === 'day' ? (
                <DayTimeline posts={selectedDayPosts} selectedIds={selectedIds} onToggle={toggleSelected} onOpen={setSelectedPost} onPublish={publishNow} onDelete={deletePost} />
              ) : (
                <CalendarGrid
                  days={viewMode === 'month' ? monthDays : weekDays}
                  posts={filteredPosts}
                  currentDate={currentDate}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  onOpen={setSelectedPost}
                  compact={viewMode === 'month'}
                />
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={ListChecks} title="Alertas e naturalidade" subtitle="Problemas que podem deixar a agenda robótica ou arriscada" />
              <div className="mt-4">
                <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-foreground">Score de naturalidade</span><span className="font-bold text-primary">{naturalityScore}%</span></div>
                <Progress value={naturalityScore} />
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {alerts.length === 0 ? (
                  <div className="rounded-xl bg-success/10 p-3 text-sm text-success">Agenda equilibrada. Sem conflitos críticos.</div>
                ) : alerts.map((alert) => (
                  <div key={alert} className="flex gap-3 rounded-xl bg-warning/10 p-3 text-sm text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {alert}
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4"><h3 className="font-syne font-bold text-foreground">Posts operacionais</h3></div>
              <div className="divide-y divide-border">
                {filteredPosts.length === 0 ? (
                  <div className="p-10 text-center"><Calendar className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">Nenhum post encontrado</p></div>
                ) : filteredPosts.map((post) => (
                  <PostRow key={post.id} post={post} selected={selectedIds.includes(post.id)} onToggle={toggleSelected} onOpen={setSelectedPost} onPublish={publishNow} onDelete={deletePost} />
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Wand2} title="Agendamento inteligente" subtitle="Distribui conteúdos aprovados com naturalidade" />
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Início" value={settings.start} onChange={(value) => setSettings({ ...settings, start: value })} type="time" />
                <Field label="Fim" value={settings.end} onChange={(value) => setSettings({ ...settings, end: value })} type="time" />
                <Field label="Intervalo min." value={settings.minInterval} onChange={(value) => setSettings({ ...settings, minInterval: value })} />
                <Field label="Máx/dia" value={settings.maxPerDay} onChange={(value) => setSettings({ ...settings, maxPerDay: value })} />
              </div>
              <div className="mt-3">
                <Label>Campanha</Label>
                <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="ex: Lançamento de produto" className="mt-1.5" />
              </div>
              <Button className="mt-4 w-full gap-2" onClick={smartSchedule}><Shuffle className="h-4 w-4" /> Distribuir automaticamente</Button>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={PlayCircle} title="Pronto para agendar" subtitle="Conteúdos aprovados ainda sem horário" />
              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {readyAssets.length === 0 ? (
                  <p className="rounded-xl bg-muted/35 p-4 text-sm text-muted-foreground">Nenhum conteúdo aprovado pendente.</p>
                ) : readyAssets.map((asset) => (
                  <div key={asset.id} className="rounded-xl border border-border p-3">
                    <div className="flex gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-muted">
                        {asset.thumbnail_url || asset.url ? <img src={asset.thumbnail_url || asset.url} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{asset.title || asset.product_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{asset.product_name || 'Sem produto'}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="mt-3 w-full gap-2" onClick={() => scheduleAsset(asset)}><CalendarClock className="h-4 w-4" /> Agendar no dia selecionado</Button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Sparkles} title="Resumo estratégico" subtitle="Insights rápidos da agenda" />
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Insight text={stats.week > 0 ? `Você tem ${stats.week} posts agendados nesta semana.` : 'A semana ainda está vazia. Use a fila pronta para agendar.'} />
                <Insight text={alerts.length > 0 ? 'Há pontos de atenção antes de publicar em escala.' : 'A distribuição atual parece natural.'} />
                <Insight text="Melhor janela sugerida: 19h a 21h para conteúdo de venda." />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <PostDialog post={selectedPost} open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPost(null)} onSave={updateSelectedPost} onDelete={deletePost} onPublish={publishNow} />
      <SimulationDialog open={simulationOpen} onOpenChange={setSimulationOpen} posts={posts} readyAssets={readyAssets} settings={settings} />
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: number | string; icon: typeof Calendar; tone?: 'neutral' | 'primary' | 'success' | 'destructive' | 'warning' }) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
  }[tone];
  return <div className="rounded-2xl border border-border bg-card p-4"><div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div><p className="font-syne text-xl font-bold text-foreground sm:text-2xl">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Calendar; title: string; subtitle: string }) {
  return <div className="flex items-start gap-3"><div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div><div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>;
}

function CalendarGrid({ days, posts, currentDate, selectedDay, onSelectDay, onOpen, compact }: { days: Date[]; posts: Post[]; currentDate: Date; selectedDay: Date; onSelectDay: (day: Date) => void; onOpen: (post: Post) => void; compact?: boolean }) {
  const selectedPosts = posts
    .filter((post) => post.scheduled_at && isSameDay(new Date(post.scheduled_at), selectedDay))
    .sort((a, b) => postTime(a).localeCompare(postTime(b)));

  return (
    <>
    <div className="md:hidden">
      <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-border p-3">
        {days.map((day) => {
          const dayPosts = posts.filter((post) => post.scheduled_at && isSameDay(new Date(post.scheduled_at), day));
          const isSelected = isSameDay(day, selectedDay);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex min-w-[4.25rem] flex-col items-center rounded-2xl border px-3 py-2 text-center transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : isToday
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-foreground",
                !isSameMonth(day, currentDate) && compact && "opacity-50",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{format(day, 'EEE', { locale: ptBR })}</span>
              <span className="font-syne text-lg font-bold leading-tight">{format(day, 'dd')}</span>
              <span className={cn("mt-1 h-1.5 w-1.5 rounded-full", dayPosts.length > 0 ? "bg-current" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/35 px-3 py-2">
          <div>
            <p className="font-syne text-sm font-bold text-foreground">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</p>
            <p className="text-xs text-muted-foreground">{selectedPosts.length} post(s) nesse dia</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onSelectDay(new Date())}>Hoje</Button>
        </div>

        {selectedPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">Nenhum post neste dia</p>
            <p className="mt-1 text-xs text-muted-foreground">Escolha conteúdos aprovados na lateral para criar a agenda.</p>
          </div>
        ) : (
          selectedPosts.map((post) => <MobileCalendarPost key={post.id} post={post} onOpen={onOpen} />)
        )}
      </div>
    </div>

    <div className="hidden overflow-x-auto md:block">
      <div className="grid min-w-[840px] grid-cols-7 divide-x divide-border">
        {days.map((day) => {
          const dayPosts = posts.filter((post) => post.scheduled_at && isSameDay(new Date(post.scheduled_at), day));
          return (
            <div key={day.toISOString()} className={cn('min-h-40', !isSameMonth(day, currentDate) && compact && 'opacity-45')}>
              <button type="button" onClick={() => onSelectDay(day)} className={cn('w-full border-b border-border px-3 py-2 text-center', isSameDay(day, selectedDay) ? 'bg-primary/10' : isSameDay(day, new Date()) ? 'bg-primary/5' : 'bg-muted/20')}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(day, 'EEE', { locale: ptBR })}</p>
                <p className={cn('mt-0.5 text-sm font-bold', isSameDay(day, selectedDay) ? 'text-primary' : 'text-foreground')}>{format(day, 'dd')}</p>
              </button>
              <div className="space-y-1.5 p-1.5">
                {dayPosts.slice(0, compact ? 2 : 5).map((post) => <CalendarPost key={post.id} post={post} onOpen={onOpen} />)}
                {dayPosts.length > (compact ? 2 : 5) && <p className="py-1 text-center text-[10px] text-muted-foreground">+{dayPosts.length - (compact ? 2 : 5)} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}

function MobileCalendarPost({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      className="flex w-full gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm shadow-black/[0.02]"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Clock className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{postTime(post)}</span>
          <PlatformIcon platform={post.platform} showLabel size="sm" />
          <StatusBadge status={post.status} />
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-foreground">{post.product_name || 'Produto'}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.caption || 'Sem legenda'}</p>
      </div>
    </button>
  );
}

function CalendarPost({ post, onOpen }: { post: Post; onOpen: (post: Post) => void }) {
  return (
    <button type="button" onClick={() => onOpen(post)} className={cn('flex w-full items-center gap-1 rounded-lg p-1.5 text-left text-[10px] font-medium transition-opacity hover:opacity-80', post.status === 'published' ? 'bg-success/10 text-success' : post.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary')}>
      <span>{postTime(post)}</span>
      <PlatformIcon platform={post.platform} size="sm" className="scale-75 origin-left" />
      <span className="truncate">{post.product_name || post.platform}</span>
    </button>
  );
}

function DayTimeline({ posts, selectedIds, onToggle, onOpen, onPublish, onDelete }: { posts: Post[]; selectedIds: string[]; onToggle: (id: EntityId) => void; onOpen: (post: Post) => void; onPublish: (post: Post) => void; onDelete: (id: EntityId) => void }) {
  return (
    <div className="divide-y divide-border">
      {timeSlots.map((slot) => {
        const slotPosts = posts.filter((post) => postTime(post).slice(0, 2) === slot.slice(0, 2));
        return (
          <div key={slot} className="grid grid-cols-[56px_1fr] gap-3 p-3 sm:grid-cols-[80px_1fr] sm:gap-4 sm:p-4">
            <div className="text-sm font-semibold text-muted-foreground">{slot}</div>
            <div className="space-y-2">
              {slotPosts.length === 0 ? <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Livre</div> : slotPosts.map((post) => <PostRow key={post.id} post={post} selected={selectedIds.includes(post.id)} onToggle={onToggle} onOpen={onOpen} onPublish={onPublish} onDelete={onDelete} compact />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PostRow({ post, selected, onToggle, onOpen, onPublish, onDelete, compact }: { post: Post; selected: boolean; onToggle: (id: EntityId) => void; onOpen: (post: Post) => void; onPublish: (post: Post) => void; onDelete: (id: EntityId) => void; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center', compact && 'rounded-xl border border-border px-3 py-3')}>
      <Checkbox checked={selected} onCheckedChange={() => onToggle(post.id)} />
      <button type="button" onClick={() => onOpen(post)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">{getPreview(post) && <img src={getPreview(post)} alt="" className="h-full w-full object-cover" />}</div>
        <PlatformIcon platform={post.platform} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{post.product_name || 'Produto'}</p><p className="truncate text-xs text-muted-foreground">{post.caption?.slice(0, 80) || 'Sem legenda'}</p></div>
      </button>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{post.scheduled_at ? format(new Date(post.scheduled_at), 'dd/MM HH:mm') : '—'}</span>
        <StatusBadge status={post.status} />
        <Can permission="post:publish">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success" onClick={() => onPublish(post)}><Send className="h-3.5 w-3.5" /></Button>
        </Can>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpen(post)}><Eye className="h-3.5 w-3.5" /></Button>
        <Can permission="post:delete">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(post.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </Can>
      </div>
    </div>
  );
}

function PostDialog({ post, open, onOpenChange, onSave, onDelete, onPublish }: { post: Post | null; open: boolean; onOpenChange: (open: boolean) => void; onSave: (payload: Partial<Post>) => void; onDelete: (id: EntityId) => void; onPublish: (post: Post) => void }) {
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    setCaption(post?.caption || '');
    setPlatform(String(post?.platform || 'instagram'));
    setScheduledAt(post?.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : '');
  }, [post]);

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[94dvh] !w-[calc(100vw-0.75rem)] !max-w-none flex-col overflow-hidden rounded-t-[1.5rem] border-border bg-card p-0 text-foreground shadow-2xl sm:!h-[90dvh] sm:!w-[calc(100vw-2rem)] sm:rounded-[1.5rem] lg:!h-[min(88dvh,820px)] lg:!w-[min(92vw,1180px)] xl:!w-[min(86vw,1280px)]">
        <DialogHeader className="shrink-0 border-b border-border bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))] px-4 py-3 pr-10 sm:px-6 sm:py-4 sm:pr-12">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20 sm:h-11 sm:w-11">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="line-clamp-2 font-syne text-base font-bold leading-tight text-foreground sm:line-clamp-1 sm:text-lg">Prévia e edição do post</DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{post.product_name || 'Produto sem nome'}</DialogDescription>
            </div>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex"><PlatformIcon platform={platform} showLabel size="sm" /><StatusBadge status={post.status} /></div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(480px,0.95fr)_minmax(500px,1.05fr)] lg:overflow-hidden">
          <section className="flex min-h-[48dvh] flex-col items-center gap-3 border-b border-border bg-muted/35 p-3 sm:min-h-[560px] sm:gap-4 sm:p-5 md:p-6 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-[300px] w-full max-w-[680px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/10 sm:rounded-3xl lg:min-h-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,hsl(var(--primary)/0.12),transparent_38%)]" />
              {getPreview(post) ? (
                <img src={getPreview(post)} alt="" className="relative h-full w-full object-cover" />
              ) : (
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
                  <Calendar className="h-7 w-7 text-muted-foreground/35" />
                </div>
              )}
            </div>
            <div className="flex w-full max-w-[680px] shrink-0 items-center justify-between gap-3 px-1">
              <span className="font-syne text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Preview do post</span>
              <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">{scheduledAt ? format(new Date(scheduledAt), 'dd/MM HH:mm') : 'Sem horário'}</span>
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:overflow-y-auto">
            <div className="rounded-3xl border border-border bg-muted/25 p-5">
              <div className="mb-3 flex flex-wrap gap-2 sm:hidden"><PlatformIcon platform={platform} showLabel size="sm" /><StatusBadge status={post.status} /></div>
              <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Agendamento</p>
              <h2 className="mt-2 break-words font-syne text-xl font-bold leading-tight text-foreground">{post.product_name || 'Produto'}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Plataforma</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Data e hora</Label><Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1.5" /></div>
            </div>
            <div><Label>Legenda</Label><Textarea value={caption} onChange={(event) => setCaption(event.target.value)} className="mt-1.5 min-h-44 rounded-2xl" /></div>
            <div className="rounded-3xl border border-border bg-muted/25 p-4 text-sm text-muted-foreground"><p className="font-semibold text-foreground">Logs</p><p className="mt-1">Criado, agendado e aguardando execução da API de publicação.</p>{post.error_message && <p className="mt-1 text-destructive">Erro: {post.error_message}</p>}</div>
            <div className="grid gap-2 min-[420px]:grid-cols-2 sm:gap-3">
              <Button variant="outline" className="h-12 rounded-2xl bg-card" onClick={() => onSave({ caption, platform, scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : post.scheduled_at })}>Salvar</Button>
              <Can permission="post:publish">
                <Button variant="outline" className="h-12 rounded-2xl bg-card" onClick={() => onPublish(post)}>Publicar agora</Button>
              </Can>
              <Can permission="post:delete">
                <Button variant="destructive" className="h-12 rounded-2xl min-[420px]:col-span-2" onClick={() => onDelete(post.id)}>Cancelar agendamento</Button>
              </Can>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SimulationDialog({ open, onOpenChange, posts, readyAssets, settings }: { open: boolean; onOpenChange: (open: boolean) => void; posts: Post[]; readyAssets: MediaAsset[]; settings: DraftSettings }) {
  const simulated = readyAssets.slice(0, Number(settings.maxPerDay || 6)).map((asset, index) => ({ asset, date: buildSmartDate(new Date(), settings, index) }));
  const alerts = buildAlerts(posts, settings);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="font-syne">Simulação da agenda</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border p-4"><p className="font-semibold text-foreground">Distribuição sugerida</p><div className="mt-3 space-y-2">{simulated.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum conteúdo pronto para simular.</p> : simulated.map(({ asset, date }) => <div key={asset.id} className="flex flex-col gap-1 rounded-xl bg-muted/35 p-3 text-sm sm:flex-row sm:justify-between"><span>{asset.product_name || asset.title}</span><span className="font-medium">{format(date, 'dd/MM HH:mm')}</span></div>)}</div></div>
          <div className="rounded-2xl border border-border p-4"><p className="font-semibold text-foreground">Riscos encontrados</p><div className="mt-3 space-y-2">{alerts.length === 0 ? <p className="text-sm text-success">Sem riscos relevantes.</p> : alerts.map((alert) => <p key={alert} className="text-sm text-warning">{alert}</p>)}</div></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <div><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5" /></div>;
}

function Insight({ text }: { text: string }) {
  return <div className="rounded-xl bg-muted/35 p-3">{text}</div>;
}

function buildSmartDate(day: Date, settings: DraftSettings, index: number) {
  const [startHour, startMinute] = settings.start.split(':').map(Number);
  const interval = Number(settings.minInterval || 90);
  const date = new Date(day);
  date.setHours(startHour, startMinute + interval * index + Math.floor(Math.random() * 24), 0, 0);
  return date;
}

function buildAlerts(posts: Post[], settings: DraftSettings) {
  const alerts: string[] = [];
  const scheduled = posts.filter((post) => post.status === 'scheduled' && post.scheduled_at);
  const byDay = new Map<string, Post[]>();
  scheduled.forEach((post) => {
    const key = format(new Date(post.scheduled_at!), 'yyyy-MM-dd');
    byDay.set(key, [...(byDay.get(key) || []), post]);
  });
  byDay.forEach((items, day) => {
    if (items.length > Number(settings.maxPerDay || 6)) alerts.push(`${day}: muitos posts no mesmo dia.`);
    const platforms = items.map((item) => item.platform).filter(Boolean);
    const repeated = platforms.find((platform, index) => platforms.indexOf(platform) !== index);
    if (repeated) alerts.push(`${day}: plataforma ${repeated} aparece repetida.`);
    const times = items.map((item) => new Date(item.scheduled_at!).getTime()).sort();
    times.forEach((time, index) => {
      if (index > 0 && (time - times[index - 1]) / 60000 < Number(settings.minInterval || 90)) alerts.push(`${day}: posts muito próximos no horário.`);
    });
    if (items.some((item) => !item.caption)) alerts.push(`${day}: existe post sem legenda.`);
    if (items.some((item) => !item.thumbnail_url)) alerts.push(`${day}: existe post sem mídia/thumbnail.`);
  });
  return [...new Set(alerts)].slice(0, 8);
}
