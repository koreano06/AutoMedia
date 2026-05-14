import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
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
  Bot,
  CheckCircle,
  Copy,
  Download,
  Eye,
  Film,
  FolderKanban,
  Grid2X2,
  Image,
  Layers3,
  LayoutList,
  MoreHorizontal,
  Play,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createMediaAsset, listMediaAssets, updateMediaAsset } from '@/services/mediaAssets';
import type { EntityId, MediaAsset, Status } from '@/types/entities';

type ViewMode = 'grid' | 'list' | 'grouped';

type UploadForm = {
  title: string;
  product_name: string;
  type: string;
  url: string;
  thumbnail_url: string;
  source: string;
  caption: string;
};

const emptyUploadForm: UploadForm = {
  title: '',
  product_name: '',
  type: 'image',
  url: '',
  thumbnail_url: '',
  source: 'Upload manual',
  caption: '',
};

const typeOptions = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'image', label: 'Imagens' },
  { value: 'video', label: 'Vídeos coletados' },
  { value: 'generated_video', label: 'Vídeos gerados por IA' },
  { value: 'thumbnail', label: 'Thumbnails' },
];

const statusOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'draft', label: 'Nova' },
  { value: 'processing', label: 'Em análise' },
  { value: 'approved', label: 'Aprovada' },
  { value: 'rejected', label: 'Rejeitada' },
  { value: 'pending_review', label: 'Aguardando revisão' },
  { value: 'failed', label: 'Baixa qualidade' },
  { value: 'generated_video', label: 'Pronta para vídeo' },
  { value: 'published', label: 'Usada em publicação' },
];

const sortOptions = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'quality_desc', label: 'Maior qualidade' },
  { value: 'title', label: 'Título A-Z' },
];

const qualityOptions = [
  { value: 'all', label: 'Qualidade' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

const isVideoAsset = (asset: MediaAsset) => asset.type === 'video' || asset.type === 'generated_video';
const assetPreview = (asset: MediaAsset) => asset.thumbnail_url || asset.url;
const assetDate = (asset: MediaAsset) => new Date(asset.created_at || asset.updated_at || 0).getTime();
const getQualityScore = (asset: MediaAsset) => Number(asset.quality_score ?? (asset.status === 'failed' ? 32 : asset.status === 'approved' ? 86 : 64));
const getQualityLabel = (score: number) => {
  if (score >= 80) return 'Alta qualidade';
  if (score >= 50) return 'Qualidade média';
  return 'Baixa qualidade';
};
const getQualityTone = (score: number) => {
  if (score >= 80) return 'text-success bg-success/10';
  if (score >= 50) return 'text-warning bg-warning/10';
  return 'text-destructive bg-destructive/10';
};

export default function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [view, setView] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>(emptyUploadForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState('');
  const [savingUpload, setSavingUpload] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listMediaAssets('-created_date', 100);
      setAssets(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!uploadFile) {
      setUploadPreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(uploadFile);
    setUploadPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [uploadFile]);

  const productOptions = useMemo(() => {
    const products = assets.map((asset) => asset.product_name).filter(Boolean) as string[];
    return [...new Set(products)];
  }, [assets]);

  const sourceOptions = useMemo(() => {
    const sources = assets.map((asset) => asset.source).filter(Boolean) as string[];
    return [...new Set(sources)];
  }, [assets]);

  const stats = useMemo(
    () => ({
      total: assets.length,
      images: assets.filter((asset) => asset.type === 'image').length,
      videos: assets.filter((asset) => asset.type === 'video' || asset.type === 'generated_video').length,
      review: assets.filter((asset) => asset.status === 'pending_review').length,
      approved: assets.filter((asset) => asset.status === 'approved').length,
      rejected: assets.filter((asset) => asset.status === 'rejected').length,
    }),
    [assets],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assets
      .filter((asset) => {
        const score = getQualityScore(asset);
        const matchesSearch =
          !normalizedSearch ||
          asset.title?.toLowerCase().includes(normalizedSearch) ||
          asset.product_name?.toLowerCase().includes(normalizedSearch) ||
          asset.type?.toLowerCase().includes(normalizedSearch) ||
          asset.source?.toLowerCase().includes(normalizedSearch) ||
          asset.status?.toLowerCase().includes(normalizedSearch);
        const matchesType = typeFilter === 'all' || asset.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesProduct = productFilter === 'all' || asset.product_name === productFilter;
        const matchesSource = sourceFilter === 'all' || asset.source === sourceFilter;
        const matchesQuality =
          qualityFilter === 'all' ||
          (qualityFilter === 'high' && score >= 80) ||
          (qualityFilter === 'medium' && score >= 50 && score < 80) ||
          (qualityFilter === 'low' && score < 50);

        return matchesSearch && matchesType && matchesStatus && matchesProduct && matchesSource && matchesQuality;
      })
      .sort((first, second) => {
        if (sortBy === 'oldest') return assetDate(first) - assetDate(second);
        if (sortBy === 'quality_desc') return getQualityScore(second) - getQualityScore(first);
        if (sortBy === 'title') return (first.title || '').localeCompare(second.title || '');
        return assetDate(second) - assetDate(first);
      });
  }, [assets, productFilter, qualityFilter, search, sortBy, sourceFilter, statusFilter, typeFilter]);

  const groupedAssets = useMemo(() => {
    return filtered.reduce<Record<string, MediaAsset[]>>((groups, asset) => {
      const key = asset.product_name || 'Sem produto vinculado';
      groups[key] = [...(groups[key] || []), asset];
      return groups;
    }, {});
  }, [filtered]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset.id)),
    [assets, selectedIds],
  );

  const toggleSelected = (id: EntityId) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  };

  const toggleAllFiltered = () => {
    const filteredIds = filtered.map((asset) => asset.id);
    const hasAllFiltered = filteredIds.every((id) => selectedIds.includes(id));
    setSelectedIds(hasAllFiltered ? selectedIds.filter((id) => !filteredIds.includes(id)) : [...new Set([...selectedIds, ...filteredIds])]);
  };

  const handleStatus = async (id: EntityId, status: Status, message: string) => {
    try {
      await updateMediaAsset(id, { status });
      toast.success(message);
      setSelectedAsset((current) => (current?.id === id ? { ...current, status } : current));
      load();
    } catch {
      toast.error('Não foi possível atualizar a mídia');
    }
  };

  const handleBulkStatus = async (status: Status, message: string) => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos uma mídia.');
      return;
    }

    try {
      await Promise.all(selectedIds.map((id) => updateMediaAsset(id, { status })));
      toast.success(message);
      setSelectedIds([]);
      load();
    } catch {
      toast.error('Não foi possível atualizar as mídias selecionadas');
    }
  };

  const handleCopyLink = async (asset: MediaAsset) => {
    if (!asset.url) {
      toast.error('Essa mídia ainda não tem link.');
      return;
    }

    await navigator.clipboard.writeText(asset.url);
    toast.success('Link copiado');
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim()) {
      toast.error('Informe um título para a mídia.');
      return;
    }

    if (!uploadForm.product_name.trim()) {
      toast.error('Associe a mídia a um produto.');
      return;
    }

    if (!uploadForm.url.trim() && !uploadFile) {
      toast.error('Adicione um arquivo ou uma URL da mídia.');
      return;
    }

    setSavingUpload(true);
    try {
      await createMediaAsset({
        ...uploadForm,
        thumbnail_url: uploadForm.thumbnail_url || uploadForm.url,
        status: 'pending_review',
        quality_score: uploadFile || uploadForm.url ? 72 : 40,
      });
      toast.success('Mídia importada para revisão');
      setShowUpload(false);
      setUploadForm(emptyUploadForm);
      setUploadFile(null);
      load();
    } catch {
      toast.error('Não foi possível importar a mídia');
    } finally {
      setSavingUpload(false);
    }
  };

  return (
    <div>
      <TopBar title="Biblioteca de Mídia" subtitle="Central de ativos criativos, revisão e preparação para IA" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <MediaMetric label="Total" value={stats.total} icon={Layers3} />
          <MediaMetric label="Imagens" value={stats.images} icon={Image} tone="primary" />
          <MediaMetric label="Vídeos" value={stats.videos} icon={Film} tone="accent" />
          <MediaMetric label="Em revisão" value={stats.review} icon={Eye} tone="warning" />
          <MediaMetric label="Aprovadas" value={stats.approved} icon={CheckCircle} tone="success" />
          <MediaMetric label="Rejeitadas" value={stats.rejected} icon={XCircle} tone="destructive" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, título, origem, status..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:flex">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-10 xl:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{typeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 xl:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="h-10 xl:w-44"><SelectValue placeholder="Produto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos produtos</SelectItem>
                  {productOptions.map((product) => <SelectItem key={product} value={product}>{product}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-10 xl:w-40"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas origens</SelectItem>
                  {sourceOptions.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="h-10 xl:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{qualityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 xl:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={filtered.length > 0 && filtered.every((asset) => selectedIds.includes(asset.id))} onCheckedChange={toggleAllFiltered} />
                Selecionar filtradas
              </label>
              <span>{filtered.length} de {assets.length} mídias</span>
              {selectedIds.length > 0 && <span className="font-medium text-primary">{selectedIds.length} selecionadas</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleBulkStatus('approved', 'Mídias aprovadas')}>
                    <CheckCircle className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleBulkStatus('rejected', 'Mídias rejeitadas')}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleBulkStatus('generating', 'Mídias enviadas para geração de vídeo')}>
                    <Film className="h-4 w-4" /> Enviar para vídeo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Limpar</Button>
                </>
              )}
              <div className="flex rounded-xl border border-border bg-muted p-1">
                {[
                  { key: 'grid', icon: Grid2X2, label: 'Grade' },
                  { key: 'list', icon: LayoutList, label: 'Lista' },
                  { key: 'grouped', icon: FolderKanban, label: 'Por produto' },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setView(key as ViewMode)}
                    className={cn('rounded-lg p-2 text-muted-foreground transition-colors', view === key && 'bg-card text-foreground shadow-sm')}
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <Button size="sm" className="gap-2" onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4" /> Importar mídia
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <MediaSkeleton view={view} />
        ) : filtered.length === 0 ? (
          <EmptyLibrary onUpload={() => setShowUpload(true)} />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                selected={selectedIds.includes(asset.id)}
                onToggleSelected={toggleSelected}
                onOpen={setSelectedAsset}
                onCopyLink={handleCopyLink}
                onStatus={handleStatus}
              />
            ))}
          </div>
        ) : view === 'list' ? (
          <MediaTable
            assets={filtered}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onOpen={setSelectedAsset}
            onCopyLink={handleCopyLink}
            onStatus={handleStatus}
          />
        ) : (
          <GroupedMedia
            groups={groupedAssets}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onOpen={setSelectedAsset}
            onCopyLink={handleCopyLink}
            onStatus={handleStatus}
          />
        )}
      </div>

      <MediaDetailsDialog
        asset={selectedAsset}
        open={Boolean(selectedAsset)}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
        onCopyLink={handleCopyLink}
        onStatus={handleStatus}
      />

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-syne">Importar mídia manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">Ativo criativo</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Associe imagens e vídeos a produtos para revisão, geração de vídeo e publicação.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Título *</Label>
                <Input value={uploadForm.title} onChange={(event) => setUploadForm({ ...uploadForm, title: event.target.value })} className="mt-1" placeholder="ex: Close do produto" />
              </div>
              <div>
                <Label>Produto vinculado *</Label>
                <Input value={uploadForm.product_name} onChange={(event) => setUploadForm({ ...uploadForm, product_name: event.target.value })} className="mt-1" placeholder="Nome do produto" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <Select value={uploadForm.type} onValueChange={(value) => setUploadForm({ ...uploadForm, type: value })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Imagem</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="generated_video">Vídeo gerado por IA</SelectItem>
                    <SelectItem value="thumbnail">Thumbnail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Origem</Label>
                <Input value={uploadForm.source} onChange={(event) => setUploadForm({ ...uploadForm, source: event.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>URL da mídia</Label>
              <Input value={uploadForm.url} onChange={(event) => setUploadForm({ ...uploadForm, url: event.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label>URL da thumbnail</Label>
              <Input value={uploadForm.thumbnail_url} onChange={(event) => setUploadForm({ ...uploadForm, thumbnail_url: event.target.value })} className="mt-1" placeholder="Opcional" />
            </div>
            <div>
              <Label>Arquivo local</Label>
              <div className="mt-1.5 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                {uploadPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={uploadPreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{uploadFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Pronto para envio ao backend de storage</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUploadFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-5 text-center hover:bg-background">
                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Selecionar arquivo</span>
                    <span className="mt-1 text-xs text-muted-foreground">Imagem ou vídeo para associar ao produto</span>
                    <input type="file" accept="image/*,video/*" className="sr-only" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Observações / legenda</Label>
              <Textarea value={uploadForm.caption} onChange={(event) => setUploadForm({ ...uploadForm, caption: event.target.value })} className="mt-1 h-24" placeholder="Contexto, legenda, pontos fortes..." />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setShowUpload(false)}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleUpload} disabled={savingUpload}>
                <Upload className="h-4 w-4" />
                {savingUpload ? 'Importando...' : 'Importar para revisão'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MediaMetric({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: typeof Image;
  tone?: 'neutral' | 'primary' | 'accent' | 'warning' | 'success' | 'destructive';
}) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent text-accent-foreground',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-syne text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function MediaCard({
  asset,
  selected,
  onToggleSelected,
  onOpen,
  onCopyLink,
  onStatus,
}: {
  asset: MediaAsset;
  selected: boolean;
  onToggleSelected: (id: EntityId) => void;
  onOpen: (asset: MediaAsset) => void;
  onCopyLink: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
}) {
  const score = getQualityScore(asset);

  return (
    <div className={cn('group overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.06]', selected ? 'border-primary ring-2 ring-primary/15' : 'border-border')}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {assetPreview(asset) ? (
          <img src={assetPreview(asset)} alt={asset.title || ''} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isVideoAsset(asset) ? <Film className="h-9 w-9 text-muted-foreground/30" /> : <Image className="h-9 w-9 text-muted-foreground/30" />}
          </div>
        )}
        {isVideoAsset(asset) && (
          <button type="button" onClick={() => onOpen(asset)} className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
              <Play className="ml-0.5 h-4 w-4" fill="currentColor" />
            </span>
          </button>
        )}
        <div className="absolute left-2 top-2">
          <Checkbox checked={selected} onCheckedChange={() => onToggleSelected(asset.id)} className="border-white/80 bg-card/90" />
        </div>
        {asset.type === 'generated_video' && (
          <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">IA</span>
        )}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" className="h-8 flex-1 gap-1" onClick={() => onOpen(asset)}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Button>
          <AssetMenu asset={asset} onCopyLink={onCopyLink} onOpen={onOpen} onStatus={onStatus} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => onOpen(asset)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-foreground">{asset.title || 'Sem título'}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{asset.product_name || 'Sem produto'}</p>
          </button>
          <StatusBadge status={asset.status} className="text-[10px]" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium', getQualityTone(score))}>{getQualityLabel(score)}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{asset.type?.replace('_', ' ') || 'mídia'}</span>
        </div>
      </div>
    </div>
  );
}

function AssetMenu({
  asset,
  onCopyLink,
  onOpen,
  onStatus,
}: {
  asset: MediaAsset;
  onCopyLink: (asset: MediaAsset) => void;
  onOpen: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
}) {
  return (
    <div className="relative">
      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(event) => event.stopPropagation()}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      <div className="absolute bottom-9 right-0 z-20 hidden w-52 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg group-hover:block">
        <MenuButton icon={Eye} label="Preview" onClick={() => onOpen(asset)} />
        <MenuButton icon={CheckCircle} label="Aprovar" onClick={() => onStatus(asset.id, 'approved', 'Mídia aprovada')} />
        <MenuButton icon={XCircle} label="Rejeitar" onClick={() => onStatus(asset.id, 'rejected', 'Mídia rejeitada')} />
        <MenuButton icon={Film} label="Usar para vídeo" onClick={() => onStatus(asset.id, 'generating', 'Mídia enviada para vídeo')} />
        <MenuButton icon={Bot} label="Criar legenda" onClick={() => onStatus(asset.id, 'processing', 'Legenda enviada para geração')} />
        <MenuButton icon={Wand2} label="Analisar qualidade" onClick={() => onStatus(asset.id, 'processing', 'Análise de qualidade iniciada')} />
        <MenuButton icon={Copy} label="Copiar link" onClick={() => onCopyLink(asset)} />
        <MenuButton icon={Download} label="Abrir mídia" onClick={() => asset.url && window.open(asset.url, '_blank')} />
        <MenuButton icon={Trash2} label="Excluir" destructive onClick={() => onStatus(asset.id, 'rejected', 'Mídia movida para rejeitadas')} />
      </div>
    </div>
  );
}

function MenuButton({ icon: Icon, label, destructive, onClick }: { icon: typeof Eye; label: string; destructive?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted', destructive ? 'text-destructive' : 'text-foreground')}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function MediaTable({
  assets,
  selectedIds,
  onToggleSelected,
  onOpen,
  onCopyLink,
  onStatus,
}: {
  assets: MediaAsset[];
  selectedIds: string[];
  onToggleSelected: (id: EntityId) => void;
  onOpen: (asset: MediaAsset) => void;
  onCopyLink: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="space-y-3 p-3 md:hidden">
        {assets.map((asset) => (
          <MediaMobileRow key={asset.id} asset={asset} selected={selectedIds.includes(asset.id)} onToggleSelected={onToggleSelected} onOpen={onOpen} onCopyLink={onCopyLink} onStatus={onStatus} />
        ))}
      </div>
      <table className="hidden w-full md:table">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="w-10 px-4 py-3" />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mídia</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produto</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qualidade</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uso</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {assets.map((asset) => {
            const score = getQualityScore(asset);
            return (
              <tr key={asset.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Checkbox checked={selectedIds.includes(asset.id)} onCheckedChange={() => onToggleSelected(asset.id)} />
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onOpen(asset)} className="flex max-w-xs items-center gap-3 text-left">
                    <AssetThumb asset={asset} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{asset.title || 'Sem título'}</p>
                      <p className="truncate text-xs text-muted-foreground">{asset.type?.replace('_', ' ') || 'mídia'} · {asset.source || 'Origem desconhecida'}</p>
                    </div>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{asset.product_name || '—'}</td>
                <td className="px-4 py-3">
                  <QualityScore score={score} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{asset.status === 'published' ? 'Usada em publicação' : asset.media_asset_id ? 'Usada em vídeo' : 'Disponível'}</td>
                <td className="px-4 py-3"><StatusBadge status={asset.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <AssetMenu asset={asset} onCopyLink={onCopyLink} onOpen={onOpen} onStatus={onStatus} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MediaMobileRow(props: {
  asset: MediaAsset;
  selected: boolean;
  onToggleSelected: (id: EntityId) => void;
  onOpen: (asset: MediaAsset) => void;
  onCopyLink: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
}) {
  const score = getQualityScore(props.asset);
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="flex items-start gap-3">
        <Checkbox checked={props.selected} onCheckedChange={() => props.onToggleSelected(props.asset.id)} />
        <button type="button" onClick={() => props.onOpen(props.asset)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <AssetThumb asset={props.asset} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{props.asset.title || 'Sem título'}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{props.asset.product_name || 'Sem produto'}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={props.asset.status} />
              <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium', getQualityTone(score))}>{getQualityLabel(score)}</span>
            </div>
          </div>
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <AssetMenu asset={props.asset} onCopyLink={props.onCopyLink} onOpen={props.onOpen} onStatus={props.onStatus} />
      </div>
    </div>
  );
}

function GroupedMedia(props: {
  groups: Record<string, MediaAsset[]>;
  selectedIds: string[];
  onToggleSelected: (id: EntityId) => void;
  onOpen: (asset: MediaAsset) => void;
  onCopyLink: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
}) {
  return (
    <div className="space-y-4">
      {Object.entries(props.groups).map(([productName, assets]) => (
        <section key={productName} className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-syne font-bold text-foreground">{productName}</h3>
              <p className="text-xs text-muted-foreground">
                {assets.filter((asset) => asset.type === 'image').length} imagens · {assets.filter(isVideoAsset).length} vídeos · {assets.filter((asset) => asset.status === 'approved').length} aprovadas
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => assets.forEach((asset) => props.onToggleSelected(asset.id))}>
              <Tags className="h-4 w-4" /> Selecionar grupo
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {assets.map((asset) => (
              <MediaCard
                key={asset.id}
                asset={asset}
                selected={props.selectedIds.includes(asset.id)}
                onToggleSelected={props.onToggleSelected}
                onOpen={props.onOpen}
                onCopyLink={props.onCopyLink}
                onStatus={props.onStatus}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MediaDetailsDialog({
  asset,
  open,
  onOpenChange,
  onCopyLink,
  onStatus,
}: {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyLink: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
}) {
  if (!asset) return null;

  const score = getQualityScore(asset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-syne">Preview da mídia</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-2xl bg-muted">
            {assetPreview(asset) ? (
              isVideoAsset(asset) && asset.url ? (
                <video src={asset.url} controls poster={asset.thumbnail_url} className="max-h-[560px] w-full bg-black object-contain" />
              ) : (
                <img src={assetPreview(asset)} alt={asset.title || ''} className="max-h-[560px] w-full object-contain" />
              )
            ) : (
              <div className="flex aspect-video items-center justify-center">
                {isVideoAsset(asset) ? <Film className="h-12 w-12 text-muted-foreground/30" /> : <Image className="h-12 w-12 text-muted-foreground/30" />}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="font-syne text-2xl font-bold text-foreground">{asset.title || 'Sem título'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{asset.product_name || 'Sem produto vinculado'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={asset.status} />
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', getQualityTone(score))}>{getQualityLabel(score)}</span>
              {asset.type === 'generated_video' && <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">IA</span>}
            </div>
            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Score de qualidade</p>
                <span className="text-sm font-bold text-foreground">{score}%</span>
              </div>
              <Progress value={score} />
              <p className="mt-2 text-xs text-muted-foreground">
                {score < 50 ? 'Recomendado revisar resolução, enquadramento ou nitidez.' : score < 80 ? 'Boa para testes, mas pode melhorar antes de publicar.' : 'Ativo forte para criativos e publicações.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DetailBox label="Tipo" value={asset.type?.replace('_', ' ') || 'mídia'} />
              <DetailBox label="Origem" value={asset.source || 'Não informada'} />
              <DetailBox label="Duração" value={asset.duration ? `${asset.duration}s` : 'Não informada'} />
              <DetailBox label="Tamanho" value={asset.file_size ? `${Math.round(asset.file_size / 1024)} KB` : 'Não informado'} />
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Ações rápidas</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="justify-start gap-2" onClick={() => onStatus(asset.id, 'approved', 'Mídia aprovada')}>
                  <CheckCircle className="h-4 w-4" /> Aprovar
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => onStatus(asset.id, 'rejected', 'Mídia rejeitada')}>
                  <XCircle className="h-4 w-4" /> Rejeitar
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => onStatus(asset.id, 'generating', 'Mídia enviada para vídeo')}>
                  <Film className="h-4 w-4" /> Usar para vídeo
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => onStatus(asset.id, 'processing', 'Legenda enviada para geração')}>
                  <Sparkles className="h-4 w-4" /> Criar legenda
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => onStatus(asset.id, 'processing', 'Remoção de fundo preparada')}>
                  <Wand2 className="h-4 w-4" /> Remover fundo
                </Button>
                <Button variant="outline" className="justify-start gap-2" onClick={() => onStatus(asset.id, 'processing', 'Variações enviadas para IA')}>
                  <Bot className="h-4 w-4" /> Gerar variações
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Histórico e links</p>
              <InfoLine label="Link original" value={asset.source_url || asset.url || 'Não informado'} />
              <InfoLine label="Uso" value={asset.status === 'published' ? 'Já usada em publicação' : asset.media_asset_id ? 'Vinculada a vídeo' : 'Ainda disponível'} />
              <InfoLine label="Legenda" value={asset.caption || 'Sem legenda gerada'} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => onCopyLink(asset)}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button className="flex-1 gap-2" onClick={() => asset.url && window.open(asset.url, '_blank')}>
                <Download className="h-4 w-4" /> Abrir mídia
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssetThumb({ asset }: { asset: MediaAsset }) {
  return (
    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
      {assetPreview(asset) ? (
        <img src={assetPreview(asset)} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {isVideoAsset(asset) ? <Film className="h-5 w-5 text-muted-foreground" /> : <Image className="h-5 w-5 text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

function QualityScore({ score }: { score: number }) {
  return (
    <div className="w-32">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{getQualityLabel(score)}</span>
        <span>{score}%</span>
      </div>
      <Progress value={score} />
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/25 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border py-2 first:pt-0 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 break-words text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

function MediaSkeleton({ view }: { view: ViewMode }) {
  if (view === 'list') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse border-b border-border bg-muted/40 last:border-b-0" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {[1, 2, 3, 4, 5].map((item) => <div key={item} className="aspect-square animate-pulse rounded-2xl border border-border bg-card" />)}
    </div>
  );
}

function EmptyLibrary({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Image className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="mb-1 font-syne font-bold text-foreground">Nenhuma mídia encontrada</p>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        Importe mídias manualmente ou aguarde a coleta automática do backend.
      </p>
      <Button size="sm" onClick={onUpload} className="gap-2">
        <Upload className="h-4 w-4" /> Importar mídia
      </Button>
    </div>
  );
}
