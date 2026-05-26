import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot,
  CheckCircle,
  Copy,
  Eye,
  Film,
  Filter,
  Grid2X2,
  Image,
  LayoutList,
  Link2,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { analyzeProduct, createProduct, deleteProduct, listProducts, updateProduct } from '@/services/products';
import { collectMedia } from '@/services/mediaAssets';
import { generateVideo } from '@/services/videos';
import { searchMarketplaceOffers, type MarketplaceSearchItem, type MarketplaceSearchPlatform } from '@/services/marketplaceSearch';
import type { EntityId, Product, Status } from '@/types/entities';
import { cn } from '@/lib/utils';
import { fileToDataUrl } from '@/lib/fileToDataUrl';

const categories = ['Eletrônicos', 'Moda', 'Casa & Decoração', 'Beleza', 'Esportes', 'Alimentos', 'Brinquedos', 'Outro'];

const statusOptions = [
  { value: 'all', label: 'Todos os status' },
  { value: 'draft', label: 'Novo / Rascunho' },
  { value: 'analyzing', label: 'Analisando' },
  { value: 'collecting', label: 'Coletando mídias' },
  { value: 'generating', label: 'Gerando vídeo' },
  { value: 'review', label: 'Aguardando aprovação' },
  { value: 'approved', label: 'Pronto para publicar' },
  { value: 'failed', label: 'Com erro' },
];

const mediaOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'with_media', label: 'Com mídia' },
  { value: 'without_media', label: 'Sem mídia' },
];

const sortOptions = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'name', label: 'Nome A-Z' },
  { value: 'price_desc', label: 'Maior preço' },
];

type ViewMode = 'grid' | 'list';

type ProductForm = {
  name: string;
  source_url: string;
  image_url: string;
  category: string;
  description: string;
  brand: string;
  price: string;
  cost_price: string;
  sku: string;
  internal_code: string;
  supplier_name: string;
  supplier_contact: string;
  supplier_lead_time_days: string;
  stock_quantity: string;
  min_stock: string;
  marketplace_origin: string;
};

const emptyForm: ProductForm = {
  name: '',
  source_url: '',
  image_url: '',
  category: '',
  description: '',
  brand: '',
  price: '',
  cost_price: '',
  sku: '',
  internal_code: '',
  supplier_name: '',
  supplier_contact: '',
  supplier_lead_time_days: '',
  stock_quantity: '',
  min_stock: '',
  marketplace_origin: '',
};

const isValidUrl = (value: string) => {
  if (!value.trim()) return true;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const getProductDate = (product: Product) =>
  new Date(product.created_at || product.updated_at || 0).getTime();

const getProductPrice = (product: Product) => Number(product.price || 0);
const productImage = (product: Product) => product.image_url || product.uploaded_image_url || '';

const getPipelineStage = (product: Product) => {
  if (product.status === 'approved' || product.status === 'scheduled' || product.status === 'published') {
    return 'Pronto';
  }
  if (product.videos_generated && product.videos_generated > 0) {
    return 'Vídeo gerado';
  }
  if (product.media_count && product.media_count > 0) {
    return 'Mídias coletadas';
  }
  if (product.status === 'review' || product.status === 'pending_review') {
    return 'Aguardando aprovação';
  }
  if (product.status === 'analyzing') {
    return 'Análise IA';
  }
  return 'Entrada';
};

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [marketplacePlatform, setMarketplacePlatform] = useState<MarketplaceSearchPlatform>('mercadolivre');
  const [marketplaceQuery, setMarketplaceQuery] = useState('');
  const [marketplaceResults, setMarketplaceResults] = useState<MarketplaceSearchItem[]>([]);
  const [marketplaceMessage, setMarketplaceMessage] = useState('');
  const [searchingMarketplace, setSearchingMarketplace] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await listProducts('-created_date', 50);
      setProducts(data);
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
    if (!imageFile) {
      setImagePreview('');
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  const productCategories = useMemo(() => {
    const currentCategories = products.map((product) => product.category).filter(Boolean) as string[];
    return [...new Set([...categories, ...currentCategories])];
  }, [products]);

  const stats = useMemo(
    () => ({
      total: products.length,
      analyzing: products.filter((product) => product.status === 'analyzing').length,
      withVideos: products.filter((product) => (product.videos_generated || 0) > 0).length,
      ready: products.filter((product) => ['approved', 'scheduled', 'published'].includes(product.status || '')).length,
      failed: products.filter((product) => product.status === 'failed').length,
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products
      .filter((product) => {
        const matchesSearch =
          !normalizedSearch ||
          product.name?.toLowerCase().includes(normalizedSearch) ||
          product.category?.toLowerCase().includes(normalizedSearch) ||
          product.description?.toLowerCase().includes(normalizedSearch) ||
          product.source_url?.toLowerCase().includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        const hasMedia = Boolean(product.image_url || product.uploaded_image_url || (product.media_count || 0) > 0);
        const matchesMedia =
          mediaFilter === 'all' ||
          (mediaFilter === 'with_media' && hasMedia) ||
          (mediaFilter === 'without_media' && !hasMedia);

        return matchesSearch && matchesStatus && matchesCategory && matchesMedia;
      })
      .sort((first, second) => {
        if (sortBy === 'oldest') return getProductDate(first) - getProductDate(second);
        if (sortBy === 'name') return first.name.localeCompare(second.name);
        if (sortBy === 'price_desc') return getProductPrice(second) - getProductPrice(first);
        return getProductDate(second) - getProductDate(first);
      });
  }, [categoryFilter, mediaFilter, products, search, sortBy, statusFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nome do anúncio base é obrigatório');
      return;
    }

    if (!isValidUrl(form.source_url) || !isValidUrl(form.image_url)) {
      toast.error('Confira se os links estão completos, começando com http ou https.');
      return;
    }

    if (form.price && Number.isNaN(Number(form.price))) {
      toast.error('Informe um preço válido.');
      return;
    }

    if (form.cost_price && Number.isNaN(Number(form.cost_price))) {
      toast.error('Informe um custo válido.');
      return;
    }

    setSaving(true);
    try {
      const price = form.price ? Number(form.price) : undefined;
      const costPrice = form.cost_price ? Number(form.cost_price) : undefined;
      const uploadedImageUrl = imageFile ? await fileToDataUrl(imageFile) : undefined;
      await createProduct({
        ...form,
        input_source: imageFile ? 'image_upload' : form.source_url ? 'product_url' : 'manual',
        uploaded_image_url: uploadedImageUrl,
        price,
        cost_price: costPrice,
        margin_percent: price && costPrice ? Math.round(((price - costPrice) / price) * 100) : undefined,
        supplier_lead_time_days: form.supplier_lead_time_days ? Number(form.supplier_lead_time_days) : undefined,
        stock_quantity: form.stock_quantity ? Number(form.stock_quantity) : undefined,
        min_stock: form.min_stock ? Number(form.min_stock) : undefined,
        status: 'analyzing',
      });
      toast.success('Anúncio base adicionado e enviado para análise!');
      setShowModal(false);
      resetForm();
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível adicionar o anúncio base');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: EntityId) => {
    try {
      await deleteProduct(id);
      toast.success('Anúncio base removido');
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
      load();
    } catch {
      toast.error('Não foi possível remover o anúncio base');
    }
  };

  const handleStatusChange = async (id: EntityId, status: Status, message = 'Status atualizado') => {
    try {
      await updateProduct(id, { status });
      toast.success(message);
      setSelectedProduct((current) => (current?.id === id ? { ...current, status } : current));
      load();
    } catch {
      toast.error('Não foi possível atualizar o status');
    }
  };

  const handleAnalyze = async (product: Product) => {
    try {
      await analyzeProduct({ product_id: product.id, source_url: product.source_url });
      await updateProduct(product.id, { status: 'analyzing' });
      toast.success('Análise enviada para a fila');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a análise');
    }
  };

  const handleCollectMedia = async (product: Product) => {
    try {
      await collectMedia({ product_id: product.id, query: product.name, sources: ['web', 'youtube', 'marketplaces'] });
      await updateProduct(product.id, { status: 'collecting' });
      toast.success('Coleta de mídias enviada para a fila');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a coleta');
    }
  };

  const handleGenerateVideo = async (product: Product) => {
    try {
      await generateVideo({
        product_id: product.id,
        media_asset_ids: [],
        style: 'product',
        duration: '30s',
        briefing: product.description || `Crie um vídeo curto sobre ${product.name}`,
        platform: 'instagram',
      });
      await updateProduct(product.id, {
        status: 'generating',
        videos_generated: (product.videos_generated || 0) + 1,
      });
      toast.success('Geração de vídeo enviada para a fila');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar a geração de vídeo');
    }
  };

  const handleMarketplaceSearch = async () => {
    if (marketplaceQuery.trim().length < 2) {
      toast.error('Digite o que deseja pesquisar.');
      return;
    }

    setSearchingMarketplace(true);
    setMarketplaceMessage('');
    try {
      const result = await searchMarketplaceOffers(marketplacePlatform, marketplaceQuery.trim(), 8);
      setMarketplaceResults(result.items || []);
      setMarketplaceMessage(result.message || '');
      if (!result.items?.length) {
        toast.info(result.message || 'Nenhuma oferta encontrada.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível pesquisar ofertas.');
    } finally {
      setSearchingMarketplace(false);
    }
  };

  const importMarketplaceOffer = async (item: MarketplaceSearchItem) => {
    setSaving(true);
    try {
      await createProduct({
        name: item.title,
        source_url: item.url,
        image_url: item.image_url,
        category: item.category_id || 'Oferta importada',
        description: [
          `Oferta importada de ${item.platform === 'mercadolivre' ? 'Mercado Livre' : 'Shopee'}.`,
          item.description,
          item.url ? `Link original: ${item.url}` : '',
          item.seller_name ? `Parceiro/vendedor: ${item.seller_name}` : '',
        ].filter(Boolean).join('\n'),
        price: item.price,
        currency: item.currency || 'BRL',
        marketplace_origin: item.platform,
        supplier_name: item.seller_name,
        input_source: 'product_url',
        status: 'analyzing',
      });
      toast.success('Oferta importada como anúncio base.');
      setMarketplaceResults([]);
      setMarketplaceQuery('');
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível importar a oferta.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await createProduct({
        name: `${product.name} - cópia`,
        source_url: product.source_url,
        image_url: product.image_url,
        uploaded_image_url: product.uploaded_image_url,
        category: product.category,
        description: product.description,
        brand: product.brand,
        price: product.price,
        cost_price: product.cost_price,
        margin_percent: product.margin_percent,
        sku: product.sku,
        internal_code: product.internal_code,
        supplier_name: product.supplier_name,
        supplier_contact: product.supplier_contact,
        supplier_lead_time_days: product.supplier_lead_time_days,
        stock_quantity: product.stock_quantity,
        min_stock: product.min_stock,
        marketplace_origin: product.marketplace_origin,
        input_source: product.input_source || 'manual',
        status: 'draft',
      });
      toast.success('Anúncio base duplicado');
      load();
    } catch {
      toast.error('Não foi possível duplicar o anúncio base');
    }
  };

  return (
    <div>
      <TopBar title="Anúncios Base" subtitle="Cole o anúncio pronto do parceiro e transforme em roteiros, criativos e vídeos para divulgação" />
      <div className="mobile-page-pad page-stack">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ProductMetric label="Total" value={stats.total} icon={Package} />
          <ProductMetric label="Aguardando análise" value={stats.analyzing} icon={Bot} tone="primary" />
          <ProductMetric label="Com vídeos" value={stats.withVideos} icon={Film} tone="accent" />
          <ProductMetric label="Prontos" value={stats.ready} icon={CheckCircle} tone="success" />
          <ProductMetric label="Com erro" value={stats.failed} icon={X} tone="destructive" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Pesquisar ofertas para transformar em vídeo</p>
                </div>
                <Input
                  value={marketplaceQuery}
                  onChange={(event) => setMarketplaceQuery(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleMarketplaceSearch()}
                  placeholder="Ex: garrafa térmica, ring light, fone bluetooth..."
                />
              </div>
              <Select value={marketplacePlatform} onValueChange={(value) => setMarketplacePlatform(value as MarketplaceSearchPlatform)}>
                <SelectTrigger className="lg:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                </SelectContent>
              </Select>
              <Button className="gap-2" onClick={handleMarketplaceSearch} disabled={searchingMarketplace}>
                <Search className="h-4 w-4" />
                {searchingMarketplace ? 'Pesquisando...' : 'Pesquisar'}
              </Button>
            </div>

            {marketplaceMessage && <p className="mt-3 text-xs text-muted-foreground">{marketplaceMessage}</p>}
            {marketplaceResults.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {marketplaceResults.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="aspect-video bg-muted">
                      {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ShoppingBag className="h-6 w-6 text-muted-foreground" /></div>}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.seller_name || item.platform}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-primary">{item.price ? `R$ ${Number(item.price).toFixed(2)}` : 'Sem preço'}</span>
                        <Button size="sm" className="h-8" onClick={() => importMarketplaceOffer(item)} disabled={saving}>Importar</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, categoria, descrição ou link..."
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:flex">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 lg:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 lg:w-44">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {productCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={mediaFilter} onValueChange={setMediaFilter}>
                <SelectTrigger className="h-10 lg:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mediaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 lg:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {filtered.length} de {products.length} anúncios encontrados
            </div>
            <div className="flex gap-2">
              <div className="flex rounded-xl border border-border bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn('rounded-lg p-2 text-muted-foreground transition-colors', viewMode === 'grid' && 'bg-card text-foreground shadow-sm')}
                  aria-label="Visualizar em grade"
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn('rounded-lg p-2 text-muted-foreground transition-colors', viewMode === 'list' && 'bg-card text-foreground shadow-sm')}
                  aria-label="Visualizar em lista"
                >
                  <LayoutList className="h-4 w-4" />
                </button>
              </div>
              <Button className="gap-2" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Novo Anúncio
              </Button>
            </div>
          </div>
        </div>

        {error ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <ProductSkeleton viewMode={viewMode} />
        ) : filtered.length === 0 ? (
          <EmptyProducts onAdd={() => setShowModal(true)} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onOpen={setSelectedProduct}
                onStatusChange={handleStatusChange}
                onAnalyze={handleAnalyze}
                onCollectMedia={handleCollectMedia}
                onGenerateVideo={handleGenerateVideo}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {filtered.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onOpen={setSelectedProduct}
                onStatusChange={handleStatusChange}
                onAnalyze={handleAnalyze}
                onCollectMedia={handleCollectMedia}
                onGenerateVideo={handleGenerateVideo}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-syne">Novo Anúncio Base</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-foreground">Entrada do anúncio pronto</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cole o link do anúncio, envie um print/criativo ou descreva a oferta recebida do parceiro. A IA usa isso para criar roteiro e vídeo.
              </p>
            </div>

            <div>
              <Label>Nome do anúncio/oferta *</Label>
              <Input placeholder="ex: Oferta HydraMax - Garrafa Térmica" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Marca</Label>
                <Input placeholder="ex: Nike" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Valor/oferta (R$)</Label>
                <Input type="number" min="0" step="0.01" placeholder="299.90" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/25 p-4">
              <p className="text-sm font-semibold text-foreground">Dados de colaboração</p>
              <p className="mt-1 text-xs text-muted-foreground">Campos opcionais para rastrear parceiro, campanha, comissão e origem do anúncio.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Código da campanha</Label>
                  <Input placeholder="CAMP-HYDRAMAX-01" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Seu código interno</Label>
                  <Input placeholder="COLAB-001" value={form.internal_code} onChange={(event) => setForm({ ...form, internal_code: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Origem do anúncio</Label>
                  <Input placeholder="Link do parceiro, Meta Ads, TikTok, loja..." value={form.marketplace_origin} onChange={(event) => setForm({ ...form, marketplace_origin: event.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Comissão estimada (R$)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="30.00" value={form.cost_price} onChange={(event) => setForm({ ...form, cost_price: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input type="number" min="0" placeholder="1" value={form.stock_quantity} onChange={(event) => setForm({ ...form, stock_quantity: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Meta de posts</Label>
                  <Input type="number" min="0" placeholder="5" value={form.min_stock} onChange={(event) => setForm({ ...form, min_stock: event.target.value })} className="mt-1" />
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Parceiro/empresa</Label>
                  <Input placeholder="Nome do parceiro" value={form.supplier_name} onChange={(event) => setForm({ ...form, supplier_name: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Contato do parceiro</Label>
                  <Input placeholder="WhatsApp, email..." value={form.supplier_contact} onChange={(event) => setForm({ ...form, supplier_contact: event.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Prazo da campanha (dias)</Label>
                  <Input type="number" min="0" placeholder="7" value={form.supplier_lead_time_days} onChange={(event) => setForm({ ...form, supplier_lead_time_days: event.target.value })} className="mt-1" />
                </div>
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Link2 className="h-3.5 w-3.5" />Link do anúncio pronto</Label>
              <Input placeholder="https://site-do-parceiro.com/anuncio-ou-oferta" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Image className="h-3.5 w-3.5" />URL da Imagem</Label>
              <Input placeholder="https://..." value={form.image_url} onChange={(event) => setForm({ ...form, image_url: event.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <UploadCloud className="h-3.5 w-3.5" />
                Print/criativo do anúncio
              </Label>
              <div className="mt-1.5 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                {imagePreview ? (
                  <div className="flex items-center gap-3">
                    <img src={imagePreview} alt="Preview do anúncio" className="h-16 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{imageFile?.name}</p>
                      <p className="text-xs text-muted-foreground">Pronta para envio ao backend de upload</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setImageFile(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg px-4 py-5 text-center hover:bg-background">
                    <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Selecionar imagem</span>
                    <span className="mt-1 text-xs text-muted-foreground">PNG, JPG ou WEBP do anúncio recebido</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea placeholder="Cole aqui o texto do anúncio original, promessa, público, regras do parceiro, CTA permitido e observações..." value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 h-24" />
            </div>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
                <Sparkles className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Adicionar e Analisar Anúncio'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ProductDetailsDialog
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onStatusChange={handleStatusChange}
        onAnalyze={handleAnalyze}
        onCollectMedia={handleCollectMedia}
        onGenerateVideo={handleGenerateVideo}
      />
    </div>
  );
}

function ProductMetric({
  label,
  value,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  icon: typeof Package;
  tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'destructive';
}) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent text-accent-foreground',
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

function ProductActions({
  product,
  onDelete,
  onDuplicate,
  onOpen,
  onStatusChange,
  onAnalyze,
  onCollectMedia,
  onGenerateVideo,
}: {
  product: Product;
  onDelete: (id: EntityId) => void;
  onDuplicate: (product: Product) => void;
  onOpen: (product: Product) => void;
  onStatusChange: (id: EntityId, status: Status, message?: string) => void;
  onAnalyze: (product: Product) => void;
  onCollectMedia: (product: Product) => void;
  onGenerateVideo: (product: Product) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="h-8 w-8 shrink-0 shadow-sm">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-xl p-1">
        <DropdownMenuItem onClick={() => onOpen(product)} className="h-9 gap-2 rounded-lg text-sm">
          <Eye className="h-3.5 w-3.5 shrink-0" /> Ver detalhes
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAnalyze(product)} className="h-9 gap-2 rounded-lg text-sm">
          <Bot className="h-3.5 w-3.5 shrink-0" /> Analisar com IA
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCollectMedia(product)} className="h-9 gap-2 rounded-lg text-sm">
          <Image className="h-3.5 w-3.5 shrink-0" /> Buscar mídias
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onGenerateVideo(product)} className="h-9 gap-2 rounded-lg text-sm">
          <Film className="h-3.5 w-3.5 shrink-0" /> Gerar vídeo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange(product.id, 'review', 'Anúncio enviado para aprovação')} className="h-9 gap-2 rounded-lg text-sm">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" /> Enviar p/ aprovação
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDuplicate(product)} className="h-9 gap-2 rounded-lg text-sm">
          <Copy className="h-3.5 w-3.5 shrink-0" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(product.id)} className="h-9 gap-2 rounded-lg text-sm text-destructive">
          <Trash2 className="h-3.5 w-3.5 shrink-0" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProductCard({
  product,
  onDelete,
  onDuplicate,
  onOpen,
  onStatusChange,
  onAnalyze,
  onCollectMedia,
  onGenerateVideo,
}: {
  product: Product;
  onDelete: (id: EntityId) => void;
  onDuplicate: (product: Product) => void;
  onOpen: (product: Product) => void;
  onStatusChange: (id: EntityId, status: Status, message?: string) => void;
  onAnalyze: (product: Product) => void;
  onCollectMedia: (product: Product) => void;
  onGenerateVideo: (product: Product) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.06]">
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        <button type="button" className="absolute inset-0 w-full text-left" onClick={() => onOpen(product)}>
          {productImage(product) ? (
            <img src={productImage(product)} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute left-2 top-2">
          <span className="rounded-full bg-card/90 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
            {getPipelineStage(product)}
          </span>
        </div>
        <div className="absolute bottom-2 left-2">
          <StatusBadge status={product.status} />
        </div>
        <div className="absolute bottom-2 right-2 flex max-w-[calc(100%-6.5rem)] items-center gap-1.5 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
          <Button size="sm" className="h-8 gap-1 rounded-full px-2.5 text-[11px] shadow-lg" onClick={() => onAnalyze(product)}>
            <Bot className="h-3.5 w-3.5" /> IA
          </Button>
          <Button size="sm" variant="secondary" className="h-8 gap-1 rounded-full px-2.5 text-[11px] shadow-lg" onClick={() => onCollectMedia(product)}>
            <Image className="h-3.5 w-3.5" /> Mídias
          </Button>
          <div className="rounded-full shadow-lg">
            <ProductActions product={product} onDelete={onDelete} onDuplicate={onDuplicate} onOpen={onOpen} onStatusChange={onStatusChange} onAnalyze={onAnalyze} onCollectMedia={onCollectMedia} onGenerateVideo={onGenerateVideo} />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={() => onOpen(product)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.brand || product.category || 'Sem categoria'}</p>
          </button>
          <div className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <ProductActions product={product} onDelete={onDelete} onDuplicate={onDuplicate} onOpen={onOpen} onStatusChange={onStatusChange} onAnalyze={onAnalyze} onCollectMedia={onCollectMedia} onGenerateVideo={onGenerateVideo} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-bold text-primary">
            {product.price ? `R$ ${Number(product.price).toFixed(2)}` : 'Sem preço'}
          </p>
          <p className="text-xs text-muted-foreground">{product.category || 'Produto'}</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs text-muted-foreground">
          <MetricMini label="mídias" value={product.media_count || 0} />
          <MetricMini label="vídeos" value={product.videos_generated || 0} />
          <MetricMini label="posts" value={product.posts_published || 0} />
        </div>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onDelete,
  onDuplicate,
  onOpen,
  onStatusChange,
  onAnalyze,
  onCollectMedia,
  onGenerateVideo,
}: {
  product: Product;
  onDelete: (id: EntityId) => void;
  onDuplicate: (product: Product) => void;
  onOpen: (product: Product) => void;
  onStatusChange: (id: EntityId, status: Status, message?: string) => void;
  onAnalyze: (product: Product) => void;
  onCollectMedia: (product: Product) => void;
  onGenerateVideo: (product: Product) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center">
      <button type="button" onClick={() => onOpen(product)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          {productImage(product) ? (
            <img src={productImage(product)} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-5 w-5 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.brand || product.category || 'Sem categoria'}</p>
          <p className="mt-1 text-xs text-primary">{getPipelineStage(product)}</p>
        </div>
      </button>
      <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground sm:w-56">
        <MetricMini label="mídias" value={product.media_count || 0} />
        <MetricMini label="vídeos" value={product.videos_generated || 0} />
        <MetricMini label="posts" value={product.posts_published || 0} />
      </div>
      <div className="flex items-center justify-between gap-3 sm:w-64">
        <div>
          <p className="text-sm font-bold text-primary">{product.price ? `R$ ${Number(product.price).toFixed(2)}` : 'Sem preço'}</p>
          <StatusBadge status={product.status} className="mt-1" />
        </div>
        <ProductActions product={product} onDelete={onDelete} onDuplicate={onDuplicate} onOpen={onOpen} onStatusChange={onStatusChange} onAnalyze={onAnalyze} onCollectMedia={onCollectMedia} onGenerateVideo={onGenerateVideo} />
      </div>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold text-foreground">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function ProductDetailsDialog({
  product,
  open,
  onOpenChange,
  onDelete,
  onDuplicate,
  onStatusChange,
  onAnalyze,
  onCollectMedia,
  onGenerateVideo,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: EntityId) => void;
  onDuplicate: (product: Product) => void;
  onStatusChange: (id: EntityId, status: Status, message?: string) => void;
  onAnalyze: (product: Product) => void;
  onCollectMedia: (product: Product) => void;
  onGenerateVideo: (product: Product) => void;
}) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-0.75rem)] max-w-6xl overflow-hidden rounded-3xl p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="border-b border-border bg-card px-5 py-5 sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <DialogTitle className="break-words font-syne text-xl leading-tight sm:text-2xl">{product.name}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Detalhes do anúncio base para roteiro, mídia e distribuição</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={product.status} />
              <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{getPipelineStage(product)}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(94vh-90px)] overflow-y-auto overflow-x-hidden p-5 sm:p-6">
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]">
            <div className="min-w-0 xl:sticky xl:top-0 xl:self-start">
              <div className="overflow-hidden rounded-3xl border border-border bg-muted">
                <div className="relative bg-muted">
                  {productImage(product) ? (
                    <img src={productImage(product)} alt={product.name} className="max-h-[62vh] min-h-[320px] w-full object-cover" />
                  ) : (
                    <div className="flex min-h-[360px] items-center justify-center">
                      <Package className="h-14 w-14 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-3xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etapa atual</p>
                <p className="mt-1 font-syne text-xl font-bold text-foreground">{getPipelineStage(product)}</p>
                <div className="mt-3"><StatusBadge status={product.status} /></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MetricTile label="Mídias" value={product.media_count || 0} />
                <MetricTile label="Vídeos" value={product.videos_generated || 0} />
                <MetricTile label="Posts" value={product.posts_published || 0} />
              </div>
            </div>

            <div className="min-w-0 space-y-5">
              <section className="rounded-3xl border border-border bg-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resumo do anúncio</p>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                  {product.description || 'Sem descrição cadastrada.'}
                </p>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <DetailBox label="Valor/oferta" value={product.price ? `R$ ${Number(product.price).toFixed(2)}` : 'Sem valor'} />
                <DetailBox label="Nicho" value={product.category || 'Sem nicho'} />
                <DetailBox label="Marca/parceiro" value={product.brand || product.supplier_name || 'Sem marca'} />
                <DetailBox label="Origem" value={product.marketplace_origin || product.input_source || 'manual'} />
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <DetailBox label="Campanha" value={product.sku || 'Sem campanha'} />
                <DetailBox label="Comissão" value={product.cost_price ? `R$ ${Number(product.cost_price).toFixed(2)}` : 'Não informada'} />
                <DetailBox label="Potencial" value={product.margin_percent ? `${product.margin_percent}%` : 'N/A'} />
                <DetailBox label="Prioridade" value={`${product.stock_quantity ?? 0}`} />
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <DetailBox label="Parceiro" value={product.supplier_name || 'Sem parceiro'} />
                <DetailBox label="Contato" value={product.supplier_contact || 'Não informado'} />
                <DetailBox label="Prazo" value={product.supplier_lead_time_days ? `${product.supplier_lead_time_days} dias` : 'N/A'} />
              </section>

              <section className="rounded-3xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Ações rápidas</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" className="h-11 justify-start gap-2 rounded-2xl" onClick={() => onAnalyze(product)}>
                    <Bot className="h-4 w-4" /> Analisar com IA
                  </Button>
                  <Button variant="outline" className="h-11 justify-start gap-2 rounded-2xl" onClick={() => onCollectMedia(product)}>
                    <Image className="h-4 w-4" /> Buscar mídias
                  </Button>
                  <Button variant="outline" className="h-11 justify-start gap-2 rounded-2xl" onClick={() => onGenerateVideo(product)}>
                    <Film className="h-4 w-4" /> Gerar vídeo
                  </Button>
                  <Button variant="outline" className="h-11 justify-start gap-2 rounded-2xl" onClick={() => onStatusChange(product.id, 'review', 'Anúncio enviado para aprovação')}>
                    <CheckCircle className="h-4 w-4" /> Enviar para aprovação
                  </Button>
                </div>
              </section>

              <section className="rounded-3xl border border-border bg-card p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">Links e histórico</p>
                <InfoLine label="Link do anúncio" value={product.source_url || product.product_url || 'Não informado'} />
                <InfoLine label="Resumo da análise" value={product.analysis_summary || 'Aguardando análise do backend'} />
                <InfoLine label="Criado em" value={product.created_at ? new Date(product.created_at).toLocaleString('pt-BR') : 'Sem data'} />
              </section>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="h-11 gap-2 rounded-2xl" onClick={() => onDuplicate(product)}>
                  <Copy className="h-4 w-4" /> Duplicar
                </Button>
                <Button variant="destructive" className="h-11 gap-2 rounded-2xl" onClick={() => onDelete(product.id)}>
                  <Trash2 className="h-4 w-4" /> Excluir anúncio
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/25 p-4">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-5 text-foreground">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <span className="whitespace-pre-wrap break-all text-xs leading-5 text-muted-foreground">{value}</span>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4 text-center shadow-sm backdrop-blur">
      <p className="font-syne text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function ProductSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-24 border-b border-border bg-muted/40 last:border-b-0 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}

function EmptyProducts({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Package className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="mb-1 font-syne font-bold text-foreground">Nenhum anúncio base encontrado</p>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        Ajuste os filtros ou adicione um anúncio pronto para iniciar análise, roteiro e geração de conteúdo.
      </p>
      <Button size="sm" onClick={onAdd} className="gap-2">
        <Plus className="h-4 w-4" /> Adicionar Anúncio
      </Button>
    </div>
  );
}
