import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  LayoutList,
  MoreHorizontal,
  Play,
  Search,
  Tags,
  Trash2,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createMediaAsset, listMediaAssets, updateMediaAsset } from '@/services/mediaAssets';
import { uploadProductImage } from '@/services/uploads';
import { generateVideo } from '@/services/videos';
import type { EntityId, MediaAsset, Status } from '@/types/entities';
import { CampaignMap, FlowGuide, QualityTrafficLight } from '@/components/creative/CreativeVisualKit';
import MediaImportModal, { type UploadForm, type UploadMode } from '@/features/media-library/MediaImportModal';

type ViewMode = 'grid' | 'list' | 'grouped';

const emptyUploadForm: UploadForm = {
  title: '',
  product_name: '',
  url: '',
  thumbnail_url: '',
  caption: '',
};

const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

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

const readRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readString = (value: unknown, fallback = '') => (typeof value === 'string' && value.trim() ? value : fallback);

const readNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const formatUsd = (value: unknown) => {
  const amount = readNumber(value, 0);
  return amount > 0 ? `US$ ${amount.toFixed(4)}` : 'Não informado';
};

const getAssetMetadata = (asset: MediaAsset) => readRecord(asset.metadata);

const getAssetAiVideo = (asset: MediaAsset) => readRecord(getAssetMetadata(asset).ai_video);

const getAssetCost = (asset: MediaAsset) => {
  const metadata = getAssetMetadata(asset);
  const aiVideo = getAssetAiVideo(asset);
  const cost = readRecord(metadata.cost);
  if (Object.keys(cost).length > 0) return cost;
  return readRecord(aiVideo.cost);
};

const getScenePlan = (asset: MediaAsset) => {
  const metadata = getAssetMetadata(asset);
  const scenePlan = readRecord(metadata.scene_plan);
  if (Object.keys(scenePlan).length > 0) return scenePlan;
  return readRecord(metadata.render_plan);
};

const getSceneList = (asset: MediaAsset) => {
  const plan = getScenePlan(asset);
  return readArray(plan.scenes).map(readRecord);
};

const getGenerationVersion = (asset: MediaAsset) => {
  const metadata = getAssetMetadata(asset);
  return readNumber(metadata.generation_version, 1);
};

const getProviderLabel = (asset: MediaAsset) => {
  const cost = getAssetCost(asset);
  const aiVideo = getAssetAiVideo(asset);
  return readString(cost.provider, readString(aiVideo.provider, readString(asset.source, 'Não informado')));
};

const isVideoReferenceImage = (asset: MediaAsset) => {
  const metadata = getAssetMetadata(asset);
  const intendedUse = readString(metadata.intended_use);
  const source = readString(asset.source).toLowerCase();

  return (
    asset.type === 'image' &&
    (
      intendedUse === 'video_generation_reference' ||
      ['upload local', 'url externa', 'upload', 'upload-fallback'].includes(source)
    )
  );
};

export default function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [view, setView] = useState<ViewMode>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('local');
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

  const libraryImages = useMemo(() => assets.filter(isVideoReferenceImage), [assets]);
  const generatedVideos = useMemo(() => assets.filter(isVideoAsset), [assets]);

  const productOptions = useMemo(() => {
    const products = libraryImages.map((asset) => asset.product_name).filter(Boolean) as string[];
    return [...new Set(products)];
  }, [libraryImages]);

  const stats = useMemo(
    () => ({
      total: libraryImages.length,
      images: libraryImages.length,
      videos: generatedVideos.length,
      review: libraryImages.filter((asset) => asset.status === 'pending_review').length,
      approved: libraryImages.filter((asset) => asset.status === 'approved').length,
      rejected: libraryImages.filter((asset) => asset.status === 'rejected').length,
    }),
    [generatedVideos.length, libraryImages],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return libraryImages
      .filter((asset) => {
        const score = getQualityScore(asset);
        const matchesSearch =
          !normalizedSearch ||
          asset.title?.toLowerCase().includes(normalizedSearch) ||
          asset.product_name?.toLowerCase().includes(normalizedSearch) ||
          asset.type?.toLowerCase().includes(normalizedSearch) ||
          asset.source?.toLowerCase().includes(normalizedSearch) ||
          asset.status?.toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesProduct = productFilter === 'all' || asset.product_name === productFilter;
        const matchesQuality =
          qualityFilter === 'all' ||
          (qualityFilter === 'high' && score >= 80) ||
          (qualityFilter === 'medium' && score >= 50 && score < 80) ||
          (qualityFilter === 'low' && score < 50);

        return matchesSearch && matchesStatus && matchesProduct && matchesQuality;
      })
      .sort((first, second) => {
        if (sortBy === 'oldest') return assetDate(first) - assetDate(second);
        if (sortBy === 'quality_desc') return getQualityScore(second) - getQualityScore(first);
        if (sortBy === 'title') return (first.title || '').localeCompare(second.title || '');
        return assetDate(second) - assetDate(first);
      });
  }, [libraryImages, productFilter, qualityFilter, search, sortBy, statusFilter]);

  const groupedAssets = useMemo(() => {
    return filtered.reduce<Record<string, MediaAsset[]>>((groups, asset) => {
      const key = asset.product_name || 'Sem produto vinculado';
      groups[key] = [...(groups[key] || []), asset];
      return groups;
    }, {});
  }, [filtered]);

  const selectedAssets = useMemo(
    () => libraryImages.filter((asset) => selectedIds.includes(asset.id)),
    [libraryImages, selectedIds],
  );
  const smartCollections = useMemo(
    () => [
      {
        label: 'Melhores para vídeo',
        description: 'Imagens aprovadas ou com qualidade alta',
        count: libraryImages.filter((asset) => getQualityScore(asset) >= 80 || asset.status === 'approved').length,
        action: () => {
          setQualityFilter('high');
          setStatusFilter('all');
          setView('grid');
        },
      },
      {
        label: 'Precisam revisão',
        description: 'Baixa qualidade, rejeitados ou pendentes',
        count: libraryImages.filter((asset) => getQualityScore(asset) < 50 || ['pending_review', 'rejected', 'failed'].includes(String(asset.status))).length,
        action: () => {
          setQualityFilter('low');
          setStatusFilter('all');
          setView('list');
        },
      },
      {
        label: 'Prontas para roteiro',
        description: 'Imagens que podem alimentar cenas com IA',
        count: libraryImages.filter((asset) => ['approved', 'pending_review', 'collected'].includes(String(asset.status))).length,
        action: () => {
          setQualityFilter('all');
          setStatusFilter('all');
          setView('grid');
        },
      },
      {
        label: 'Sem anúncio vinculado',
        description: 'Imagens que precisam organização',
        count: libraryImages.filter((asset) => !asset.product_name).length,
        action: () => {
          setSearch('');
          setProductFilter('all');
          setView('list');
          toast.info('Use a busca/lista para localizar mídias sem vínculo e corrigir manualmente.');
        },
      },
    ],
    [libraryImages],
  );
  const campaignOverview = useMemo(() => {
    const groups = libraryImages.reduce<Record<string, MediaAsset[]>>((currentGroups, asset) => {
      const key = asset.product_name || 'Sem anúncio vinculado';
      currentGroups[key] = [...(currentGroups[key] || []), asset];
      return currentGroups;
    }, {});

    return Object.entries(groups)
      .map(([productName, productAssets]) => {
        const averageQuality = Math.round(
          productAssets.reduce((sum, asset) => sum + getQualityScore(asset), 0) / Math.max(1, productAssets.length),
        );
        return {
          productName,
          total: productAssets.length,
          images: productAssets.filter((asset) => asset.type === 'image' || asset.type === 'thumbnail').length,
          videos: productAssets.filter((asset) => isVideoAsset(asset)).length,
          approved: productAssets.filter((asset) => asset.status === 'approved').length,
          averageQuality,
        };
      })
      .sort((first, second) => second.total - first.total)
      .slice(0, 3);
  }, [libraryImages]);
  const primaryCampaign = campaignOverview[0];
  const libraryQuality = Math.round(
    libraryImages.reduce((sum, asset) => sum + getQualityScore(asset), 0) / Math.max(1, libraryImages.length),
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

  const handleGenerateVariation = async (asset: MediaAsset) => {
    if (!asset.product_id) {
      toast.error('Essa mídia não está vinculada a um produto.');
      return;
    }

    try {
      await generateVideo({
        product_id: asset.product_id,
        media_asset_ids: [asset.id],
        style: 'product_demo',
        template: 'variation_from_media_library',
        format: 'reels',
        ratio: '9:16',
        duration: '20s',
        briefing: `Gerar uma variação do criativo "${asset.title || asset.product_name || 'mídia selecionada'}" mantendo o mesmo produto, mas com novo gancho, novas cenas e CTA mais direto.`,
        visual_prompt: readString(getAssetMetadata(asset).prompt, asset.caption || ''),
        script: asset.caption || undefined,
        platform: 'instagram',
      });
      toast.success('Variação enviada para a fila de geração.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar uma variação');
    }
  };

  const resetUploadState = () => {
    setUploadForm(emptyUploadForm);
    setUploadFile(null);
    setUploadMode('local');
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim()) {
      toast.error('Informe um título para organizar a mídia.');
      return;
    }

    if (!uploadForm.product_name.trim()) {
      toast.error('Associe a mídia a um produto.');
      return;
    }

    if (uploadMode === 'url' && !uploadForm.url.trim()) {
      toast.error('Informe a URL direta da imagem.');
      return;
    }

    if (uploadMode === 'local' && !uploadFile) {
      toast.error('Selecione uma imagem local.');
      return;
    }

    if (uploadFile && !uploadFile.type.startsWith('image/')) {
      toast.error('Esse fluxo aceita apenas imagens para referência de vídeo.');
      return;
    }

    if (uploadFile && uploadFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      toast.error('Imagem muito grande. Envie um arquivo de até 8 MB para salvar na biblioteca.');
      return;
    }

    setSavingUpload(true);
    try {
      const metadata = {
        import_mode: uploadMode,
        intended_use: 'video_generation_reference',
        original_file_name: uploadFile?.name,
      };
      let savedAsset: MediaAsset | undefined;

      if (uploadMode === 'local' && uploadFile) {
        const result = await uploadProductImage(uploadFile, undefined, {
          title: uploadForm.title.trim(),
          product_name: uploadForm.product_name.trim(),
          caption: uploadForm.caption,
          status: 'pending_review',
          source: 'Upload local',
          quality_score: 72,
          metadata,
        });
        savedAsset = result.asset;
      } else {
        const url = uploadForm.url.trim();
        savedAsset = await createMediaAsset({
          title: uploadForm.title.trim(),
          product_name: uploadForm.product_name.trim(),
          type: 'image',
          url,
          thumbnail_url: uploadForm.thumbnail_url || url,
          source: 'URL externa',
          caption: uploadForm.caption,
          status: 'pending_review',
          quality_score: 72,
          metadata,
        });
      }
      if (savedAsset) {
        setAssets((current) => [savedAsset, ...current.filter((asset) => asset.id !== savedAsset.id)]);
      }
      toast.success('Imagem salva na biblioteca e pronta para futuros vídeos');

      setShowUpload(false);
      resetUploadState();
      void load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível importar a mídia');
    } finally {
      setSavingUpload(false);
    }
  };

  return (
    <div>
      <TopBar title="Biblioteca de Mídia" subtitle="Central de ativos criativos, revisão e preparação para IA" />
      <div className="mobile-page-pad page-stack">
        <div className="responsive-card responsive-card-pad">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-start">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar imagem por anúncio, título ou status..."
                className="h-11 rounded-2xl pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:flex">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 rounded-2xl xl:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="h-11 rounded-2xl xl:w-44"><SelectValue placeholder="Anúncio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos anúncios</SelectItem>
                  {productOptions.map((product) => <SelectItem key={product} value={product}>{product}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={qualityFilter} onValueChange={setQualityFilter}>
                <SelectTrigger className="h-11 rounded-2xl xl:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{qualityOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 rounded-2xl xl:w-40"><SelectValue /></SelectTrigger>
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
              <span>{filtered.length} de {libraryImages.length} imagens</span>
              {selectedIds.length > 0 && <span className="font-medium text-primary">{selectedIds.length} selecionadas</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="outline" className="min-w-0 gap-2 rounded-xl" onClick={() => handleBulkStatus('approved', 'Mídias aprovadas')}>
                    <CheckCircle className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="min-w-0 gap-2 rounded-xl" onClick={() => handleBulkStatus('rejected', 'Mídias rejeitadas')}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                  <Button size="sm" variant="outline" className="min-w-0 gap-2 rounded-xl" onClick={() => handleBulkStatus('generating', 'Mídias enviadas para geração de vídeo')}>
                    <Film className="h-4 w-4" /> Enviar para vídeo
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Limpar</Button>
                </>
              )}
              <div className="flex rounded-2xl border border-border bg-muted p-1">
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
              <Button size="sm" className="gap-2 rounded-xl" onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4" /> Importar mídia
              </Button>
            </div>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {smartCollections.map((collection) => (
            <button
              key={collection.label}
              type="button"
              onClick={collection.action}
              className="rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-black/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-syne text-sm font-bold text-foreground">{collection.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{collection.description}</p>
                </div>
                <span className="rounded-2xl bg-primary/10 px-3 py-1 font-syne text-sm font-bold text-primary">{collection.count}</span>
              </div>
            </button>
          ))}
        </section>

        {!loading && libraryImages.length > 0 && (
          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <CampaignMap
              title={primaryCampaign?.productName || 'Biblioteca criativa'}
              productCount={campaignOverview.length}
              mediaCount={primaryCampaign?.images || stats.images}
              videoCount={primaryCampaign?.videos || stats.videos}
              scheduledCount={primaryCampaign?.approved || stats.approved}
            />
            <QualityTrafficLight score={primaryCampaign?.averageQuality || libraryQuality} label="Semáforo da biblioteca" />
          </section>
        )}

        {!loading && campaignOverview.length > 0 && (
          <section className="responsive-card responsive-card-pad">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Campanhas agrupadas</p>
                <h3 className="mt-1 font-syne text-lg font-bold text-foreground">Prontidão por anúncio</h3>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setView('grouped')}>
                Ver agrupado
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {campaignOverview.map((campaign) => (
                <button
                  key={campaign.productName}
                  type="button"
                  onClick={() => {
                    setProductFilter(campaign.productName === 'Sem anúncio vinculado' ? 'all' : campaign.productName);
                    setView('grouped');
                  }}
                  className="rounded-2xl border border-border bg-muted/20 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-syne text-sm font-bold text-foreground">{campaign.productName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{campaign.total} mídia(s) organizadas</p>
                    </div>
                    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold', getQualityTone(campaign.averageQuality))}>
                      {campaign.averageQuality}%
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-background/70 p-2">
                      <p className="font-syne text-base font-bold text-foreground">{campaign.images}</p>
                      <p className="text-[10px] text-muted-foreground">Imagens</p>
                    </div>
                    <div className="rounded-xl bg-background/70 p-2">
                      <p className="font-syne text-base font-bold text-foreground">{campaign.videos}</p>
                      <p className="text-[10px] text-muted-foreground">Vídeos</p>
                    </div>
                    <div className="rounded-xl bg-background/70 p-2">
                      <p className="font-syne text-base font-bold text-foreground">{campaign.approved}</p>
                      <p className="text-[10px] text-muted-foreground">Aprov.</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && libraryImages.length > 0 && (
          <FlowGuide
            title="Preparar material para vídeos melhores"
            items={[
              { label: 'Organize por anúncio', description: 'Agrupe mídias pela campanha para encontrar rápido o que já está pronto.', icon: FolderKanban },
              { label: 'Aprove os melhores', description: 'Use o semáforo de qualidade para separar assets bons dos que precisam revisão.', icon: CheckCircle },
              { label: 'Envie para vídeo', description: 'Selecione imagens e vídeos aprovados como base para o criativo IA.', icon: Film },
            ]}
          />
        )}

        {!loading && generatedVideos.length > 0 && (
          <section className="responsive-card responsive-card-pad">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Galeria de vídeos</p>
                <h3 className="mt-1 font-syne text-lg font-bold text-foreground">Criativos finais gerados</h3>
                <p className="mt-1 text-sm text-muted-foreground">Vídeos prontos ou em revisão ficam separados das imagens de referência.</p>
              </div>
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {generatedVideos.length} vídeo(s)
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {generatedVideos.slice(0, 6).map((asset) => (
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
          </section>
        )}

        {error ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <MediaSkeleton view={view} />
        ) : filtered.length === 0 ? (
          <EmptyLibrary onUpload={() => setShowUpload(true)} />
        ) : view === 'grid' ? (
          <div className="responsive-grid">
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
        onGenerateVariation={handleGenerateVariation}
      />

      <MediaImportModal
        open={showUpload}
        onOpenChange={(open) => {
          setShowUpload(open);
          if (!open) resetUploadState();
        }}
        uploadMode={uploadMode}
        onUploadModeChange={setUploadMode}
        uploadForm={uploadForm}
        onUploadFormChange={setUploadForm}
        uploadFile={uploadFile}
        onUploadFileChange={setUploadFile}
        uploadPreview={uploadPreview}
        savingUpload={savingUpload}
        onSave={handleUpload}
      />
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
    <div className={cn('group overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/[0.07]', selected ? 'border-primary ring-2 ring-primary/15' : 'border-border')}>
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
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
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <Button size="sm" className="h-8 flex-1 gap-1 rounded-xl" onClick={() => onOpen(asset)}>
            <Eye className="h-3.5 w-3.5" /> Ver
          </Button>
          <AssetMenu asset={asset} onCopyLink={onCopyLink} onOpen={onOpen} onStatus={onStatus} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={() => onOpen(asset)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-foreground">{asset.title || 'Sem título'}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{asset.product_name || 'Sem produto'}</p>
          </button>
          <StatusBadge status={asset.status} className="text-[10px]" />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
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
      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-xl" onClick={(event) => event.stopPropagation()}>
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
                      <p className="truncate text-xs text-muted-foreground">{asset.type?.replace('_', ' ') || 'mídia'} · {asset.source || 'Entrada não informada'}</p>
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
        <section key={productName} className="rounded-3xl border border-border bg-card p-4 sm:p-5">
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
  onGenerateVariation,
}: {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyLink: (asset: MediaAsset) => void;
  onStatus: (id: EntityId, status: Status, message: string) => void;
  onGenerateVariation: (asset: MediaAsset) => void;
}) {
  if (!asset) return null;

  const score = getQualityScore(asset);
  const preview = assetPreview(asset);
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const shortId = String(asset.id || '').slice(0, 10) || 'sem_id';
  const metadata = getAssetMetadata(asset);
  const cost = getAssetCost(asset);
  const scenePlan = getScenePlan(asset);
  const scenes = getSceneList(asset);
  const aiVideo = getAssetAiVideo(asset);
  const provider = getProviderLabel(asset);
  const model = readString(cost.model, readString(aiVideo.model, readString(metadata.model, 'Modelo não informado')));
  const estimatedCost = formatUsd(cost.estimated_cost_usd ?? metadata.estimated_cost_usd);
  const segments = readNumber(cost.segments, readNumber(aiVideo.segments, scenes.length || 1));
  const generationVersion = getGenerationVersion(asset);
  const prompt = readString(metadata.prompt, readString(metadata.ai_prompt, asset.caption || 'Prompt não registrado para esta mídia.'));
  const durationSeconds = readNumber(cost.duration_seconds, readNumber(asset.duration, 0));
  const reviewMessage =
    score < 50
      ? 'Revisar antes de publicar - qualidade baixa detectada'
      : score < 80
        ? 'Bom para testes - vale revisar antes do disparo'
        : 'Pronto para divulgação - ativo com boa qualidade';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[94dvh] !w-[calc(100vw-0.75rem)] !max-w-none flex-col overflow-hidden rounded-t-[1.5rem] border-border bg-card p-0 text-foreground shadow-2xl sm:!h-[90dvh] sm:!w-[calc(100vw-2rem)] sm:rounded-[1.5rem] lg:!h-[min(88dvh,860px)] lg:!w-[min(92vw,1280px)] xl:!h-[min(86dvh,900px)] xl:!w-[min(88vw,1380px)]">
        <DialogHeader className="shrink-0 border-b border-border bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))] px-4 py-3 pr-10 sm:px-6 sm:py-4 sm:pr-12">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20 sm:h-11 sm:w-11">
              {isVideoAsset(asset) ? <Film className="h-4 w-4" /> : <Image className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="line-clamp-2 font-syne text-base font-bold leading-tight text-foreground sm:line-clamp-1 sm:text-lg">
                {asset.title || 'Preview da mídia'}
              </DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {asset.product_name || 'Sem anúncio vinculado'}
              </DialogDescription>
            </div>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <StatusBadge status={asset.status} />
              <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-semibold', getQualityTone(score))}>{getQualityLabel(score)} · {normalizedScore}%</span>
              {asset.type === 'generated_video' && <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">IA</span>}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Visualize a mídia selecionada, revise qualidade, detalhes técnicos e ações rápidas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(560px,1.2fr)_minmax(480px,0.8fr)] lg:overflow-hidden">
          <section className="flex min-h-[52dvh] flex-col items-center gap-3 border-b border-border bg-muted/35 p-3 sm:min-h-[620px] sm:gap-4 sm:p-5 md:p-6 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-[320px] w-full max-w-[720px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/10 sm:rounded-3xl lg:min-h-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,hsl(var(--primary)/0.12),transparent_38%)]" />
              {preview ? (
                isVideoAsset(asset) && asset.url ? (
                  <video src={asset.url} controls poster={asset.thumbnail_url} className="relative h-full w-full bg-black object-contain" />
                ) : (
                  <img src={preview} alt={asset.title || ''} className="relative h-full w-full object-cover" />
                )
              ) : (
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
                  <Play className="ml-0.5 h-5 w-5 fill-muted-foreground/25 text-muted-foreground/25" />
                </div>
              )}
            </div>
            <div className="flex w-full max-w-[720px] shrink-0 items-center justify-between gap-3 px-1">
              <span className="font-syne text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {preview ? 'Prévia da mídia' : 'Prévia indisponível'}
              </span>
              <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                {isVideoAsset(asset) ? 'Vídeo' : 'Imagem'}
              </span>
            </div>
            <div className={cn('w-full max-w-[720px] shrink-0 rounded-2xl border p-3', score >= 80 ? 'border-success/20 bg-success/10' : score >= 50 ? 'border-warning/20 bg-warning/10' : 'border-destructive/20 bg-destructive/10')}>
              <div className="mb-2 flex items-center justify-between">
                <span className={cn('text-[10px] font-semibold', score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-destructive')}>Qualidade</span>
                <span className="font-syne text-xs font-bold text-foreground">{normalizedScore}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                <div
                  className={cn('h-full rounded-full transition-all', score >= 80 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-gradient-to-r from-destructive to-primary')}
                  style={{ width: `${normalizedScore}%` }}
                />
              </div>
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:overflow-hidden">
            <div className={cn('shrink-0 rounded-2xl border p-4 sm:rounded-3xl', score >= 80 ? 'border-success/20 bg-success/10' : score >= 50 ? 'border-warning/20 bg-warning/10' : 'border-destructive/20 bg-destructive/10')}>
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Qualidade do ativo</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{getQualityLabel(score)}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{reviewMessage}</p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/80 font-syne text-lg font-bold text-foreground shadow-sm sm:h-16 sm:w-16 sm:text-xl">
                  {normalizedScore}%
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70">
                <div
                  className={cn('h-full rounded-full transition-all', score >= 80 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-gradient-to-r from-destructive to-primary')}
                  style={{ width: `${normalizedScore}%` }}
                />
              </div>
            </div>

            <div className="shrink-0">
              <p className="mb-3 font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Metadados</p>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3">
                <PreviewMetaBox label="Tipo" value={asset.type?.replace('_', ' ') || 'mídia'} />
                <PreviewMetaBox label="Entrada" value={asset.source || 'Não informada'} />
                <PreviewMetaBox label="Duração" value={asset.duration ? `${asset.duration}s`.replace('ss', 's') : 'Não informada'} muted={!asset.duration} />
                <PreviewMetaBox label="Tamanho" value={asset.file_size ? `${Math.round(asset.file_size / 1024)} KB` : 'Não informado'} muted={!asset.file_size} />
                <PreviewMetaBox label="Provider" value={provider} muted={provider === 'Não informado'} />
                <PreviewMetaBox label="Modelo" value={model} muted={model === 'Modelo não informado'} />
                <PreviewMetaBox label="Custo" value={estimatedCost} muted={estimatedCost === 'Não informado'} />
                <PreviewMetaBox label="Versão" value={`v${generationVersion} · ${segments} segmento${segments === 1 ? '' : 's'}`} />
              </div>
            </div>

            <div className="shrink-0">
              <p className="mb-3 font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Ações</p>
              <div className="grid gap-2 min-[420px]:grid-cols-2 sm:gap-3">
                <Button className="h-12 gap-2 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => asset.url && window.open(asset.url, '_blank')}>
                  <Download className="h-3.5 w-3.5" /> Abrir mídia
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => onStatus(asset.id, 'approved', 'Mídia aprovada')}>
                  <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => onStatus(asset.id, 'generating', 'Mídia enviada para vídeo')}>
                  <Film className="h-3.5 w-3.5" /> Usar em vídeo
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => onCopyLink(asset)}>
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </Button>
                {isVideoAsset(asset) && (
                  <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card min-[420px]:col-span-2" onClick={() => onGenerateVariation(asset)}>
                    <Wand2 className="h-3.5 w-3.5" /> Gerar variação com IA
                  </Button>
                )}
              </div>
            </div>

            <div className="grid shrink-0 gap-3 lg:grid-cols-2">
              <InfoLine label="Prompt original" value={prompt} compact />
              <InfoLine
                label="Resumo do plano"
                value={`${readString(scenePlan.style, readString(scenePlan.template, 'Template não informado'))} · ${durationSeconds || asset.duration || 'duração não informada'} · ${segments} segmento${segments === 1 ? '' : 's'}`}
                compact
              />
            </div>

            {scenes.length > 0 && (
              <div className="shrink-0 rounded-2xl border border-border bg-muted/25 p-4 sm:rounded-3xl">
                <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Plano de cenas</p>
                <div className="mt-3 grid gap-2">
                  {scenes.slice(0, 4).map((scene, index) => (
                    <div key={`${readString(scene.id, `scene_${index}`)}-${index}`} className="rounded-2xl border border-border bg-background/70 p-3">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="font-syne text-xs font-bold text-foreground">Cena {index + 1}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {readNumber(scene.duration, readNumber(scene.duration_seconds, 0)) || 'auto'}s
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {readString(scene.locked_instruction, readString(scene.visual, readString(scene.title, 'Cena sem instrução registrada.')))}
                      </p>
                      {readString(scene.on_screen_text) && (
                        <p className="mt-2 rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
                          Texto: {readString(scene.on_screen_text)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="min-h-[150px] rounded-2xl border border-border bg-muted/25 p-4 sm:min-h-[170px] sm:rounded-3xl lg:flex-1">
              <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Legenda</p>
              <p className="mt-2 line-clamp-7 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {asset.caption || 'Sem legenda gerada'}
              </p>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
          <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
            <XCircle className={cn('h-3.5 w-3.5 shrink-0', score < 50 ? 'text-destructive' : score < 80 ? 'text-warning' : 'text-success')} />
            <span className="truncate">{reviewMessage}</span>
          </span>
          <span className="shrink-0 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">
            {shortId}
          </span>
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

function QualityRing({ score }: { score: number }) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const visibleScore = normalizedScore === 0 ? 3 : normalizedScore;
  const color = normalizedScore >= 80 ? 'hsl(var(--success))' : normalizedScore >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <div
      className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full p-[3px] shadow-sm"
      style={{
        background: `conic-gradient(${color} ${visibleScore * 3.6}deg, hsl(var(--border)) ${visibleScore * 3.6}deg)`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-card shadow-inner">
        <div className="text-center">
          <p className="font-syne text-lg font-bold leading-none text-foreground">{normalizedScore}%</p>
          <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">score</p>
        </div>
      </div>
      <span
        className="absolute inset-0 rounded-full opacity-20 blur-md"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function PreviewMetaBox({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/25 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40">
      <p className="font-syne text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 line-clamp-1 font-syne text-xs font-semibold', muted ? 'text-muted-foreground' : 'text-foreground')}>{value}</p>
    </div>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-2 break-words text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function InfoLine({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-3">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className={cn('mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground', compact && 'line-clamp-2')}>{value}</p>
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
