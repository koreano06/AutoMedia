import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle,
  Film,
  Image,
  Layers3,
  Presentation,
  Rocket,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import ErrorState from '@/components/common/ErrorState';
import PlatformIcon from '@/components/common/PlatformIcon';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CampaignMap,
  CockpitPanel,
  CreativeJourney,
  MaturityMeter,
  PhoneCreativePreview,
  QualityTrafficLight,
  StoryboardStrip,
} from '@/components/creative/CreativeVisualKit';
import { listProducts } from '@/services/products';
import { listMediaAssets } from '@/services/mediaAssets';
import { listPosts } from '@/services/posts';
import { listJobs } from '@/services/jobs';
import type { Job, MediaAsset, Post, Product } from '@/types/entities';
import { cn } from '@/lib/utils';

const getPreview = (asset?: MediaAsset, product?: Product) => asset?.thumbnail_url || asset?.url || product?.image_url || product?.uploaded_image_url || '';
const getScore = (asset?: MediaAsset) => Number(asset?.quality_score ?? (asset?.status === 'approved' ? 88 : asset?.status === 'rejected' ? 38 : 68));

export default function CampaignPresentation() {
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeProductId, setActiveProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, assetData, postData, jobData] = await Promise.all([
        listProducts('-created_date', 60),
        listMediaAssets('-created_date', 120),
        listPosts('-created_date', 120),
        listJobs(),
      ]);
      setProducts(productData);
      setAssets(assetData);
      setPosts(postData);
      setJobs(jobData);
      setActiveProductId((current) => current || productData[0]?.id || '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeProduct = products.find((product) => product.id === activeProductId) || products[0];
  const productAssets = useMemo(
    () => assets.filter((asset) => asset.product_id === activeProduct?.id || asset.product_name === activeProduct?.name),
    [activeProduct?.id, activeProduct?.name, assets],
  );
  const generatedVideos = productAssets.filter((asset) => asset.type === 'generated_video');
  const bestAsset = generatedVideos[0] || productAssets[0];
  const productPosts = posts.filter((post) => post.product_id === activeProduct?.id || post.product_name === activeProduct?.name);
  const activeJobs = jobs.filter((job) => ['queued', 'processing', 'rendering', 'uploading'].includes(job.status));
  const published = productPosts.filter((post) => post.status === 'published').length;
  const scheduled = productPosts.filter((post) => post.status === 'scheduled').length;
  const qualityScore = getScore(bestAsset);
  const maturity = Math.min(
    100,
    Math.round(
      (activeProduct ? 18 : 0)
      + (productAssets.length ? 20 : 0)
      + (generatedVideos.length ? 24 : 0)
      + (scheduled ? 18 : 0)
      + (published ? 20 : 0),
    ),
  );

  const stages = [
    { id: 'ad', label: 'Anúncio base', description: activeProduct?.name || 'Sem anúncio', icon: Target, status: activeProduct ? 'done' as const : 'active' as const },
    { id: 'script', label: 'Roteiro IA', description: bestAsset?.caption ? 'Roteiro/legenda disponível' : 'Gerar roteiro', icon: Wand2, status: bestAsset?.caption ? 'done' as const : activeProduct ? 'active' as const : 'waiting' as const },
    { id: 'assets', label: 'Criativos', description: `${productAssets.length} mídia(s)`, icon: Image, status: productAssets.length ? 'done' as const : 'waiting' as const },
    { id: 'video', label: 'Vídeo', description: `${generatedVideos.length} gerado(s)`, icon: Film, status: generatedVideos.length ? 'done' as const : productAssets.length ? 'active' as const : 'waiting' as const },
    { id: 'post', label: 'Disparo', description: `${scheduled + published} post(s)`, icon: Rocket, status: published ? 'done' as const : scheduled ? 'active' as const : 'waiting' as const },
  ];

  const storyboard = [
    { title: 'Gancho', text: activeProduct?.analysis_summary || activeProduct?.description || 'Capturar atenção nos 3 primeiros segundos.', duration: '0-3s' },
    { title: 'Benefício', text: bestAsset?.caption || 'Mostrar promessa principal e contexto de uso.', duration: '3-8s' },
    { title: 'Prova visual', text: productAssets.length ? 'Usar imagens/vídeos aprovados da campanha.' : 'Adicionar imagem ou gerar criativo com IA.', duration: '8-12s' },
    { title: 'CTA', text: 'Comente "eu quero" ou clique no link da bio.', duration: '12-15s' },
  ];

  const cockpitItems = [
    { label: 'Campanhas', value: products.length, hint: 'Anúncios base cadastrados.', tone: 'primary' as const, icon: Target },
    { label: 'Mídias', value: productAssets.length, hint: 'Assets desta campanha.', tone: productAssets.length ? 'success' as const : 'warning' as const, icon: Layers3 },
    { label: 'Vídeos IA', value: generatedVideos.length, hint: 'Criativos renderizados para redes.', tone: generatedVideos.length ? 'success' as const : 'warning' as const, icon: Film },
    { label: 'Jobs ativos', value: activeJobs.length, hint: 'Processos em fila/renderização.', tone: activeJobs.length ? 'primary' as const : 'muted' as const, icon: Sparkles },
  ];

  return (
    <div>
      <TopBar title="Apresentação" subtitle="Modo pitch da campanha, do anúncio ao disparo" />
      <div className="mobile-page-pad page-stack">
        {error && <ErrorState onRetry={load} />}

        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[#080b10] text-white shadow-2xl shadow-black/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/0.35),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(20,184,166,0.18),transparent_25%),linear-gradient(135deg,#080b10,#111827)]" />
          <div className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[1.1fr_360px] xl:p-9">
            <div className="flex min-h-[420px] flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  <Presentation className="h-3.5 w-3.5 text-primary" /> Modo apresentação
                </span>
                <h1 className="mt-5 max-w-4xl font-syne text-3xl font-bold leading-tight sm:text-5xl">
                  Da oferta pronta ao vídeo publicado, em uma linha de produção visual.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  O AutoMedia organiza anúncio base, roteiro com IA, assets, renderização, aprovação e agendamento em uma operação clara para escala de divulgação.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'Anúncios', value: products.length },
                  { label: 'Mídias', value: assets.length },
                  { label: 'Vídeos', value: assets.filter((asset) => asset.type === 'generated_video').length },
                  { label: 'Posts', value: posts.length },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                    <p className="font-syne text-3xl font-bold">{loading ? '—' : metric.value}</p>
                    <p className="mt-1 text-xs text-white/45">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <PhoneCreativePreview
              title={activeProduct?.name || 'Campanha de divulgação'}
              subtitle={activeProduct?.category || bestAsset?.title || 'Criativo vertical para redes'}
              imageUrl={getPreview(bestAsset, activeProduct)}
              badge={generatedVideos.length ? 'Vídeo IA' : 'Preview'}
              cta="Comente eu quero"
              progress={maturity}
            />
          </div>
        </section>

        {!loading && products.length > 0 && (
          <section className="responsive-card responsive-card-pad">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Selecionar campanha</p>
                <h2 className="mt-1 font-syne text-xl font-bold text-foreground">Qual campanha vamos apresentar?</h2>
              </div>
              <Button variant="outline" className="gap-2 rounded-2xl" onClick={() => window.print()}>
                <Presentation className="h-4 w-4" /> Modo impressão
              </Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {products.slice(0, 8).map((product) => {
                const selected = product.id === activeProduct?.id;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setActiveProductId(product.id)}
                    className={cn(
                      'rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5',
                      selected ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border bg-muted/20 hover:border-primary/40',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted">
                        {product.image_url || product.uploaded_image_url ? (
                          <img src={product.image_url || product.uploaded_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Target className="m-3 h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{product.category || 'Sem categoria'}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {!loading && (
          <>
            <CreativeJourney stages={stages} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <CampaignMap
                title={activeProduct?.name || 'Campanha'}
                productCount={activeProduct ? 1 : 0}
                mediaCount={productAssets.length}
                videoCount={generatedVideos.length}
                scheduledCount={scheduled + published}
              />
              <MaturityMeter score={maturity} label="Maturidade da campanha" />
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
              <StoryboardStrip scenes={storyboard} />
              <div className="space-y-5">
                <QualityTrafficLight score={qualityScore} label="Qualidade do criativo principal" />
                <CockpitPanel items={cockpitItems} />
              </div>
            </div>

            <section className="responsive-card responsive-card-pad">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Plano de ação</p>
                  <h3 className="mt-1 font-syne text-lg font-bold text-foreground">Próximos passos da campanha</h3>
                </div>
                <span className="text-xs text-muted-foreground">feito para reunião, demo e operação diária</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: generatedVideos.length ? 'Revisar criativos' : 'Gerar vídeo IA',
                    text: generatedVideos.length ? 'Abrir aprovação e escolher o melhor vídeo.' : 'Usar roteiro, imagem e template para renderizar.',
                    icon: Film,
                    done: generatedVideos.length > 0,
                  },
                  {
                    title: scheduled || published ? 'Monitorar agenda' : 'Agendar disparos',
                    text: scheduled || published ? 'Acompanhar horários, status e naturalidade.' : 'Escolher Instagram/TikTok e distribuir horários.',
                    icon: CalendarClock,
                    done: scheduled + published > 0,
                  },
                  {
                    title: published ? 'Analisar performance' : 'Preparar publicação',
                    text: published ? 'Ler alcance, comentários e próximos testes.' : 'Publicar, acompanhar e registrar feedback.',
                    icon: BarChart3,
                    done: published > 0,
                  },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        {step.done ? <CheckCircle className="h-4 w-4 text-success" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <p className="mt-4 font-syne text-sm font-bold text-foreground">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.text}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="responsive-card responsive-card-pad">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Publicações</p>
                  <h3 className="mt-1 font-syne text-lg font-bold text-foreground">Canais preparados para disparo</h3>
                </div>
                <Progress className="max-w-xs" value={maturity} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {(productPosts.length ? productPosts : posts.slice(0, 4)).slice(0, 4).map((post) => (
                  <div key={post.id} className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <PlatformIcon platform={post.platform || 'instagram'} size="sm" />
                      <StatusBadge status={post.status || 'draft'} />
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm font-semibold text-foreground">{post.product_name || activeProduct?.name || 'Publicação'}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{post.caption || 'Legenda ainda não definida.'}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
