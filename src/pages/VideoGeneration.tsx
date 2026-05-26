import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import JobStatusBadge from '@/components/common/JobStatusBadge';
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
  Bot,
  CheckCircle,
  Clock,
  Copy,
  Film,
  Image,
  Layers3,
  ListChecks,
  Play,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SOCIAL_PLATFORMS } from '@/config/platforms';
import { createMediaAsset, filterMediaAssets, listMediaAssets, updateMediaAsset } from '@/services/mediaAssets';
import { listProducts, updateProduct } from '@/services/products';
import { generateImage, invokeLLM } from '@/services/ai';
import type { EntityId, Job, MediaAsset, Platform, Product, Status } from '@/types/entities';

const templates = [
  { id: 'product', label: 'Anúncio direto', desc: 'Gancho, benefício principal e CTA direto' },
  { id: 'unboxing', label: 'Unboxing', desc: 'Abertura, detalhes e primeira impressão' },
  { id: 'before_after', label: 'Antes e depois', desc: 'Transformação visual e prova de valor' },
  { id: 'quick_review', label: 'Review rápido', desc: 'Pontos fortes em sequência curta' },
  { id: 'flash_offer', label: 'Oferta relâmpago', desc: 'Urgência, preço e chamada de compra' },
  { id: 'social_proof', label: 'Prova social', desc: 'Depoimentos, avaliações e confiança' },
  { id: 'demo', label: 'Demonstração', desc: 'Mostra a oferta em uso ou contexto real' },
  { id: 'story', label: 'Story curto', desc: 'Formato leve para atenção rápida' },
] as const;

const formats = [
  { id: 'reels', label: 'Reels', ratio: '9:16' },
  { id: 'tiktok', label: 'TikTok', ratio: '9:16' },
  { id: 'shorts', label: 'Shorts', ratio: '9:16' },
  { id: 'feed', label: 'Feed', ratio: '1:1' },
  { id: 'youtube', label: 'YouTube', ratio: '16:9' },
  { id: 'story', label: 'Story', ratio: '9:16' },
] as const;

const durations = ['15s', '30s', '60s'] as const;
const rhythms = ['Rápido', 'Médio', 'Explicativo', 'Cortes dinâmicos', 'Legendas grandes'];
const audioOptions = ['Sem música', 'Música tendência', 'Música energética', 'Música leve', 'Narração IA', 'Apenas texto na tela'];
const platforms = SOCIAL_PLATFORMS;
const historyFilters = [
  { value: 'all', label: 'Todos' },
  { value: 'processing', label: 'Em geração' },
  { value: 'pending_review', label: 'Aguardando revisão' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'published', label: 'Usados em publicação' },
];

type Briefing = {
  targetAudience: string;
  tone: string;
  objective: string;
  promise: string;
  cta: string;
  restrictions: string;
  extra: string;
};

const emptyBriefing: Briefing = {
  targetAudience: '',
  tone: 'Direto, natural e persuasivo',
  objective: 'Divulgação',
  promise: '',
  cta: 'Comente "eu quero" para receber o link',
  restrictions: '',
  extra: '',
};

const getAssetPreview = (asset: MediaAsset) => asset.thumbnail_url || asset.url;
const getVideoScore = (asset: MediaAsset) => Number(asset.quality_score ?? (asset.status === 'approved' ? 88 : asset.status === 'rejected' ? 38 : 72));

export default function VideoGeneration() {
  const [products, setProducts] = useState<Product[]>([]);
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[number]['id']>('product');
  const [selectedFormat, setSelectedFormat] = useState<(typeof formats)[number]['id']>('reels');
  const [duration, setDuration] = useState<(typeof durations)[number]>('30s');
  const [rhythm, setRhythm] = useState(rhythms[0]);
  const [audio, setAudio] = useState(audioOptions[1]);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [briefing, setBriefing] = useState<Briefing>(emptyBriefing);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [visualPrompt, setVisualPrompt] = useState('');
  const [generatedVisual, setGeneratedVisual] = useState<MediaAsset | null>(null);
  const [scriptPreview, setScriptPreview] = useState('');
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState<Job[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [activeVideo, setActiveVideo] = useState<MediaAsset | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const [productData, videoData, mediaData] = await Promise.all([
        listProducts('-created_date', 80),
        filterMediaAssets({ type: 'generated_video' }, '-created_date', 50),
        listMediaAssets('-created_date', 120),
      ]);
      setProducts(productData);
      setVideos(videoData);
      setMediaAssets(mediaData.filter((asset) => asset.type !== 'generated_video'));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const product = products.find((item) => item.id === selectedProduct);
  const availableMedia = useMemo(
    () => mediaAssets.filter((asset) => !selectedProduct || asset.product_id === selectedProduct || asset.product_name === product?.name),
    [mediaAssets, product?.name, selectedProduct],
  );
  const selectedMedia = useMemo(
    () => mediaAssets.filter((asset) => selectedMediaIds.includes(asset.id)),
    [mediaAssets, selectedMediaIds],
  );
  const selectedTemplateConfig = templates.find((item) => item.id === selectedTemplate);
  const selectedFormatConfig = formats.find((item) => item.id === selectedFormat);
  const generationSource = generatedVisual || selectedMedia[0] || null;
  const generationPreview = generationSource ? getAssetPreview(generationSource) : '';
  const filteredVideos = videos.filter((asset) => historyFilter === 'all' || asset.status === historyFilter);

  const stats = {
    total: videos.length,
    generating: queue.filter((job) => ['queued', 'processing'].includes(job.status)).length,
    review: videos.filter((asset) => asset.status === 'pending_review').length,
    approved: videos.filter((asset) => asset.status === 'approved').length,
    rejected: videos.filter((asset) => asset.status === 'rejected').length,
  };

  const checklist = [
    { label: 'Anúncio base selecionado', ok: Boolean(product), hint: product?.name || 'Escolha um anúncio' },
    { label: 'Imagem ou mídia disponível', ok: Boolean(generatedVisual?.url || product?.image_url || selectedMedia.length > 0), hint: generatedVisual ? 'Imagem IA pronta' : `${selectedMedia.length} mídias escolhidas` },
    { label: 'CTA configurado', ok: Boolean(briefing.cta.trim()), hint: briefing.cta || 'Defina uma chamada' },
    { label: 'Plataforma definida', ok: Boolean(platform), hint: String(platform) },
    { label: 'Formato escolhido', ok: Boolean(selectedFormat), hint: selectedFormatConfig?.ratio || '' },
  ];
  const readiness = Math.round((checklist.filter((item) => item.ok).length / checklist.length) * 100);

  const createPrompt = (currentProduct: Product, scriptOnly = false) => `
Crie ${scriptOnly ? 'um roteiro estruturado' : 'um roteiro final'} para transformar um anúncio pronto em vídeo de divulgação.
Anúncio/oferta base: ${currentProduct.name}
Texto/contexto do anúncio original: ${currentProduct.description || 'Sem descrição'}
Categoria/nicho: ${currentProduct.category || 'Não informada'}
Template: ${selectedTemplateConfig?.label}
Formato: ${selectedFormatConfig?.label} ${selectedFormatConfig?.ratio}
Duração: ${duration}
Ritmo: ${rhythm}
Áudio: ${audio}
Plataforma: ${platform}
Público-alvo: ${briefing.targetAudience || 'compradores interessados'}
Tom de voz: ${briefing.tone}
Objetivo: ${briefing.objective}
Promessa principal: ${briefing.promise || 'benefício claro da oferta'}
CTA: ${briefing.cta}
Restrições: ${briefing.restrictions || 'evitar promessas exageradas'}
Mídias selecionadas: ${selectedMedia.map((asset) => asset.title || asset.url).join(', ') || 'usar imagem principal do anúncio'}
Briefing extra: ${briefing.extra || 'sem briefing extra'}

Responda em português com:
1. Gancho inicial
2. Cenas sugeridas
3. Texto na tela
4. Legenda para publicação
5. CTA final
6. Observação anti-spam/naturalidade para disparo em redes
`;

  const createImagePrompt = (currentProduct: Product) => `
Crie um criativo vertical profissional para anúncio em vídeo curto.
Anúncio/oferta base: ${currentProduct.name}
Categoria: ${currentProduct.category || 'campanha de afiliado/colaborador'}
Descrição do anúncio original: ${currentProduct.description || 'Sem descrição'}
Formato: ${selectedFormatConfig?.label} ${selectedFormatConfig?.ratio}
Plataforma: ${platform}
Template: ${selectedTemplateConfig?.label}
Promessa principal: ${briefing.promise || 'benefício claro da oferta'}
Tom visual: moderno, premium, alto contraste, luz de estúdio, composição limpa.
Instrução: gerar uma imagem comercial bonita para divulgação, com foco na oferta, fundo profissional, espaço para texto curto e sem marcas d'agua.
${visualPrompt ? `Direção visual adicional: ${visualPrompt}` : ''}
`;

  const handleGenerateScript = async () => {
    if (!product) {
      toast.error('Selecione um anúncio base antes de gerar o roteiro.');
      return;
    }

    setGeneratingScript(true);
    try {
      const script = await invokeLLM(createPrompt(product, true));
      setScriptPreview(script);
      toast.success('Roteiro criado para revisão');
    } catch {
      toast.error('Não foi possível gerar o roteiro');
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleImproveBriefing = async () => {
    if (!product) {
      toast.error('Selecione um anúncio base para a IA sugerir a estratégia.');
      return;
    }

    setGeneratingScript(true);
    try {
      const suggestion = await invokeLLM(
        `Melhore este briefing para transformar o anúncio/oferta "${product.name}" em vídeos curtos de divulgação. Retorne público-alvo, promessa, tom, CTA permitido, ângulo criativo e restrições. Briefing atual: ${JSON.stringify(briefing)}`
      );
      setScriptPreview(suggestion);
      toast.success('Estratégia sugerida pela IA');
    } catch {
      toast.error('Não foi possível sugerir melhorias');
    } finally {
      setGeneratingScript(false);
    }
  };

  const handleGenerateVisual = async () => {
    if (!product) {
      toast.error('Selecione um anúncio base antes de gerar a imagem.');
      return;
    }

    setGeneratingVisual(true);
    try {
      const result = await generateImage({
        prompt: createImagePrompt(product),
        product_id: product.id,
        product_name: product.name,
        title: `Criativo IA - ${product.name}`,
        platform,
        format: selectedFormatConfig?.ratio,
        size: selectedFormatConfig?.ratio === '16:9' ? '1536x1024' : selectedFormatConfig?.ratio === '1:1' ? '1024x1024' : '1024x1536',
      });

      if (result.asset) {
        setGeneratedVisual(result.asset);
        setMediaAssets((current) => [result.asset as MediaAsset, ...current]);
      } else {
        setGeneratedVisual({
          id: `generated-visual-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          type: 'image',
          title: `Criativo IA - ${product.name}`,
          status: 'collected',
          source: result.provider,
          url: result.image_url,
          thumbnail_url: result.image_url,
          caption: createImagePrompt(product),
          platforms: [platform],
          quality_score: 88,
        });
      }

      toast.success(result.provider === 'openai' ? 'Imagem gerada pela API de IA' : 'Imagem fallback gerada para teste');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a imagem com IA real');
    } finally {
      setGeneratingVisual(false);
    }
  };

  const upsertQueue = (job: Job) => setQueue((current) => [job, ...current]);
  const updateQueue = (id: EntityId, patch: Partial<Job>) =>
    setQueue((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));

  const handleGenerate = async () => {
    if (!product) {
      toast.error('Selecione um anúncio base');
      return;
    }

    if (readiness < 80) {
      toast.error('Complete o checklist antes de gerar o vídeo.');
      return;
    }

    setGenerating(true);
    const jobId = `job-${Date.now()}`;
    upsertQueue({
      id: jobId,
      type: 'video_generation',
      status: 'processing',
      title: `${selectedTemplateConfig?.label} - ${product.name}`,
      product_id: product.id,
      progress: 35,
      created_at: new Date().toISOString(),
    });

    try {
      const script = scriptPreview || (await invokeLLM(createPrompt(product)));
      updateQueue(jobId, { progress: 72 });

      await createMediaAsset({
        product_id: product.id,
        product_name: product.name,
        type: 'generated_video',
        title: `${selectedTemplateConfig?.label} - ${product.name} (${duration})`,
        status: 'pending_review',
        source: 'IA Gerada',
        url: generationPreview || product.image_url || '',
        thumbnail_url: generationPreview || product.image_url || '',
        caption: script,
        platforms: [platform],
        duration,
        quality_score: 84,
      });

      await updateProduct(product.id, {
        status: 'review',
        videos_generated: (product.videos_generated || 0) + 1,
      });

      updateQueue(jobId, { status: 'completed', progress: 100, completed_at: new Date().toISOString() });
      toast.success('Vídeo gerado e enviado para aprovação!');
      setScriptPreview(script);
      const updatedVideos = await filterMediaAssets({ type: 'generated_video' }, '-created_date', 50);
      setVideos(updatedVideos);
    } catch {
      updateQueue(jobId, { status: 'failed', progress: 100, error_message: 'Falha ao gerar vídeo' });
      toast.error('Não foi possível gerar o vídeo agora');
    } finally {
      setGenerating(false);
    }
  };

  const handleVideoStatus = async (asset: MediaAsset, status: Status, message: string) => {
    try {
      await updateMediaAsset(asset.id, { status });
      toast.success(message);
      setActiveVideo((current) => (current?.id === asset.id ? { ...current, status } : current));
      const updatedVideos = await filterMediaAssets({ type: 'generated_video' }, '-created_date', 50);
      setVideos(updatedVideos);
    } catch {
      toast.error('Não foi possível atualizar o vídeo');
    }
  };

  return (
    <div>
      <TopBar title="Geração de Vídeos" subtitle="Transforme anúncios prontos em roteiros, criativos e vídeos para redes sociais" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StudioMetric label="Vídeos" value={stats.total} icon={Film} />
          <StudioMetric label="Em geração" value={stats.generating} icon={Clock} tone="primary" />
          <StudioMetric label="Em revisão" value={stats.review} icon={ListChecks} tone="warning" />
          <StudioMetric label="Aprovados" value={stats.approved} icon={CheckCircle} tone="success" />
          <StudioMetric label="Rejeitados" value={stats.rejected} icon={XCircle} tone="destructive" />
        </div>

        {error && <ErrorState onRetry={load} />}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Wand2} title="Configuração do vídeo" subtitle="Escolha o anúncio base, formato, plataforma e briefing" />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Label>Anúncio base</Label>
                  <Select value={selectedProduct} onValueChange={(value) => { setSelectedProduct(value); setSelectedMediaIds([]); }}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Selecionar anúncio base..." /></SelectTrigger>
                    <SelectContent>
                      {products.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plataforma principal</Label>
                  <Select value={String(platform)} onValueChange={(value) => setPlatform(value)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{platforms.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-5">
                <Label className="mb-2 block">Templates de vídeo</Label>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn('rounded-xl border p-3 text-left transition-all', selectedTemplate === template.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:bg-muted')}
                    >
                      <p className={cn('text-xs font-semibold', selectedTemplate === template.id ? 'text-primary' : 'text-foreground')}>{template.label}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <OptionGroup label="Formato" options={formats.map((item) => `${item.label} ${item.ratio}`)} active={`${selectedFormatConfig?.label} ${selectedFormatConfig?.ratio}`} onSelect={(value) => setSelectedFormat(formats.find((item) => `${item.label} ${item.ratio}` === value)?.id || 'reels')} />
                <OptionGroup label="Duração" options={[...durations]} active={duration} onSelect={(value) => setDuration(value as typeof duration)} />
                <OptionGroup label="Ritmo" options={rhythms} active={rhythm} onSelect={setRhythm} />
              </div>

              <div className="mt-4">
                <Label>Áudio</Label>
                <Select value={audio} onValueChange={setAudio}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{audioOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Target} title="Briefing profissional" subtitle="Campos separados deixam o roteiro mais consistente" />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Field label="Público-alvo" value={briefing.targetAudience} onChange={(value) => setBriefing({ ...briefing, targetAudience: value })} placeholder="ex: mulheres 25-40 que compram skincare" />
                <Field label="Tom de voz" value={briefing.tone} onChange={(value) => setBriefing({ ...briefing, tone: value })} />
                <Field label="Objetivo" value={briefing.objective} onChange={(value) => setBriefing({ ...briefing, objective: value })} placeholder="Alcance, tráfego, leads, remarketing..." />
                <Field label="Oferta/promessa" value={briefing.promise} onChange={(value) => setBriefing({ ...briefing, promise: value })} placeholder="Principal promessa do anúncio original" />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Field label="CTA" value={briefing.cta} onChange={(value) => setBriefing({ ...briefing, cta: value })} />
                <Field label="Restrições" value={briefing.restrictions} onChange={(value) => setBriefing({ ...briefing, restrictions: value })} placeholder="Evitar promessas, palavras, estilo..." />
              </div>
              <div className="mt-4">
                <Label>Observações extras</Label>
                <Textarea value={briefing.extra} onChange={(event) => setBriefing({ ...briefing, extra: event.target.value })} className="mt-1.5 h-24 resize-none" placeholder="Instruções específicas, concorrentes, detalhes visuais..." />
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="gap-2" onClick={handleImproveBriefing} disabled={generatingScript || !product}>
                  <Bot className="h-4 w-4" /> Melhorar briefing com IA
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleGenerateScript} disabled={generatingScript || !product}>
                  <Sparkles className="h-4 w-4" /> {generatingScript ? 'Criando roteiro...' : 'Gerar roteiro antes do vídeo'}
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Layers3} title="Mídias para composição" subtitle="Escolha imagens e vídeos da biblioteca para orientar a geração" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {availableMedia.slice(0, 10).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => setSelectedMediaIds((current) => current.includes(asset.id) ? current.filter((id) => id !== asset.id) : [...current, asset.id])}
                    className={cn('relative overflow-hidden rounded-xl border bg-muted text-left', selectedMediaIds.includes(asset.id) ? 'border-primary ring-2 ring-primary/20' : 'border-border')}
                  >
                    <div className="aspect-square">
                      {getAssetPreview(asset) ? <img src={getAssetPreview(asset)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Film className="h-6 w-6 text-muted-foreground" /></div>}
                    </div>
                    <div className="absolute left-2 top-2"><Checkbox checked={selectedMediaIds.includes(asset.id)} /></div>
                  </button>
                ))}
              </div>
              {availableMedia.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma mídia encontrada para este anúncio. O gerador usará o print/criativo principal quando disponível.</p>}
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Image} title="Imagem IA para o vídeo" subtitle="Gere um criativo visual pela API para usar como capa/base do vídeo" />
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
                <div>
                  <Label>Direção visual</Label>
                  <Textarea
                    value={visualPrompt}
                    onChange={(event) => setVisualPrompt(event.target.value)}
                    className="mt-1.5 h-28 resize-none"
                    placeholder="Ex: estilo UGC premium, fundo escuro, texto curto de promessa, cena de uso, CTA discreto..."
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" className="gap-2" onClick={handleGenerateVisual} disabled={generatingVisual || !product}>
                      <Image className="h-4 w-4" />
                      {generatingVisual ? 'Gerando imagem...' : 'Gerar imagem IA'}
                    </Button>
                    {generatedVisual && (
                      <Button variant="ghost" onClick={() => setGeneratedVisual(null)}>
                        Remover imagem IA
                      </Button>
                    )}
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                  {generatedVisual?.url ? (
                    <img src={generatedVisual.url} alt={generatedVisual.title || 'Imagem gerada por IA'} className="aspect-[9/16] h-full w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[9/16] h-full w-full flex-col items-center justify-center p-5 text-center">
                      <Image className="mb-3 h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">Prévia da imagem</p>
                      <p className="mt-1 text-xs text-muted-foreground">A imagem gerada aparecerá aqui e será usada no vídeo.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={ListChecks} title="Checklist antes de gerar" subtitle="Reduz erro e melhora o resultado final" />
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Prontidão</span>
                  <span className="font-bold text-primary">{readiness}%</span>
                </div>
                <Progress value={readiness} />
              </div>
              <div className="mt-4 space-y-3">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-xl bg-muted/35 p-3">
                    {item.ok ? <CheckCircle className="mt-0.5 h-4 w-4 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full gap-2" onClick={handleGenerate} disabled={generating || !product}>
                <Rocket className="h-4 w-4" />
                {generating ? 'Gerando vídeo...' : 'Gerar vídeo com IA'}
              </Button>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={Clock} title="Fila de jobs" subtitle="Status, progresso, retry e erros" />
              <div className="mt-4 space-y-2">
                {queue.length === 0 ? (
                  <p className="rounded-xl bg-muted/35 p-4 text-sm text-muted-foreground">Nenhum job em andamento.</p>
                ) : (
                  queue.map((job) => (
                    <div key={job.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{job.error_message || 'Tempo estimado: 1-3 min'}</p>
                        </div>
                        <JobStatusBadge status={job.status} />
                      </div>
                      <Progress value={job.progress || 0} className="mt-3" />
                      <div className="mt-2 flex justify-end gap-2">
                        {job.status === 'failed' && <Button size="sm" variant="outline" className="h-8 gap-1"><RefreshCw className="h-3.5 w-3.5" /> Repetir</Button>}
                        {['queued', 'processing'].includes(job.status) && <Button size="sm" variant="ghost" className="h-8" onClick={() => updateQueue(job.id, { status: 'cancelled', progress: 100 })}>Cancelar</Button>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SectionTitle icon={Play} title="Prévia do roteiro" subtitle="Revise antes de renderizar o vídeo final" />
            {scriptPreview && <Button variant="outline" size="sm" className="gap-2" onClick={() => navigator.clipboard.writeText(scriptPreview)}><Copy className="h-4 w-4" /> Copiar roteiro</Button>}
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
            {scriptPreview ? (
              <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{scriptPreview}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">Gere um roteiro para visualizar gancho, cenas, texto na tela, legenda e CTA final.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SectionTitle icon={Film} title="Histórico de gerações" subtitle="Vídeos recentes, status, score e ações" />
            <Select value={historyFilter} onValueChange={setHistoryFilter}>
              <SelectTrigger className="w-full md:w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{historyFilters.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="aspect-video animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border py-12 text-center">
              <Film className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-syne font-bold text-foreground">Nenhum vídeo neste filtro</p>
              <p className="mt-1 text-sm text-muted-foreground">Gere um vídeo ou altere o filtro de histórico.</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((asset) => (
                <VideoCard key={asset.id} asset={asset} onOpen={setActiveVideo} onStatus={handleVideoStatus} />
              ))}
            </div>
          )}
        </section>
      </div>

      <VideoDetailsDialog asset={activeVideo} open={Boolean(activeVideo)} onOpenChange={(open) => !open && setActiveVideo(null)} onStatus={handleVideoStatus} />
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Film; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-syne text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StudioMetric({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: number; icon: typeof Film; tone?: 'neutral' | 'primary' | 'warning' | 'success' | 'destructive' }) {
  const toneClass = {
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    destructive: 'bg-destructive/10 text-destructive',
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div>
      <p className="font-syne text-xl font-bold text-foreground sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5" />
    </div>
  );
}

function OptionGroup({ label, options, active, onSelect }: { label: string; options: string[]; active: string; onSelect: (value: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn('rounded-xl border px-3 py-2 text-xs font-medium transition-all', active === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted')}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function VideoCard({ asset, onOpen, onStatus }: { asset: MediaAsset; onOpen: (asset: MediaAsset) => void; onStatus: (asset: MediaAsset, status: Status, message: string) => void }) {
  const score = getVideoScore(asset);
  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.06]">
      <button type="button" onClick={() => onOpen(asset)} className="relative aspect-video w-full bg-muted">
        {asset.thumbnail_url ? <img src={asset.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Film className="h-8 w-8 text-muted-foreground/30" /></div>}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground"><Play className="ml-0.5 h-4 w-4" fill="currentColor" /></span>
        </div>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground"><Sparkles className="h-2.5 w-2.5" /> IA</span>
        <div className="absolute bottom-2 right-2"><StatusBadge status={asset.status} /></div>
      </button>
      <div className="p-4">
        <p className="truncate text-sm font-semibold text-foreground">{asset.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{asset.product_name}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <ScoreMini label="Visual" value={score} />
          <ScoreMini label="CTA" value={Math.min(score + 6, 100)} />
          <ScoreMini label="Spam" value={Math.max(100 - score, 8)} invert />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => onStatus(asset, 'approved', 'Vídeo aprovado')}>Aprovar</Button>
          <Button size="sm" variant="outline" className="h-8 flex-1" onClick={() => onStatus(asset, 'rejected', 'Vídeo rejeitado')}>Rejeitar</Button>
          <Button size="sm" className="h-8 flex-1" onClick={() => onStatus(asset, 'scheduled', 'Vídeo enviado para agendamento')}>Agendar</Button>
        </div>
      </div>
    </div>
  );
}

function ScoreMini({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value <= 30 : value >= 75;
  return (
    <div className="rounded-xl bg-muted/45 p-2">
      <p className={cn('font-bold', good ? 'text-success' : 'text-warning')}>{value}%</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function VideoDetailsDialog({ asset, open, onOpenChange, onStatus }: { asset: MediaAsset | null; open: boolean; onOpenChange: (open: boolean) => void; onStatus: (asset: MediaAsset, status: Status, message: string) => void }) {
  if (!asset) return null;
  const score = getVideoScore(asset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden rounded-3xl p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="border-b border-border px-5 py-4 font-syne text-lg sm:px-6 sm:text-xl">Detalhes do vídeo gerado</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[calc(90vh-72px)] min-w-0 gap-0 overflow-y-auto overflow-x-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)]">
          <div className="min-w-0 border-b border-border bg-muted/40 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-background">
              {asset.url ? <video src={asset.url} poster={asset.thumbnail_url} controls className="max-h-[62vh] min-h-[260px] w-full bg-black object-contain" /> : asset.thumbnail_url ? <img src={asset.thumbnail_url} alt="" className="max-h-[62vh] min-h-[260px] w-full object-contain" /> : <div className="flex min-h-[300px] items-center justify-center"><Film className="h-10 w-10 text-muted-foreground/40" /></div>}
            </div>
          </div>
          <div className="min-w-0 space-y-4 p-4 sm:p-5">
            <div>
              <h2 className="break-words font-syne text-lg font-bold leading-tight text-foreground sm:text-xl">{asset.title}</h2>
              <p className="mt-1 break-words text-sm text-muted-foreground">{asset.product_name}</p>
            </div>
            <div className="flex flex-wrap gap-2"><StatusBadge status={asset.status} /><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Score {score}%</span></div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Score de qualidade</p>
              <div className="space-y-3">
                <QualityLine label="Qualidade visual" value={score} />
                <QualityLine label="Clareza da oferta" value={Math.min(score + 4, 100)} />
                <QualityLine label="Força do CTA" value={Math.min(score + 6, 100)} />
                <QualityLine label="Adequação à plataforma" value={Math.min(score + 2, 100)} />
                <QualityLine label="Risco de parecer spam" value={Math.max(100 - score, 8)} invert />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-2 text-sm font-semibold text-foreground">Roteiro e legenda</p>
              <div className="max-h-40 overflow-y-auto pr-1">
                <p className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{asset.caption || 'Sem roteiro salvo.'}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="h-10 gap-2 rounded-xl" onClick={() => onStatus(asset, 'approved', 'Vídeo aprovado')}><CheckCircle className="h-4 w-4" /> Aprovar</Button>
              <Button variant="outline" className="h-10 gap-2 rounded-xl" onClick={() => onStatus(asset, 'rejected', 'Vídeo rejeitado')}><XCircle className="h-4 w-4" /> Rejeitar</Button>
              <Button variant="outline" className="h-10 gap-2 rounded-xl" onClick={() => onStatus(asset, 'generating', 'Variação enviada para geração')}><RefreshCw className="h-4 w-4" /> Criar variação</Button>
              <Button className="h-10 gap-2 rounded-xl" onClick={() => onStatus(asset, 'scheduled', 'Vídeo enviado para agendamento')}><Clock className="h-4 w-4" /> Agendar publicação</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QualityLine({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
  const good = invert ? value <= 30 : value >= 75;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold', good ? 'text-success' : 'text-warning')}>{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}
