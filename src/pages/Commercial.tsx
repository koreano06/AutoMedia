import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  Package,
  ShoppingBag,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import ErrorState from '@/components/common/ErrorState';
import PlatformIcon from '@/components/common/PlatformIcon';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listComments } from '@/services/comments';
import { listPosts } from '@/services/posts';
import { listProducts } from '@/services/products';
import type { Comment, Post, Product } from '@/types/entities';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const getPrice = (product: Product) => Number(product.price || 0);
const getCost = (product: Product) => Number(product.cost_price || 0);
const getMargin = (product: Product) => {
  const price = getPrice(product);
  const cost = getCost(product);
  if (product.margin_percent) return product.margin_percent;
  if (!price || !cost) return 0;
  return Math.round(((price - cost) / price) * 100);
};
const getStock = (product: Product) => Number(product.stock_quantity ?? 0);
const getMinStock = (product: Product) => Number(product.min_stock ?? 5);

export default function Commercial() {
  const [products, setProducts] = useState<Product[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, commentData, postData] = await Promise.all([
        listProducts('-created_date', 150),
        listComments('-detected_at', 150),
        listPosts('-published_at', 150),
      ]);
      setProducts(productData);
      setComments(commentData);
      setPosts(postData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))], [products]);
  const filteredProducts = products.filter((product) => categoryFilter === 'all' || product.category === categoryFilter);

  const leads = comments.filter((comment) => comment.is_purchase_intent);
  const pendingLeads = leads.filter((comment) => !comment.auto_replied);
  const lowStock = filteredProducts.filter((product) => getStock(product) <= getMinStock(product));
  const noStock = filteredProducts.filter((product) => getStock(product) === 0);
  const lowMargin = filteredProducts.filter((product) => getMargin(product) > 0 && getMargin(product) < 25);
  const totalPotentialRevenue = filteredProducts.reduce((sum, product) => sum + getPrice(product) * getStock(product), 0);
  const averageMargin = filteredProducts.length
    ? Math.round(filteredProducts.reduce((sum, product) => sum + getMargin(product), 0) / filteredProducts.length)
    : 0;

  const productDemand = filteredProducts
    .map((product) => {
      const productLeads = leads.filter((comment) =>
        comment.content?.toLowerCase().includes(product.name.toLowerCase()) ||
        comment.reply_content?.toLowerCase().includes(product.name.toLowerCase()),
      );
      const productPosts = posts.filter((post) => post.product_id === product.id || post.product_name === product.name);
      return {
        product,
        leads: productLeads.length,
        posts: productPosts.length,
        stock: getStock(product),
        margin: getMargin(product),
        revenue: getPrice(product) * getStock(product),
      };
    })
    .sort((a, b) => b.leads + b.posts - (a.leads + a.posts));

  const suppliers = [...new Set(filteredProducts.map((product) => product.supplier_name).filter(Boolean))];

  return (
    <div>
      <TopBar title="Comercial" subtitle="ERP leve: estoque, margem, fornecedores, leads e alertas comerciais" />
      <div className="space-y-5 p-4 sm:p-6">
        {error && <ErrorState onRetry={load} />}

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-syne text-lg font-bold text-foreground">Operação comercial conectada ao marketing</h2>
            <p className="text-sm text-muted-foreground">Use estoque, margem e intenção de compra para decidir o que divulgar.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button asChild variant="outline" className="w-full sm:w-auto"><Link to="/products">Editar produtos</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="Produtos" value={filteredProducts.length} icon={Package} loading={loading} />
          <Metric label="Estoque baixo" value={lowStock.length} icon={AlertTriangle} tone="warning" loading={loading} />
          <Metric label="Sem estoque" value={noStock.length} icon={ShoppingBag} tone="destructive" loading={loading} />
          <Metric label="Leads compra" value={leads.length} icon={Users} tone="primary" loading={loading} />
          <Metric label="Margem média" value={`${averageMargin}%`} icon={BadgeDollarSign} tone="success" loading={loading} />
          <Metric label="Potencial" value={currency.format(totalPotentialRevenue)} icon={TrendingUp} loading={loading} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Target} title="Prioridade de divulgação" subtitle="Produtos com demanda, margem e estoque para campanha" />
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <div className="hidden grid-cols-[1fr_100px_100px_100px_120px] gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                  <span>Produto</span><span>Leads</span><span>Estoque</span><span>Margem</span><span>Potencial</span>
                </div>
                <div className="divide-y divide-border">
                  {productDemand.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</div>
                  ) : productDemand.map(({ product, leads: productLeads, stock, margin, revenue }) => (
                    <div key={product.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1fr_100px_100px_100px_120px] md:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sku || product.internal_code || 'Sem SKU'} · {product.supplier_name || 'Sem fornecedor'}</p>
                      </div>
                      <Pill label="Leads" value={productLeads} tone={productLeads > 0 ? 'primary' : 'neutral'} />
                      <Pill label="Estoque" value={stock} tone={stock <= getMinStock(product) ? 'warning' : 'success'} />
                      <Pill label="Margem" value={`${margin}%`} tone={margin >= 35 ? 'success' : margin > 0 ? 'warning' : 'neutral'} />
                      <span className="flex items-center justify-between text-sm font-semibold text-foreground md:block"><span className="text-xs font-medium text-muted-foreground md:hidden">Potencial</span>{currency.format(revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Users} title="Leads vindos dos comentários" subtitle="Intenção de compra capturada nas redes sociais" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {leads.slice(0, 8).map((lead) => (
                  <div key={lead.id} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{lead.author || 'Usuário'}</p>
                      <PlatformIcon platform={lead.platform} size="sm" />
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{lead.content}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={lead.auto_replied ? 'text-xs font-medium text-success' : 'text-xs font-medium text-warning'}>
                        {lead.auto_replied ? 'Respondido' : 'Pendente'}
                      </span>
                      <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs"><Link to="/comments">Abrir</Link></Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={AlertTriangle} title="Alertas comerciais" subtitle="Pontos que podem afetar campanhas" />
              <div className="mt-4 space-y-3">
                <Alert text={`${noStock.length} produto(s) sem estoque. Evite publicar campanhas desses itens.`} active={noStock.length > 0} />
                <Alert text={`${lowStock.length} produto(s) próximos do estoque mínimo.`} active={lowStock.length > 0} />
                <Alert text={`${lowMargin.length} produto(s) com margem baixa para tráfego.`} active={lowMargin.length > 0} />
                <Alert text={`${pendingLeads.length} lead(s) de compra aguardando resposta.`} active={pendingLeads.length > 0} />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Building2} title="Fornecedores" subtitle="Base simples para operação comercial" />
              <div className="mt-4 space-y-3">
                {suppliers.length === 0 ? (
                  <p className="rounded-xl bg-muted/35 p-3 text-sm text-muted-foreground">Nenhum fornecedor cadastrado nos produtos.</p>
                ) : suppliers.map((supplier) => {
                  const supplierProducts = filteredProducts.filter((product) => product.supplier_name === supplier);
                  return (
                    <div key={supplier} className="rounded-xl border border-border p-3">
                      <p className="text-sm font-semibold text-foreground">{supplier}</p>
                      <p className="text-xs text-muted-foreground">{supplierProducts.length} produto(s) · lead time médio {averageLeadTime(supplierProducts)} dias</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={BriefcaseBusiness} title="Próximos encaixes" subtitle="Quando o backend entrar" />
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Insight text="Sincronizar estoque com marketplace ou loja própria." />
                <Insight text="Registrar lead como oportunidade comercial." />
                <Insight text="Pausar campanhas automaticamente quando acabar estoque." />
                <Insight text="Calcular ROI real por produto e campanha." />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral', loading }: { label: string; value: string | number; icon: typeof Package; tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'destructive'; loading: boolean }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-4 w-4" /></div>
      <p className="truncate font-syne text-xl font-bold text-foreground sm:text-2xl">{loading ? '—' : value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Package; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string | number; tone: 'neutral' | 'primary' | 'success' | 'warning' }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };
  return (
    <span className={`flex w-full items-center justify-between rounded-full px-2.5 py-1 text-xs font-semibold md:w-fit md:justify-start ${tones[tone]}`}>
      <span className="font-medium opacity-75 md:hidden">{label}</span>
      {value}
    </span>
  );
}

function Alert({ text, active }: { text: string; active: boolean }) {
  return <div className={`rounded-xl p-3 text-sm ${active ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>{active ? text : 'Sem alerta nesta categoria.'}</div>;
}

function Insight({ text }: { text: string }) {
  return <div className="rounded-xl bg-muted/35 p-3">{text}</div>;
}

function averageLeadTime(products: Product[]) {
  const values = products.map((product) => product.supplier_lead_time_days || 0).filter(Boolean);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
