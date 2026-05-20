import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import PlatformIcon from '@/components/common/PlatformIcon';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle,
  Clock,
  Copy,
  Edit3,
  Eye,
  Film,
  Filter,
  Image,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Target,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SOCIAL_PLATFORMS } from '@/config/platforms';
import { createPost, publishPostNow } from '@/services/posts';
import { listMediaAssets, updateMediaAsset } from '@/services/mediaAssets';
import { invokeLLM } from '@/services/ai';
import type { EntityId, MediaAsset, Platform, Status } from '@/types/entities';

const PLATFORMS = SOCIAL_PLATFORMS;

const statusFilters = [
  { value: 'all', label: 'Todos' },
  { value: 'pending_review', label: 'Pendentes' },
  { value: 'needs_changes', label: 'Precisa ajuste' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'scheduled', label: 'Pronto para agendar' },
];

const reviewReasons = [
  'Imagem ruim',
  'Produto não aparece',
  'Legenda fraca',
  'CTA inadequado',
  'Vídeo longo',
  'Parece spam',
  'Outro motivo',
];

const kanbanColumns = [
  { status: 'pending_review', label: 'Aguardando revisão' },
  { status: 'needs_changes', label: 'Precisa ajuste' },
  { status: 'approved', label: 'Aprovado' },
  { status: 'rejected', label: 'Rejeitado' },
  { status: 'scheduled', label: 'Pronto para agendar' },
];

const previewUrl = (asset: MediaAsset) => asset.thumbnail_url || asset.url;
const isVideo = (asset: MediaAsset) => asset.type === 'video' || asset.type === 'generated_video';
const qualityScore = (asset: MediaAsset) => Number(asset.quality_score ?? (asset.status === 'rejected' ? 38 : asset.status === 'approved' ? 88 : 72));
const assetDate = (asset: MediaAsset) => new Date(asset.created_at || asset.updated_at || 0).getTime();

export default function Approval() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [caption, setCaption] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [typeFilter, setTypeFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [sortBy, setSortBy] = useState('priority');
  const [viewMode, setViewMode] = useState<'review' | 'kanban'>('review');
  const [processing, setProcessing] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'auto' | 'now' | 'manual' | 'random'>('auto');
  const [manualDate, setManualDate] = useState('');
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(reviewReasons[0]);
  const [reviewNote, setReviewNote] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listMediaAssets('-created_date', 120);
      const reviewable = data.filter((asset) =>
        ['pending_review', 'needs_changes', 'approved', 'rejected', 'scheduled'].includes(asset.status || ''),
      );
      setAssets(reviewable);
      setSelectedAssetId((current) => current || reviewable[0]?.id || '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) || assets[0];

  useEffect(() => {
    if (selectedAsset) {
      setCaption(selectedAsset.caption || '');
      setSelectedPlatforms(selectedAsset.platforms || []);
      setReviewNote(selectedAsset.review_notes || '');
    }
  }, [selectedAsset?.id]);

  const products = useMemo(() => [...new Set(assets.map((asset) => asset.product_name).filter(Boolean))], [assets]);

  const stats = useMemo(() => {
    const pending = assets.filter((asset) => asset.status === 'pending_review').length;
    const approvedToday = assets.filter((asset) => asset.status === 'approved' && asset.reviewed_at && new Date(asset.reviewed_at).toDateString() === new Date().toDateString()).length;
    const average = assets.length ? Math.round(assets.reduce((sum, asset) => sum + qualityScore(asset), 0) / assets.length) : 0;
    return {
      pending,
      approvedToday,
      rejected: assets.filter((asset) => asset.status === 'rejected').length,
      changes: assets.filter((asset) => asset.status === 'needs_changes').length,
      average,
    };
  }, [assets]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return assets
      .filter((asset) => {
        const score = qualityScore(asset);
        const matchesSearch =
          !normalizedSearch ||
          asset.title?.toLowerCase().includes(normalizedSearch) ||
          asset.product_name?.toLowerCase().includes(normalizedSearch) ||
          asset.source?.toLowerCase().includes(normalizedSearch) ||
          asset.caption?.toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesType = typeFilter === 'all' || asset.type === typeFilter;
        const matchesPlatform = platformFilter === 'all' || asset.platforms?.includes(platformFilter);
        const matchesScore =
          scoreFilter === 'all' ||
          (scoreFilter === 'high' && score >= 80) ||
          (scoreFilter === 'medium' && score >= 50 && score < 80) ||
          (scoreFilter === 'low' && score < 50);
        return matchesSearch && matchesStatus && matchesType && matchesPlatform && matchesScore;
      })
      .sort((first, second) => {
        if (sortBy === 'oldest') return assetDate(first) - assetDate(second);
        if (sortBy === 'score') return qualityScore(second) - qualityScore(first);
        if (sortBy === 'risk') return qualityScore(first) - qualityScore(second);
        return (first.status === 'pending_review' ? -1 : 1) - (second.status === 'pending_review' ? -1 : 1) || assetDate(second) - assetDate(first);
      });
  }, [assets, platformFilter, scoreFilter, search, sortBy, statusFilter, typeFilter]);

  const checklist = selectedAsset ? [
    { label: 'Produto aparece claramente', ok: qualityScore(selectedAsset) >= 55 },
    { label: 'Link ou produto vinculado existe', ok: Boolean(selectedAsset.product_id || selectedAsset.product_name) },
    { label: 'Legenda está preenchida', ok: Boolean(caption.trim()) },
    { label: 'CTA está correto', ok: /comente|clique|comprar|link|eu quero/i.test(caption) },
    { label: 'Plataforma escolhida', ok: selectedPlatforms.length > 0 },
    { label: 'Não parece spam', ok: qualityScore(selectedAsset) >= 60 && caption.length < 1800 },
    { label: 'Uso permitido da mídia', ok: selectedAsset.source !== 'Desconhecida' },
  ] : [];
  const checklistScore = checklist.length ? Math.round((checklist.filter((item) => item.ok).length / checklist.length) * 100) : 0;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!selectedAsset || ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) return;
      const key = event.key.toLowerCase();
      if (key === 'a') handleApprove();
      if (key === 'r') setRejectionOpen(true);
      if (key === 'n') selectNext();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedAsset?.id, selectedPlatforms, caption, assets]);

  const selectNext = () => {
    const currentIndex = filtered.findIndex((asset) => asset.id === selectedAsset?.id);
    const next = filtered[currentIndex + 1] || filtered[0];
    if (next) setSelectedAssetId(next.id);
  };

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform],
    );
  };

  const toggleSelected = (id: EntityId) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const getScheduleDate = () => {
    const now = new Date();
    if (scheduleMode === 'now') return now.toISOString();
    if (scheduleMode === 'manual' && manualDate) return new Date(manualDate).toISOString();
    const scheduled = new Date();
    const randomHours = Math.floor(Math.random() * 14) + 8;
    const randomMins = Math.floor(Math.random() * 60);
    scheduled.setHours(randomHours, randomMins, 0, 0);
    return scheduled.toISOString();
  };

  const approveAsset = async (asset: MediaAsset, platforms: Platform[], text: string, status: Status = 'approved') => {
    await updateMediaAsset(asset.id, {
      status,
      platforms,
      caption: text,
      review_notes: reviewNote,
      previous_status: asset.status,
      reviewed_by: 'admin',
      reviewed_at: new Date().toISOString(),
    });

    if (status === 'approved' || status === 'scheduled') {
      for (const platform of platforms) {
        const post = await createPost({
          product_id: asset.product_id,
          product_name: asset.product_name,
          media_asset_id: asset.id,
          platform,
          caption: text,
          status: 'scheduled',
          scheduled_at: getScheduleDate(),
          thumbnail_url: asset.thumbnail_url || asset.url,
        });

        if (scheduleMode === 'now') {
          await publishPostNow(post.id);
        }
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedAsset) return;
    if (selectedPlatforms.length === 0) {
      toast.error('Selecione ao menos uma plataforma');
      return;
    }

    setProcessing(true);
    try {
      await approveAsset(selectedAsset, selectedPlatforms, caption, 'approved');
      toast.success(`Aprovado! ${selectedPlatforms.length} post(s) preparados.`);
      await load();
      selectNext();
    } catch {
      toast.error('Não foi possível aprovar o conteúdo');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAsset) return;
    setProcessing(true);
    try {
      await updateMediaAsset(selectedAsset.id, {
        status: 'rejected',
        rejection_reason: rejectionReason,
        review_notes: reviewNote,
        previous_status: selectedAsset.status,
        reviewed_by: 'admin',
        reviewed_at: new Date().toISOString(),
      });
      toast.error('Conteúdo rejeitado');
      setRejectionOpen(false);
      await load();
      selectNext();
    } catch {
      toast.error('Não foi possível rejeitar o conteúdo');
    } finally {
      setProcessing(false);
    }
  };

  const handleNeedsChanges = async () => {
    if (!selectedAsset) return;
    setProcessing(true);
    try {
      await updateMediaAsset(selectedAsset.id, {
        status: 'needs_changes',
        rejection_reason: rejectionReason,
        review_notes: reviewNote,
        previous_status: selectedAsset.status,
        reviewed_by: 'admin',
        reviewed_at: new Date().toISOString(),
      });
      toast.success('Marcado como precisa ajuste');
      setRejectionOpen(false);
      await load();
    } catch {
      toast.error('Não foi possível pedir ajuste');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulk = async (status: Status) => {
    if (selectedIds.length === 0) {
      toast.error('Selecione conteúdos primeiro.');
      return;
    }

    setProcessing(true);
    try {
      await Promise.all(selectedIds.map((id) => updateMediaAsset(id, { status, reviewed_by: 'admin', reviewed_at: new Date().toISOString() })));
      toast.success('Ação em lote aplicada');
      setSelectedIds([]);
      await load();
    } catch {
      toast.error('Não foi possível aplicar ação em lote');
    } finally {
      setProcessing(false);
    }
  };

  const generateCaption = async (mode: 'better' | 'natural' | 'platform') => {
    if (!selectedAsset) return;
    try {
      const result = await invokeLLM(
        `Crie uma legenda ${mode === 'natural' ? 'mais natural e menos robótica' : mode === 'platform' ? `adaptada para ${selectedPlatforms.join(', ') || 'Instagram e TikTok'}` : 'mais forte'} para o produto "${selectedAsset.product_name || 'produto'}". Use CTA claro, evite spam e mantenha até 500 caracteres. Legenda atual: ${caption}`,
      );
      setCaption(result);
      toast.success('Legenda atualizada com IA');
    } catch {
      toast.error('Não foi possível gerar a legenda');
    }
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Aprovação" subtitle="Mesa de revisão de conteúdos" />
        <div className="flex h-64 items-center justify-center p-4 sm:p-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <TopBar title="Aprovação" subtitle="Mesa de revisão de conteúdos" />
        <div className="p-4 sm:p-6"><ErrorState onRetry={load} /></div>
      </div>
    );
  }

  if (assets.length === 0) {
    return <EmptyApproval />;
  }

  return (
    <div>
      <TopBar title="Aprovação" subtitle={`${stats.pending} conteúdo(s) aguardando revisão`} />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Pendentes" value={stats.pending} icon={Clock} tone="primary" />
          <Metric label="Aprovados hoje" value={stats.approvedToday} icon={CheckCircle} tone="success" />
          <Metric label="Rejeitados" value={stats.rejected} icon={XCircle} tone="destructive" />
          <Metric label="Precisa ajuste" value={stats.changes} icon={RefreshCw} tone="warning" />
          <Metric label="Score médio" value={`${stats.average}%`} icon={Star} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar produto, legenda, origem..." className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-5 xl:flex">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="h-10 xl:w-44"><SelectValue /></SelectTrigger><SelectContent>{statusFilters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-10 xl:w-36"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos tipos</SelectItem><SelectItem value="image">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem><SelectItem value="generated_video">Vídeo IA</SelectItem></SelectContent></Select>
              <Select value={platformFilter} onValueChange={setPlatformFilter}><SelectTrigger className="h-10 xl:w-40"><SelectValue placeholder="Plataforma" /></SelectTrigger><SelectContent><SelectItem value="all">Plataformas</SelectItem>{PLATFORMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
              <Select value={scoreFilter} onValueChange={setScoreFilter}><SelectTrigger className="h-10 xl:w-36"><SelectValue placeholder="Score" /></SelectTrigger><SelectContent><SelectItem value="all">Score</SelectItem><SelectItem value="high">Alto</SelectItem><SelectItem value="medium">Médio</SelectItem><SelectItem value="low">Baixo</SelectItem></SelectContent></Select>
              <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="h-10 xl:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">Prioridade</SelectItem><SelectItem value="score">Score alto</SelectItem><SelectItem value="risk">Risco baixo</SelectItem><SelectItem value="oldest">Mais antigos</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {filtered.length} de {assets.length} itens
              {selectedIds.length > 0 && <span className="font-medium text-primary">{selectedIds.length} selecionados</span>}
              <span className="hidden items-center gap-1 sm:flex"><Keyboard className="h-3.5 w-3.5" /> Atalhos: A aprova, R rejeita, N próximo</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleBulk('approved')}>Aprovar selecionados</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulk('rejected')}>Rejeitar selecionados</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulk('scheduled')}>Enviar para agenda</Button>
                </>
              )}
              <Button size="sm" variant={viewMode === 'review' ? 'default' : 'outline'} className="gap-2" onClick={() => setViewMode('review')}><Eye className="h-4 w-4" /> Revisão</Button>
              <Button size="sm" variant={viewMode === 'kanban' ? 'default' : 'outline'} className="gap-2" onClick={() => setViewMode('kanban')}><LayoutDashboard className="h-4 w-4" /> Kanban</Button>
            </div>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <Kanban assets={filtered} selectedAssetId={selectedAsset?.id} onSelect={setSelectedAssetId} onToggle={toggleSelected} selectedIds={selectedIds} />
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
            <ReviewQueue assets={filtered} selectedId={selectedAsset?.id} selectedIds={selectedIds} onSelect={setSelectedAssetId} onToggle={toggleSelected} />
            {selectedAsset && (
              <main className="space-y-5">
                <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <PreviewPanel asset={selectedAsset} />
                  <ScorePanel asset={selectedAsset} checklistScore={checklistScore} />
                </section>

                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <SectionTitle icon={ListChecks} title="Checklist de aprovação" subtitle="Confirme os pontos críticos antes de publicar" />
                    <div className="mt-4 space-y-2">
                      {checklist.map((item) => (
                        <div key={item.label} className="flex items-center gap-3 rounded-xl bg-muted/35 p-3">
                          {item.ok ? <CheckCircle className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
                          <span className="text-sm text-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <SectionTitle icon={Target} title="Destinos e agendamento" subtitle="Escolha onde e como publicar após aprovar" />
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PLATFORMS.map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className={cn('rounded-xl border p-3 text-xs font-medium transition-all', selectedPlatforms.includes(platform) ? 'border-primary bg-primary/5 text-primary shadow-sm' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted')}
                        >
                          <PlatformIcon platform={platform} size="sm" className="justify-center" />
                          <span className="mt-2 block capitalize">{platform}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Agendamento</Label>
                        <Select value={scheduleMode} onValueChange={(value) => setScheduleMode(value as typeof scheduleMode)}>
                          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Agendar automaticamente</SelectItem>
                            <SelectItem value="now">Publicar agora</SelectItem>
                            <SelectItem value="manual">Escolher data/hora</SelectItem>
                            <SelectItem value="random">Horário aleatório</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Data manual</Label>
                        <Input type="datetime-local" value={manualDate} onChange={(event) => setManualDate(event.target.value)} disabled={scheduleMode !== 'manual'} className="mt-1.5" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <SectionTitle icon={Edit3} title="Legenda e observações" subtitle="Edite antes de aprovar ou peça variações para IA" />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => generateCaption('better')}><Sparkles className="h-4 w-4" /> Melhorar</Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => generateCaption('natural')}><MessageSquare className="h-4 w-4" /> Natural</Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => generateCaption('platform')}><Wand2 className="h-4 w-4" /> Por plataforma</Button>
                      <Button size="sm" variant="ghost" className="gap-2" onClick={() => navigator.clipboard.writeText(caption)}><Copy className="h-4 w-4" /> Copiar</Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div>
                      <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Legenda do conteúdo..." className="h-40 resize-none" />
                      <p className="mt-2 text-xs text-muted-foreground">{caption.length}/2200 caracteres</p>
                    </div>
                    <div>
                      <Label>Observações internas</Label>
                      <Textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Motivos, ajustes ou contexto da revisão..." className="mt-1.5 h-32 resize-none" />
                    </div>
                  </div>
                </section>

                <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => setRejectionOpen(true)} disabled={processing}><XCircle className="h-4 w-4" /> Rejeitar / pedir ajuste</Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => updateMediaAsset(selectedAsset.id, { status: 'generating' }).then(load)} disabled={processing}><RefreshCw className="h-4 w-4" /> Regenerar vídeo</Button>
                  <Button className="flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90" onClick={handleApprove} disabled={processing || selectedPlatforms.length === 0}><CheckCircle className="h-4 w-4" /> Aprovar e agendar</Button>
                </section>

                <HistoryPanel asset={selectedAsset} />
              </main>
            )}
          </div>
        )}
      </div>

      <Dialog open={rejectionOpen} onOpenChange={setRejectionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-syne">Rejeitar ou pedir ajuste</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{reviewReasons.map((reason) => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="mt-1.5 h-28" placeholder="Explique o que precisa mudar..." />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleNeedsChanges}><RefreshCw className="h-4 w-4" /> Pedir ajuste</Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleReject}><XCircle className="h-4 w-4" /> Rejeitar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: number | string; icon: typeof Clock; tone?: 'neutral' | 'primary' | 'success' | 'destructive' | 'warning' }) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-warning/10 text-warning',
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div>
      <p className="font-syne text-xl font-bold text-foreground sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Clock; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

function ReviewQueue({ assets, selectedId, selectedIds, onSelect, onToggle }: { assets: MediaAsset[]; selectedId?: string; selectedIds: string[]; onSelect: (id: string) => void; onToggle: (id: EntityId) => void }) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-3">
      <p className="mb-3 px-2 font-syne text-sm font-bold text-foreground">Fila de revisão</p>
      <div className="max-h-[860px] space-y-2 overflow-y-auto pr-1">
        {assets.map((asset) => (
          <button key={asset.id} type="button" onClick={() => onSelect(asset.id)} className={cn('flex w-full gap-3 rounded-xl border p-3 text-left transition-all', selectedId === asset.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
            <Checkbox checked={selectedIds.includes(asset.id)} onCheckedChange={() => onToggle(asset.id)} onClick={(event) => event.stopPropagation()} />
            <Thumb asset={asset} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{asset.title || asset.product_name || 'Conteúdo'}</p>
              <p className="truncate text-xs text-muted-foreground">{asset.product_name || 'Sem produto'}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusBadge status={asset.status} className="text-[10px]" />
                <span className={cn('text-xs font-semibold', qualityScore(asset) >= 70 ? 'text-success' : 'text-warning')}>{qualityScore(asset)}%</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

function PreviewPanel({ asset }: { asset: MediaAsset }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-video bg-muted">
        {previewUrl(asset) ? (
          isVideo(asset) && asset.url ? <video src={asset.url} poster={asset.thumbnail_url} controls className="h-full w-full bg-black object-contain" /> : <img src={previewUrl(asset)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">{isVideo(asset) ? <Play className="h-12 w-12 text-muted-foreground/30" /> : <Image className="h-12 w-12 text-muted-foreground/30" />}</div>
        )}
        {asset.type === 'generated_video' && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"><Sparkles className="h-3 w-3" /> Gerado com IA</span>}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-syne text-xl font-bold text-foreground">{asset.title || asset.product_name || 'Conteúdo para revisão'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{asset.product_name || 'Produto não vinculado'}</p>
          </div>
          <StatusBadge status={asset.status} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBox label="Tipo" value={asset.type?.replace('_', ' ') || 'mídia'} />
          <InfoBox label="Fonte" value={asset.source || 'Não informada'} />
          <InfoBox label="Duração" value={asset.duration ? `${asset.duration}s` : 'N/A'} />
          <InfoBox label="Score" value={`${qualityScore(asset)}%`} />
        </div>
      </div>
    </section>
  );
}

function ScorePanel({ asset, checklistScore }: { asset: MediaAsset; checklistScore: number }) {
  const score = qualityScore(asset);
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <SectionTitle icon={Star} title="Score de qualidade" subtitle="Análise visual antes da aprovação" />
      <div className="mt-5 space-y-4">
        <QualityLine label="Qualidade visual" value={score} />
        <QualityLine label="Clareza do produto" value={Math.min(score + 5, 100)} />
        <QualityLine label="Força do CTA" value={asset.caption ? Math.min(score + 8, 100) : 35} />
        <QualityLine label="Adequação à plataforma" value={asset.platforms?.length ? 85 : 55} />
        <QualityLine label="Risco de parecer spam" value={Math.max(100 - score, 8)} invert />
        <QualityLine label="Checklist" value={checklistScore} />
      </div>
    </section>
  );
}

function QualityLine({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value <= 30 : value >= 70;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className={cn('font-semibold', good ? 'text-success' : 'text-warning')}>{value}%</span></div>
      <Progress value={value} />
    </div>
  );
}

function Kanban({ assets, selectedAssetId, selectedIds, onSelect, onToggle }: { assets: MediaAsset[]; selectedAssetId?: string; selectedIds: string[]; onSelect: (id: string) => void; onToggle: (id: EntityId) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {kanbanColumns.map((column) => {
        const items = assets.filter((asset) => asset.status === column.status);
        return (
          <section key={column.status} className="rounded-2xl border border-border bg-card p-3">
            <div className="mb-3 flex items-center justify-between px-1"><h3 className="font-syne text-sm font-bold text-foreground">{column.label}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{items.length}</span></div>
            <div className="space-y-2">
              {items.map((asset) => (
                <button key={asset.id} type="button" onClick={() => onSelect(asset.id)} className={cn('w-full rounded-xl border p-3 text-left', selectedAssetId === asset.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
                  <div className="mb-2 flex items-start gap-2"><Checkbox checked={selectedIds.includes(asset.id)} onCheckedChange={() => onToggle(asset.id)} onClick={(event) => event.stopPropagation()} /><Thumb asset={asset} /></div>
                  <p className="truncate text-sm font-semibold text-foreground">{asset.title || asset.product_name || 'Conteúdo'}</p>
                  <p className="truncate text-xs text-muted-foreground">{asset.product_name || 'Sem produto'}</p>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function HistoryPanel({ asset }: { asset: MediaAsset }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <SectionTitle icon={CalendarClock} title="Histórico da revisão" subtitle="Rastro operacional do conteúdo" />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoBox label="Revisado por" value={asset.reviewed_by || 'Ainda não revisado'} />
        <InfoBox label="Revisado em" value={asset.reviewed_at ? new Date(asset.reviewed_at).toLocaleString('pt-BR') : 'Pendente'} />
        <InfoBox label="Status anterior" value={asset.previous_status || 'N/A'} />
        <InfoBox label="Motivo" value={asset.rejection_reason || 'Sem motivo registrado'} />
      </div>
      <div className="mt-4 rounded-xl bg-muted/35 p-3 text-sm text-muted-foreground">{asset.review_notes || 'Nenhuma observação registrada.'}</div>
    </section>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-muted/25 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p></div>;
}

function Thumb({ asset }: { asset: MediaAsset }) {
  return (
    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
      {previewUrl(asset) ? <img src={previewUrl(asset)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">{isVideo(asset) ? <Film className="h-5 w-5 text-muted-foreground" /> : <Image className="h-5 w-5 text-muted-foreground" />}</div>}
    </div>
  );
}

function EmptyApproval() {
  return (
    <div>
      <TopBar title="Aprovação" subtitle="Mesa de revisão de conteúdos" />
      <div className="m-4 rounded-2xl border border-border bg-card p-8 text-center sm:m-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10"><CheckCircle className="h-7 w-7 text-success" /></div>
        <p className="font-syne text-xl font-bold text-foreground">Nenhum conteúdo pendente</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Você pode gerar novos vídeos ou revisar a biblioteca de mídia para enviar ativos para aprovação.</p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild variant="outline"><Link to="/videos">Gerar vídeo</Link></Button>
          <Button asChild><Link to="/media">Ver biblioteca</Link></Button>
        </div>
      </div>
    </div>
  );
}
