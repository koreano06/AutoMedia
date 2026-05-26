import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  CalendarClock,
  CircleDollarSign,
  FileText,
  Megaphone,
  Package,
  PiggyBank,
  ShoppingBag,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import ErrorState from '@/components/common/ErrorState';
import PlatformIcon from '@/components/common/PlatformIcon';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listComments } from '@/services/comments';
import { listMarketplaceListings } from '@/services/marketplaceListings';
import { listPosts } from '@/services/posts';
import { listProducts } from '@/services/products';
import type { Comment, MarketplaceListing, Post, Product } from '@/types/entities';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function money(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function numberValue(value?: number | string) {
  return Number(value || 0);
}

function productCost(product: Product) {
  return numberValue(product.cost_price);
}

function productPrice(product: Product) {
  return numberValue(product.price);
}

function productStock(product: Product) {
  return Number(product.stock_quantity ?? 0);
}

function productMargin(product: Product) {
  const price = productPrice(product);
  const cost = productCost(product);
  if (product.margin_percent) return product.margin_percent;
  if (!price || !cost) return 0;
  return Math.round(((price - cost) / price) * 100);
}

function isSocialPost(post: Post) {
  return ['instagram', 'tiktok', 'facebook', 'youtube'].includes(String(post.platform));
}

export default function ERPManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, postData, listingData, commentData] = await Promise.all([
        listProducts('-created_date', 250),
        listPosts('-created_at', 250),
        listMarketplaceListings('-created_at', 250),
        listComments('-detected_at', 250),
      ]);
      setProducts(productData);
      setPosts(postData);
      setListings(listingData);
      setComments(commentData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const finance = useMemo(() => {
    const inventoryRevenue = products.reduce((sum, product) => sum + productPrice(product) * productStock(product), 0);
    const inventoryCost = products.reduce((sum, product) => sum + productCost(product) * productStock(product), 0);
    const grossProfit = inventoryRevenue - inventoryCost;
    const averageMargin = products.length
      ? Math.round(products.reduce((sum, product) => sum + productMargin(product), 0) / products.length)
      : 0;

    return {
      inventoryRevenue,
      inventoryCost,
      grossProfit,
      averageMargin,
    };
  }, [products]);

  const socialPosts = posts.filter(isSocialPost);
  const publishedSocialPosts = socialPosts.filter((post) => post.status === 'published');
  const scheduledPosts = socialPosts.filter((post) => post.status === 'scheduled');
  const publishedListings = listings.filter((listing) => listing.status === 'published');
  const failedListings = listings.filter((listing) => listing.status === 'failed');
  const purchaseLeads = comments.filter((comment) => comment.is_purchase_intent);
  const pendingLeads = purchaseLeads.filter((comment) => !comment.auto_replied);
  const lowStockProducts = products.filter((product) => productStock(product) <= Number(product.min_stock ?? 5));
  const noStockProducts = products.filter((product) => productStock(product) === 0);
  const lowMarginProducts = products.filter((product) => productMargin(product) > 0 && productMargin(product) < 25);

  const productRows = [...products]
    .map((product) => ({
      product,
      revenue: productPrice(product) * productStock(product),
      cost: productCost(product) * productStock(product),
      margin: productMargin(product),
      listings: listings.filter((listing) => listing.product_id === product.id).length,
      posts: posts.filter((post) => post.product_id === product.id).length,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return (
    <div>
      <TopBar title="Gestão ERP" subtitle="Controle comercial, publicações, estoque e finanças dos produtos" />
      <div className="mobile-page-pad page-stack">
        {error && <ErrorState onRetry={load} />}

        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ERP operacional</p>
              <h2 className="font-syne text-2xl font-bold text-foreground sm:text-3xl">Um painel para vender, publicar e acompanhar dinheiro.</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Produtos alimentam anúncios de marketplace e campanhas de mídia. Esta área junta os indicadores para você decidir o que vender, divulgar e corrigir.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline"><Link to="/products">Cadastrar produto</Link></Button>
              <Button asChild><Link to="/marketplace-ads">Criar anúncio</Link></Button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Metric label="Produtos" value={products.length} icon={Package} loading={loading} />
          <Metric label="Receita potencial" value={money(finance.inventoryRevenue)} icon={CircleDollarSign} loading={loading} />
          <Metric label="Lucro bruto pot." value={money(finance.grossProfit)} icon={PiggyBank} tone="success" loading={loading} />
          <Metric label="Anúncios publicados" value={publishedListings.length} icon={ShoppingBag} loading={loading} />
          <Metric label="Posts sociais" value={publishedSocialPosts.length} icon={Megaphone} loading={loading} />
          <Metric label="Leads pendentes" value={pendingLeads.length} icon={Users} tone={pendingLeads.length ? 'warning' : 'success'} loading={loading} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="flex h-auto w-full justify-start overflow-x-auto rounded-2xl p-1">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="finance">Financeiro</TabsTrigger>
            <TabsTrigger value="publications">Publicações</TabsTrigger>
            <TabsTrigger value="stock">Estoque</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-5">
            <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
              <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <SectionTitle icon={TrendingUp} title="Prioridade operacional" subtitle="Produtos com maior potencial financeiro e atividade comercial" />
                <ProductTable rows={productRows.slice(0, 8)} />
              </section>
              <aside className="space-y-5">
                <AlertPanel
                  noStock={noStockProducts.length}
                  lowStock={lowStockProducts.length}
                  lowMargin={lowMarginProducts.length}
                  failedListings={failedListings.length}
                  scheduledPosts={scheduledPosts.length}
                />
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="sales" className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={ShoppingBag} title="Vendas e anúncios" subtitle="Produtos, anúncios comerciais e presença em marketplaces" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoCard label="Anúncios totais" value={listings.length} />
                <InfoCard label="Publicados" value={publishedListings.length} tone="success" />
                <InfoCard label="Com erro" value={failedListings.length} tone="warning" />
              </div>
              <ListingList listings={listings} />
            </section>
          </TabsContent>

          <TabsContent value="finance" className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={BadgeDollarSign} title="Financeiro de produtos" subtitle="Receita, custo, lucro bruto e margem a partir do estoque cadastrado" />
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <InfoCard label="Receita em estoque" value={money(finance.inventoryRevenue)} />
                <InfoCard label="Custo em estoque" value={money(finance.inventoryCost)} />
                <InfoCard label="Lucro bruto potencial" value={money(finance.grossProfit)} tone="success" />
                <InfoCard label="Margem média" value={`${finance.averageMargin}%`} tone={finance.averageMargin >= 30 ? 'success' : 'warning'} />
              </div>
              <FinanceTable rows={productRows} />
            </section>
          </TabsContent>

          <TabsContent value="publications" className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Megaphone} title="Publicações e campanhas" subtitle="Controle do que está agendado, publicado ou falhou nas redes sociais" />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <InfoCard label="Agendadas" value={scheduledPosts.length} />
                <InfoCard label="Publicadas" value={publishedSocialPosts.length} tone="success" />
                <InfoCard label="Falhas" value={socialPosts.filter((post) => post.status === 'failed').length} tone="warning" />
              </div>
              <PostList posts={socialPosts.slice(0, 12)} />
            </section>
          </TabsContent>

          <TabsContent value="stock" className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Boxes} title="Estoque e risco de campanha" subtitle="Itens sem estoque, próximos do mínimo ou com margem baixa" />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoCard label="Sem estoque" value={noStockProducts.length} tone={noStockProducts.length ? 'warning' : 'success'} />
                <InfoCard label="Estoque baixo" value={lowStockProducts.length} tone={lowStockProducts.length ? 'warning' : 'success'} />
                <InfoCard label="Margem baixa" value={lowMarginProducts.length} tone={lowMarginProducts.length ? 'warning' : 'success'} />
              </div>
              <StockList products={[...noStockProducts, ...lowStockProducts, ...lowMarginProducts]} />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral', loading }: { label: string; value: string | number; icon: LucideIcon; tone?: 'neutral' | 'success' | 'warning'; loading: boolean }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      <p className="truncate font-syne text-xl font-bold text-foreground">{loading ? '-' : value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

function InfoCard({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'border-border bg-muted/20 text-foreground',
    success: 'border-success/20 bg-success/10 text-success',
    warning: 'border-warning/20 bg-warning/10 text-warning',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="mt-1 font-syne text-xl font-bold">{value}</p>
    </div>
  );
}

function ProductTable({ rows }: { rows: Array<{ product: Product; revenue: number; margin: number; listings: number; posts: number }> }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-border">
      <div className="hidden grid-cols-[1fr_130px_100px_100px_100px] gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
        <span>Produto</span><span>Potencial</span><span>Margem</span><span>Anúncios</span><span>Posts</span>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? <Empty text="Nenhum produto cadastrado." /> : rows.map(({ product, revenue, margin, listings, posts }) => (
          <div key={product.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_130px_100px_100px_100px] md:items-center">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || product.internal_code || 'Sem SKU'} · estoque {productStock(product)}</p></div>
            <Cell label="Potencial" value={money(revenue)} />
            <Cell label="Margem" value={`${margin}%`} />
            <Cell label="Anúncios" value={listings} />
            <Cell label="Posts" value={posts} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceTable({ rows }: { rows: Array<{ product: Product; revenue: number; cost: number; margin: number }> }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      {rows.slice(0, 10).map(({ product, revenue, cost, margin }) => (
        <div key={product.id} className="rounded-2xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{product.name}</p><p className="text-xs text-muted-foreground">{product.category || 'Sem categoria'}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${margin >= 30 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{margin}%</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <InfoMini label="Receita" value={money(revenue)} />
            <InfoMini label="Custo" value={money(cost)} />
            <InfoMini label="Lucro" value={money(revenue - cost)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ListingList({ listings }: { listings: MarketplaceListing[] }) {
  return (
    <div className="mt-5 space-y-3">
      {listings.length === 0 ? <Empty text="Nenhum anúncio de marketplace criado." /> : listings.slice(0, 12).map((listing) => (
        <div key={listing.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2"><PlatformIcon platform={listing.platform} showLabel size="sm" /><StatusBadge status={listing.status} /></div>
            <p className="truncate text-sm font-semibold text-foreground">{listing.title}</p>
            <p className="text-xs text-muted-foreground">{listing.sku || 'Sem SKU'} · {listing.price ? money(numberValue(listing.price)) : 'Preço pendente'}</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/marketplace-ads">Abrir anúncio</Link></Button>
        </div>
      ))}
    </div>
  );
}

function PostList({ posts }: { posts: Post[] }) {
  return (
    <div className="mt-5 space-y-3">
      {posts.length === 0 ? <Empty text="Nenhuma publicação social encontrada." /> : posts.map((post) => (
        <div key={post.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2"><PlatformIcon platform={post.platform} showLabel size="sm" /><StatusBadge status={post.status} /></div>
            <p className="truncate text-sm font-semibold text-foreground">{post.product_name || 'Produto'}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{post.caption || 'Sem legenda'}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('pt-BR') : 'Sem data'}</div>
        </div>
      ))}
    </div>
  );
}

function StockList({ products }: { products: Product[] }) {
  const uniqueProducts = [...new Map(products.map((product) => [product.id, product])).values()];
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      {uniqueProducts.length === 0 ? <Empty text="Nenhum alerta de estoque ou margem." /> : uniqueProducts.map((product) => (
        <div key={product.id} className="rounded-2xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku || 'Sem SKU'}</p></div>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <InfoMini label="Estoque" value={productStock(product)} />
            <InfoMini label="Mínimo" value={product.min_stock ?? 5} />
            <InfoMini label="Margem" value={`${productMargin(product)}%`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertPanel({ noStock, lowStock, lowMargin, failedListings, scheduledPosts }: { noStock: number; lowStock: number; lowMargin: number; failedListings: number; scheduledPosts: number }) {
  const alerts = [
    { label: `${noStock} produto(s) sem estoque`, active: noStock > 0 },
    { label: `${lowStock} produto(s) em estoque baixo`, active: lowStock > 0 },
    { label: `${lowMargin} produto(s) com margem baixa`, active: lowMargin > 0 },
    { label: `${failedListings} anúncio(s) com falha`, active: failedListings > 0 },
    { label: `${scheduledPosts} post(s) sociais agendados`, active: scheduledPosts > 0, positive: true },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <SectionTitle icon={FileText} title="Resumo executivo" subtitle="O que precisa de atenção agora" />
      <div className="mt-4 space-y-3">
        {alerts.map((alert) => (
          <div key={alert.label} className={`rounded-xl p-3 text-sm ${alert.positive ? 'bg-primary/10 text-primary' : alert.active ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
            {alert.active || alert.positive ? alert.label : 'Sem alerta nesta categoria.'}
          </div>
        ))}
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return <span className="flex items-center justify-between text-sm font-semibold text-foreground md:block"><span className="text-xs font-medium text-muted-foreground md:hidden">{label}</span>{value}</span>;
}

function InfoMini({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-muted/35 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
