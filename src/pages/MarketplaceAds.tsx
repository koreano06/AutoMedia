import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import PlatformIcon from '@/components/common/PlatformIcon';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MARKETPLACE_PLATFORMS, type MarketplacePlatform } from '@/config/platforms';
import { cn } from '@/lib/utils';
import { createPost, listPosts, publishPostNow } from '@/services/posts';
import { listProducts } from '@/services/products';
import { listPlatformAccounts, type PlatformAccountWithConfig } from '@/services/platforms';
import type { Post, Product } from '@/types/entities';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function isMarketplacePost(post: Post) {
  return MARKETPLACE_PLATFORMS.includes(post.platform as MarketplacePlatform);
}

function isAccountReady(account?: PlatformAccountWithConfig) {
  if (!account) return false;
  const tokenValid = !account.expires_at || new Date(account.expires_at).getTime() > Date.now();
  return account.status === 'connected' && tokenValid && !account.error_message;
}

function productPrice(product?: Product) {
  return Number(product?.price || 0);
}

export default function MarketplaceAds() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<PlatformAccountWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const marketplacePosts = useMemo(() => posts.filter(isMarketplacePost), [posts]);
  const readyAccounts = MARKETPLACE_PLATFORMS.filter((platform) => isAccountReady(accounts.find((account) => account.platform === platform)));
  const published = marketplacePosts.filter((post) => post.status === 'published').length;
  const failed = marketplacePosts.filter((post) => post.status === 'failed').length;
  const drafts = marketplacePosts.filter((post) => post.status === 'draft' || post.status === 'scheduled').length;

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, postData, accountData] = await Promise.all([
        listProducts('-created_date', 200),
        listPosts('-created_at', 200),
        listPlatformAccounts(),
      ]);
      setProducts(productData);
      setPosts(postData);
      setAccounts(accountData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const publishAd = async (post: Post) => {
    const account = accounts.find((item) => item.platform === post.platform);
    if (!isAccountReady(account)) {
      toast.error('Conecte e sincronize essa plataforma antes de publicar.');
      return;
    }

    setPublishingId(post.id);
    try {
      await publishPostNow(post.id);
      toast.success('Publicação enviada para o marketplace.');
      load();
    } catch {
      toast.error('A API retornou erro. Para marketplace real, categoria, estoque, preço e logística precisam estar completos.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div>
      <TopBar title="Anúncios" subtitle="Crie e publique ofertas em marketplaces, separado das campanhas de vídeo" />
      <div className="space-y-5 p-4 sm:p-6">
        {error && <ErrorState onRetry={load} />}

        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_360px] lg:p-6">
            <div>
              <Badge variant="outline" className="mb-3 rounded-full border-primary/20 bg-primary/10 text-primary">
                Área comercial
              </Badge>
              <h2 className="font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Anúncio de marketplace não é post de rede social.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Aqui ficam produtos, preço, estoque e publicação em Shopee/Mercado Livre. Vídeos, legendas e calendário editorial continuam no fluxo de conteúdo.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button className="gap-2" onClick={() => setDialogOpen(true)} disabled={products.length === 0}>
                  <Plus className="h-4 w-4" />
                  Novo anúncio
                </Button>
                <Button variant="outline" className="gap-2" onClick={load}>
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Anúncios" value={marketplacePosts.length} icon={ShoppingBag} />
              <Metric label="Publicados" value={published} icon={CheckCircle2} tone="success" />
              <Metric label="Rascunhos" value={drafts} icon={PackageCheck} />
              <Metric label="Falhas" value={failed} icon={AlertTriangle} tone="warning" />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {MARKETPLACE_PLATFORMS.map((platform) => {
            const account = accounts.find((item) => item.platform === platform);
            const ready = isAccountReady(account);
            return (
              <div key={platform} className={cn('rounded-2xl border bg-card p-4', ready ? 'border-success/25' : 'border-border')}>
                <div className="flex items-center justify-between gap-3">
                  <PlatformIcon platform={platform} showLabel />
                  <Badge variant="outline" className={cn('rounded-full', ready ? 'border-success/30 text-success' : 'border-warning/30 text-warning')}>
                    {ready ? 'Apto a publicar' : 'Precisa conectar'}
                  </Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {ready
                    ? `Conta sincronizada: ${account?.account_id || account?.account_name}`
                    : 'Conecte via Integrações e sincronize a conta antes de enviar anúncios reais.'}
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-syne text-base font-bold text-foreground">Fila de anúncios</h3>
              <p className="text-xs text-muted-foreground">Rascunhos e publicações comerciais por marketplace.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={products.length === 0}>
              Criar anúncio
            </Button>
          </div>

          {loading ? (
            <div className="p-5"><div className="h-60 animate-pulse rounded-2xl bg-muted" /></div>
          ) : marketplacePosts.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/35" />
              <p className="font-syne text-lg font-bold text-foreground">Nenhum anúncio criado</p>
              <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro anúncio usando um produto já cadastrado.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {marketplacePosts.map((post) => {
                const product = products.find((item) => item.id === post.product_id);
                const account = accounts.find((item) => item.platform === post.platform);
                return (
                  <div key={post.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_180px_180px_170px] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <PlatformIcon platform={post.platform} showLabel size="sm" />
                        <StatusBadge status={post.status} />
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-foreground">{post.product_name || 'Produto sem nome'}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.caption || 'Sem descrição comercial.'}</p>
                    </div>
                    <Info label="Preço" value={productPrice(product) ? currency.format(productPrice(product)) : 'Não informado'} />
                    <Info label="Estoque" value={product?.stock_quantity ?? 'Não informado'} />
                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <Button size="sm" className="gap-2" onClick={() => publishAd(post)} disabled={publishingId === post.id || !isAccountReady(account)}>
                        <Send className="h-4 w-4" />
                        Publicar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" disabled={!post.external_url} onClick={() => post.external_url && window.open(post.external_url, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                        Ver anúncio
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <AdDialog
        open={dialogOpen}
        products={products}
        accounts={accounts}
        onOpenChange={setDialogOpen}
        onCreated={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}

function AdDialog({ open, products, accounts, onOpenChange, onCreated }: {
  open: boolean;
  products: Product[];
  accounts: PlatformAccountWithConfig[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [productId, setProductId] = useState('');
  const [platform, setPlatform] = useState<MarketplacePlatform>('shopee');
  const product = products.find((item) => item.id === productId);
  const account = accounts.find((item) => item.platform === platform);
  const ready = isAccountReady(account);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setTitle(product?.name || '');
    setDescription(product?.description || '');
  }, [product]);

  const createAd = async () => {
    if (!product) {
      toast.error('Selecione um produto.');
      return;
    }

    try {
      await createPost({
        product_id: product.id,
        product_name: title || product.name,
        platform,
        caption: description || product.description || `Anúncio comercial de ${product.name}`,
        status: 'draft',
        thumbnail_url: product.image_url || product.uploaded_image_url,
        campaign_name: `Anúncio ${platform}`,
      });
      toast.success('Anúncio criado como rascunho.');
      onCreated();
    } catch {
      toast.error('Não foi possível criar o anúncio.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-syne">Novo anúncio de marketplace</DialogTitle>
          <DialogDescription>
            Crie o rascunho comercial separado do fluxo de vídeos. A publicação real exige conta conectada e dados completos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                <SelectContent>{products.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marketplace</Label>
              <Select value={platform} onValueChange={(value) => setPlatform(value as MarketplacePlatform)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{MARKETPLACE_PLATFORMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className={cn('rounded-2xl border p-3 text-sm', ready ? 'border-success/20 bg-success/10 text-success' : 'border-warning/20 bg-warning/10 text-warning')}>
            {ready ? 'Conta apta para tentativa de publicação.' : 'Conta ainda não está apta. Você pode criar o rascunho, mas precisa conectar/sincronizar antes de publicar.'}
          </div>

          <div>
            <Label>Título do anúncio</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5" placeholder="Nome comercial do produto" />
          </div>
          <div>
            <Label>Descrição comercial</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 h-28" placeholder="Benefícios, especificações e chamada de compra" />
          </div>

          {product && (
            <div className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-3">
              <Info label="Preço" value={productPrice(product) ? currency.format(productPrice(product)) : 'Não informado'} />
              <Info label="Estoque" value={product.stock_quantity ?? 'Não informado'} />
              <Info label="SKU" value={product.sku || product.internal_code || 'Não informado'} />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={createAd}>Criar rascunho</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: string | number; icon: typeof ShoppingBag; tone?: 'neutral' | 'success' | 'warning' }) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-background/55 p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div>
      <p className="font-syne text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-muted/25 p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
