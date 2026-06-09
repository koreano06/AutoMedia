import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
import JobStatusBadge from '@/components/common/JobStatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle,
  Clock,
  Copy,
  Film,
  Image,
  Layers3,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Trash2,
  Wand2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SOCIAL_PLATFORMS } from '@/config/platforms';
import { filterMediaAssets, listMediaAssets, updateMediaAsset } from '@/services/mediaAssets';
import { listProducts } from '@/services/products';
import { generateImage, invokeLLM } from '@/services/ai';
import { generateVideo } from '@/services/videos';
import { getJob } from '@/services/jobs';
import type { EntityId, Job, MediaAsset, Platform, Product, Status } from '@/types/entities';

const templates = [
  { id: 'product', label: 'Anúncio direto', desc: 'Gancho, benefício principal e CTA direto', visual: 'Studio clean', motion: 'Zoom suave + texto grande', accent: 'from-orange-500 to-primary', prompt: 'fundo limpo, foco no produto, tipografia grande, CTA direto' },
  { id: 'unboxing', label: 'Unboxing', desc: 'Abertura, detalhes e primeira impressão', visual: 'UGC premium', motion: 'Cortes rápidos + close', accent: 'from-amber-400 to-orange-500', prompt: 'mãos abrindo embalagem, detalhe do produto, sensação real de descoberta' },
  { id: 'before_after', label: 'Antes e depois', desc: 'Transformação visual e prova de valor', visual: 'Split screen', motion: 'Comparação + transição', accent: 'from-teal-400 to-emerald-500', prompt: 'comparação antes e depois, transformação visual clara, prova de valor' },
  { id: 'quick_review', label: 'Review rápido', desc: 'Pontos fortes em sequência curta', visual: 'Review tech', motion: 'Cards de pontos fortes', accent: 'from-sky-400 to-blue-500', prompt: 'review moderno, bullets visuais, detalhes do produto em cena' },
  { id: 'flash_offer', label: 'Oferta relâmpago', desc: 'Urgência, preço e chamada de compra', visual: 'Sale impact', motion: 'Pulsos + contador', accent: 'from-red-500 to-orange-500', prompt: 'oferta relâmpago, urgência visual, preço e CTA destacados sem parecer spam' },
  { id: 'social_proof', label: 'Prova social', desc: 'Depoimentos, avaliações e confiança', visual: 'Trust cards', motion: 'Depoimentos flutuantes', accent: 'from-violet-400 to-fuchsia-500', prompt: 'avaliações, prova social, elementos de confiança, visual limpo' },
  { id: 'demo', label: 'Demonstração', desc: 'Mostra a oferta em uso ou contexto real', visual: 'Hands-on demo', motion: 'Passo a passo curto', accent: 'from-lime-400 to-emerald-500', prompt: 'produto em uso, demonstração clara, contexto cotidiano e benefício prático' },
  { id: 'story', label: 'Story curto', desc: 'Formato leve para atenção rápida', visual: 'Creator story', motion: 'Texto falado + CTA leve', accent: 'from-pink-400 to-orange-400', prompt: 'visual espontâneo, story vertical, linguagem natural e CTA leve' },
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

type VideoScene = {
  id: string;
  title: string;
  duration: string;
  onScreenText: string;
  narration: string;
  visualDirection: string;
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

const createSceneId = () => `scene_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const createDefaultScenes = (productName = 'produto', currentBriefing: Briefing = emptyBriefing): VideoScene[] => [
  {
    id: createSceneId(),
    title: 'Gancho inicial',
    duration: '0-3s',
    onScreenText: `${productName}: atenção nos primeiros segundos`,
    narration: currentBriefing.promise || `Conheça uma oferta prática para quem procura ${productName}.`,
    visualDirection: 'Close forte no produto, fundo limpo, texto grande e contraste alto.',
  },
  {
    id: createSceneId(),
    title: 'Benefício principal',
    duration: '3-8s',
    onScreenText: currentBriefing.promise || 'Benefício claro em poucos segundos',
    narration: `Mostre o principal motivo para a pessoa se interessar pela oferta.`,
    visualDirection: 'Movimento de zoom/pan no produto, detalhe visual e ritmo rápido.',
  },
  {
    id: createSceneId(),
    title: 'Prova e contexto',
    duration: '8-12s',
    onScreenText: 'Veja como isso ajuda no dia a dia',
    narration: 'Reforce a utilidade, o contexto de uso e uma prova simples sem exageros.',
    visualDirection: 'Cena de uso, detalhe de textura/material ou comparação visual.',
  },
  {
    id: createSceneId(),
    title: 'CTA final',
    duration: '12-15s',
    onScreenText: currentBriefing.cta || 'Comente "eu quero"',
    narration: currentBriefing.cta || 'Comente eu quero para receber o link.',
    visualDirection: 'Tela final com produto, CTA visível e visual limpo para publicação.',
  },
];

const getAssetPreview = (asset: MediaAsset) => asset.thumbnail_url || asset.url;
const getVideoScore = (asset: MediaAsset) => Number(asset.quality_score ?? (asset.status === 'approved' ? 88 : asset.status === 'rejected' ? 38 : 72));
const getJobStage = (job: Job) => {
  const progress = job.progress || 0;
  if (job.status === 'failed') return { label: 'Falhou', detail: job.error_message || 'Verifique o erro e tente novamente.', progress: 100 };
  if (job.status === 'cancelled') return { label: 'Cancelado', detail: 'O processamento foi interrompido.', progress: 100 };
  if (job.status === 'completed') return { label: 'Pronto para revisão', detail: 'Render concluído. Revise antes de publicar.', progress: 100 };
  if (job.status === 'queued' || progress < 20) return { label: 'Em fila', detail: 'Aguardando worker pegar o job.', progress };
  if (job.status === 'processing' || progress < 55) return { label: 'Preparando roteiro e assets', detail: 'Organizando cenas, mídia e plano de render.', progress };
  if (job.status === 'rendering' || progress < 85) return { label: 'Renderizando vídeo', detail: 'FFmpeg/worker montando o vídeo final.', progress };
  if (job.status === 'uploading' || progress < 100) return { label: 'Salvando mídia', detail: 'Enviando arquivo para storage e criando preview.', progress };
  return { label: 'Processando', detail: 'Acompanhando atualização do backend.', progress };
};

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
  const [scenes, setScenes] = useState<VideoScene[]>(createDefaultScenes());
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState<Job[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [activeVideo, setActiveVideo] = useState<MediaAsset | null>(null);
  const [activeWizardStep, setActiveWizardStep] = useState(1);

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
  const activeJobs = queue.filter((job) => ['queued', 'processing', 'rendering', 'uploading'].includes(job.status));

  const stats = {
    total: videos.length,
    generating: queue.filter((job) => ['queued', 'processing', 'rendering', 'uploading'].includes(job.status)).length,
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
  const recommendedStep = !product ? 1 : readiness < 80 ? 2 : activeJobs.length > 0 ? 4 : 3;
  const qualityWarnings = [
    !product ? 'Selecione um anúncio base para contextualizar o roteiro.' : '',
    !generationPreview && selectedMedia.length === 0 ? 'Adicione uma imagem real ou gere um criativo IA para evitar vídeo genérico.' : '',
    !briefing.promise.trim() ? 'Preencha a promessa principal para deixar o gancho mais forte.' : '',
    scriptPreview && scriptPreview.length < 120 ? 'Roteiro curto demais: revise antes de renderizar.' : '',
  ].filter(Boolean);
  const currentStep = activeWizardStep;
  const wizardProgress = Math.round((currentStep / 4) * 100);
  const stepCards = [
    { number: 1, title: 'Anúncio', desc: 'Escolha produto, destino e formato', done: Boolean(product) },
    { number: 2, title: 'Briefing', desc: 'Defina promessa, público e CTA', done: readiness >= 80 },
    { number: 3, title: 'Roteiro & mídia', desc: 'Gere roteiro, imagem e escolha assets', done: Boolean(product && (scriptPreview || scenes.some((scene) => scene.onScreenText || scene.narration) || generationPreview || selectedMedia.length)) },
    { number: 4, title: 'Render & revisão', desc: 'Renderize, acompanhe fila e aprove', done: stats.review + stats.approved > 0 },
  ];
  const canAdvanceWizard =
    currentStep === 1
      ? Boolean(product)
      : currentStep === 2
        ? readiness >= 60
        : currentStep === 3
          ? Boolean(product && (scriptPreview || scenes.some((scene) => scene.onScreenText || scene.narration) || generationPreview || selectedMedia.length || product.image_url))
          : readiness >= 80;
  const stageCardClass = (step: number) =>
    cn(
      'rounded-2xl border bg-card p-4 transition-all sm:p-5',
      currentStep === step
        ? 'border-primary/60 shadow-lg shadow-primary/10 ring-1 ring-primary/20'
        : 'border-border',
    );

  useEffect(() => {
    setActiveWizardStep((current) => (recommendedStep > current ? recommendedStep : current));
  }, [recommendedStep]);

  const updateScene = (id: string, patch: Partial<VideoScene>) => {
    setScenes((current) => current.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene)));
  };

  const addScene = () => {
    setScenes((current) => [
      ...current,
      {
        id: createSceneId(),
        title: `Cena ${current.length + 1}`,
        duration: '',
        onScreenText: '',
        narration: '',
        visualDirection: '',
      },
    ]);
  };

  const removeScene = (id: string) => {
    setScenes((current) => (current.length <= 1 ? current : current.filter((scene) => scene.id !== id)));
  };

  const resetScenesFromBriefing = () => {
    setScenes(createDefaultScenes(product?.name, briefing));
    toast.success('Estrutura de cenas atualizada');
  };

  const buildStructuredScript = (baseScript = scriptPreview) => {
    const filledScenes = scenes.filter((scene) => scene.title || scene.onScreenText || scene.narration || scene.visualDirection);
    if (filledScenes.length === 0) return scriptPreview;

    const sceneText = filledScenes
      .map((scene, index) => [
        `Cena ${index + 1}: ${scene.title || 'Sem título'}`,
        scene.duration ? `Tempo: ${scene.duration}` : '',
        scene.onScreenText ? `Texto na tela: ${scene.onScreenText}` : '',
        scene.narration ? `Narração/legenda: ${scene.narration}` : '',
        scene.visualDirection ? `Direção visual: ${scene.visualDirection}` : '',
      ].filter(Boolean).join('\n'))
      .join('\n\n');

    return [
      baseScript ? `Roteiro IA/base:\n${baseScript}` : '',
      `Roteiro estruturado por cenas:\n${sceneText}`,
      `CTA final: ${briefing.cta}`,
      `Observações: ${briefing.restrictions || 'Evitar promessas exageradas e manter linguagem natural.'}`,
    ].filter(Boolean).join('\n\n');
  };
  const filledSceneCount = scenes.filter((scene) => scene.title && scene.onScreenText && scene.narration).length;
  const hasVisualBase = Boolean(generationPreview || selectedMedia.length || product?.image_url);
  const creativeScore = Math.min(
    100,
    Math.round(
      (product ? 18 : 0)
      + (hasVisualBase ? 18 : 0)
      + (briefing.promise.trim() ? 14 : 0)
      + (briefing.cta.trim() ? 12 : 0)
      + (scriptPreview ? 14 : 0)
      + Math.min(16, filledSceneCount * 4)
      + (visualPrompt.trim() ? 8 : 0),
    ),
  );
  const creativeScoreLabel = creativeScore >= 82 ? 'Pronto para render' : creativeScore >= 62 ? 'Bom, mas revise' : 'Precisa de ajustes';

  useEffect(() => {
    if (activeJobs.length === 0) return;

    const timer = window.setInterval(async () => {
      const settledJobs: Job[] = [];

      await Promise.all(
        activeJobs.map(async (job) => {
          if (job.id.startsWith('job-') || job.id.startsWith('local_')) return;

          try {
            const freshJob = await getJob(job.id);
            updateQueue(job.id, freshJob);
            if (['completed', 'failed', 'cancelled'].includes(freshJob.status)) {
              settledJobs.push(freshJob);
            }
          } catch {
            updateQueue(job.id, { error_message: 'Não foi possível atualizar o status em tempo real.' });
          }
        }),
      );

      if (settledJobs.some((job) => job.status === 'completed')) {
        const updatedVideos = await filterMediaAssets({ type: 'generated_video' }, '-created_date', 50);
        setVideos(updatedVideos);
      }
    }, 3500);

    return () => window.clearInterval(timer);
  }, [activeJobs]);

  const createPrompt = (currentProduct: Product, scriptOnly = false) => `
Crie ${scriptOnly ? 'um roteiro estruturado' : 'um roteiro final'} para transformar um anúncio pronto em vídeo de divulgação.
Anúncio/oferta base: ${currentProduct.name}
Texto/contexto do anúncio original: ${currentProduct.description || 'Sem descrição'}
Categoria/nicho: ${currentProduct.category || 'Não informada'}
Template: ${selectedTemplateConfig?.label}
Direção visual do template: ${selectedTemplateConfig?.visual} - ${selectedTemplateConfig?.motion}
Guia criativo do template: ${selectedTemplateConfig?.prompt}
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
Direção visual do template: ${selectedTemplateConfig?.visual}
Movimento esperado: ${selectedTemplateConfig?.motion}
Guia criativo: ${selectedTemplateConfig?.prompt}
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
      if (!scenes.some((scene) => scene.onScreenText || scene.narration)) {
        setScenes(createDefaultScenes(product.name, briefing));
      }
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
      const baseScript = scriptPreview || (await invokeLLM(createPrompt(product)));
      if (!scriptPreview) setScriptPreview(baseScript);
      const script = buildStructuredScript(baseScript) || baseScript;
      updateQueue(jobId, { progress: 72 });

      const result = await generateVideo({
        product_id: product.id,
        media_asset_ids: selectedMediaIds,
        style: selectedTemplate,
        template: selectedTemplateConfig?.label || selectedTemplate,
        format: selectedFormat,
        ratio: selectedFormatConfig?.ratio,
        duration,
        platform,
        platforms: [platform],
        briefing: briefing.extra,
        briefing_fields: briefing,
        visual_prompt: visualPrompt,
        script,
        rhythm,
        audio,
      });

      setQueue((current) => [
        result.job,
        ...current.filter((job) => job.id !== jobId && job.id !== result.job.id),
      ]);
      toast.success('Vídeo enviado para a fila de renderização!');
      setScriptPreview(result.script || script);
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
      <div className="mobile-page-pad page-stack">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StudioMetric label="Vídeos" value={stats.total} icon={Film} />
          <StudioMetric label="Em geração" value={stats.generating} icon={Clock} tone="primary" />
          <StudioMetric label="Em revisão" value={stats.review} icon={ListChecks} tone="warning" />
          <StudioMetric label="Aprovados" value={stats.approved} icon={CheckCircle} tone="success" />
          <StudioMetric label="Rejeitados" value={stats.rejected} icon={XCircle} tone="destructive" />
        </div>

        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
            <div className="p-4 sm:p-5">
              <SectionTitle icon={Rocket} title="Fluxo guiado do criativo" subtitle="Do anúncio base até o vídeo pronto para publicação" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stepCards.map((step) => (
                  <FlowStep
                    key={step.number}
                    number={step.number}
                    title={step.title}
                    desc={step.desc}
                    active={currentStep === step.number}
                    done={step.done}
                    onClick={() => setActiveWizardStep(step.number)}
                  />
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-border bg-muted/25 p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-muted-foreground">Progresso do fluxo</span>
                  <span className="font-syne font-bold text-primary">{wizardProgress}%</span>
                </div>
                <Progress value={wizardProgress} />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Etapa {currentStep}/4: {stepCards[currentStep - 1]?.desc}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={currentStep === 1}
                      onClick={() => setActiveWizardStep((step) => Math.max(1, step - 1))}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={currentStep === 4 || !canAdvanceWizard}
                      onClick={() => setActiveWizardStep((step) => Math.min(4, step + 1))}
                    >
                      Próximo <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border bg-muted/25 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <p className="font-syne text-sm font-bold text-foreground">Próxima melhor ação</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {!product
                  ? 'Escolha um anúncio base para a IA entender o produto.'
                  : readiness < 80
                    ? 'Complete o checklist para reduzir erros no render.'
                    : activeJobs.length > 0
                      ? 'Acompanhe o job até finalizar e revise o vídeo.'
                      : 'Gere o vídeo ou crie uma variação com outro template.'}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <InfoPill label="Prontidão" value={`${readiness}%`} />
                <InfoPill label="Formato" value={selectedFormatConfig?.ratio || '9:16'} />
                <InfoPill label="Template" value={selectedTemplateConfig?.label || 'Direto'} />
                <InfoPill label="Destino" value={String(platform)} />
              </div>
            </div>
          </div>
        </section>

        {error && <ErrorState onRetry={load} />}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section className={stageCardClass(1)}>
              <SectionTitle icon={Wand2} title="Configuração do vídeo" subtitle="Escolha o anúncio base, formato, plataforma e briefing" />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <Label>Anúncio base</Label>
                  <Select value={selectedProduct} onValueChange={(value) => { const nextProduct = products.find((item) => item.id === value); setSelectedProduct(value); setSelectedMediaIds([]); setScenes(createDefaultScenes(nextProduct?.name, briefing)); }}>
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
                      className={cn('group overflow-hidden rounded-2xl border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5', selectedTemplate === template.id ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' : 'border-border hover:bg-muted')}
                    >
                      <div className={cn('h-1.5 bg-gradient-to-r', template.accent)} />
                      <div className="p-3">
                        <p className={cn('text-xs font-semibold', selectedTemplate === template.id ? 'text-primary' : 'text-foreground')}>{template.label}</p>
                        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{template.desc}</p>
                        <div className="mt-3 space-y-1 rounded-xl bg-background/55 p-2">
                          <p className="truncate text-[10px] font-semibold text-foreground">{template.visual}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{template.motion}</p>
                        </div>
                      </div>
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

            <section className={stageCardClass(2)}>
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

            <section className={stageCardClass(3)}>
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

            <section className={stageCardClass(3)}>
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
            <section className={stageCardClass(4)}>
              <SectionTitle icon={Play} title="Preview antes do render" subtitle="Resumo visual do vídeo antes de consumir fila/IA" />
              <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                <div className="overflow-hidden rounded-[2rem] border border-border bg-background p-2 shadow-inner">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[1.5rem] bg-muted">
                    {generationPreview || product?.image_url ? (
                      <img src={generationPreview || product?.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-5 text-center">
                        <Image className="mb-3 h-8 w-8 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">Sem imagem base</p>
                      </div>
                    )}
                    <div className="absolute inset-x-3 top-3">
                      <span className={cn('inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-bold text-white shadow-lg', selectedTemplateConfig?.accent)}>
                        {selectedTemplateConfig?.label}
                      </span>
                    </div>
                    <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/55 p-3 backdrop-blur">
                      <p className="line-clamp-2 font-syne text-sm font-bold text-white">
                        {scenes[0]?.onScreenText || briefing.promise || product?.name || 'Gancho do vídeo'}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[10px] text-white/70">{briefing.cta || 'CTA final'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-syne text-sm font-bold text-foreground">{creativeScoreLabel}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Score calculado com base em briefing, cenas, mídia, CTA e roteiro.
                        </p>
                      </div>
                      <span className={cn('rounded-2xl px-3 py-2 font-syne text-lg font-bold', creativeScore >= 82 ? 'bg-success/10 text-success' : creativeScore >= 62 ? 'bg-warning/10 text-warning' : 'bg-destructive/10 text-destructive')}>
                        {creativeScore}%
                      </span>
                    </div>
                    <Progress value={creativeScore} className="mt-4" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <InfoPill label="Cenas completas" value={`${filledSceneCount}/${scenes.length}`} />
                    <InfoPill label="Movimento" value={selectedTemplateConfig?.motion || 'Padrão'} />
                    <InfoPill label="Visual" value={selectedTemplateConfig?.visual || 'Padrão'} />
                    <InfoPill label="Áudio" value={audio} />
                  </div>
                </div>
              </div>
            </section>

            <section className={stageCardClass(4)}>
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

            <section className={stageCardClass(4)}>
              <SectionTitle icon={Clock} title="Fila de jobs" subtitle="Status, progresso, retry e erros" />
              <div className="mt-4 space-y-2">
                {queue.length === 0 ? (
                  <p className="rounded-xl bg-muted/35 p-4 text-sm text-muted-foreground">Nenhum job em andamento.</p>
                ) : (
                  queue.map((job) => (
                    <JobQueueCard key={job.id} job={job} onCancel={() => updateQueue(job.id, { status: 'cancelled', progress: 100 })} />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              <SectionTitle icon={AlertTriangle} title="Qualidade antes do render" subtitle="Sinais que ajudam a evitar criativos fracos" />
              <div className="mt-4 space-y-3">
                <QualitySignal label="Base visual" ok={Boolean(generationPreview || selectedMedia.length || product?.image_url)} value={generationPreview ? 'Criativo IA' : selectedMedia.length ? `${selectedMedia.length} asset(s)` : product?.image_url ? 'Imagem do anúncio' : 'Ausente'} />
                <QualitySignal label="Roteiro" ok={Boolean(product && (scriptPreview || scenes.some((scene) => scene.onScreenText || scene.narration)))} value={scriptPreview ? 'IA + cenas' : product && scenes.some((scene) => scene.onScreenText || scene.narration) ? 'Cenas editáveis' : 'Ainda não gerado'} />
                <QualitySignal label="CTA" ok={Boolean(briefing.cta.trim())} value={briefing.cta || 'Ausente'} />
                <QualitySignal label="Score criativo" ok={creativeScore >= 62} value={`${creativeScore}% · ${creativeScoreLabel}`} />
                <QualitySignal label="Risco operacional" ok={qualityWarnings.length === 0} value={qualityWarnings.length === 0 ? 'Baixo' : `${qualityWarnings.length} alerta(s)`} />
              </div>
              {qualityWarnings.length > 0 && (
                <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-3">
                  <p className="text-xs font-semibold text-warning">Ajustes recomendados</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                    {qualityWarnings.map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>

        <section className={stageCardClass(3)}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <SectionTitle icon={ListChecks} title="Editor de roteiro por cenas" subtitle="Ajuste o que aparece, o que é narrado e a direção visual antes do render" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={resetScenesFromBriefing}>
                <Sparkles className="h-4 w-4" /> Sugerir cenas
              </Button>
              <Button type="button" size="sm" className="gap-2" onClick={addScene}>
                <Plus className="h-4 w-4" /> Adicionar cena
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {scenes.map((scene, index) => (
              <div key={scene.id} className="rounded-2xl border border-border bg-muted/25 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-syne text-xs font-bold uppercase tracking-[0.14em] text-primary">Cena {index + 1}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use frases curtas para melhorar legibilidade no vídeo.</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    disabled={scenes.length <= 1}
                    onClick={() => removeScene(scene.id)}
                    aria-label={`Remover cena ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <Field label="Título da cena" value={scene.title} onChange={(value) => updateScene(scene.id, { title: value })} placeholder="Gancho, benefício, prova..." />
                  <Field label="Tempo" value={scene.duration} onChange={(value) => updateScene(scene.id, { duration: value })} placeholder="0-3s" />
                </div>
                <div className="mt-3">
                  <Label>Texto na tela</Label>
                  <Textarea
                    value={scene.onScreenText}
                    onChange={(event) => updateScene(scene.id, { onScreenText: event.target.value })}
                    className="mt-1.5 h-20 resize-none"
                    placeholder="Frase curta que aparecerá no vídeo"
                  />
                </div>
                <div className="mt-3">
                  <Label>Narração ou legenda</Label>
                  <Textarea
                    value={scene.narration}
                    onChange={(event) => updateScene(scene.id, { narration: event.target.value })}
                    className="mt-1.5 h-20 resize-none"
                    placeholder="O que a IA/roteiro deve comunicar nesta cena"
                  />
                </div>
                <div className="mt-3">
                  <Label>Direção visual</Label>
                  <Textarea
                    value={scene.visualDirection}
                    onChange={(event) => updateScene(scene.id, { visualDirection: event.target.value })}
                    className="mt-1.5 h-20 resize-none"
                    placeholder="Zoom, close, movimento, fundo, elementos visuais..."
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={stageCardClass(3)}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SectionTitle icon={Play} title="Prévia do roteiro" subtitle="Revise antes de renderizar o vídeo final" />
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigator.clipboard.writeText(buildStructuredScript())}><Copy className="h-4 w-4" /> Copiar roteiro</Button>
          </div>
          <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
            {scriptPreview || scenes.some((scene) => scene.onScreenText || scene.narration) ? (
              <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{buildStructuredScript()}</pre>
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

function FlowStep({ number, title, desc, active, done, onClick }: { number: number; title: string; desc: string; active?: boolean; done?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10' : done ? 'border-success/25 bg-success/5' : 'border-border bg-muted/25',
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl font-syne text-sm font-bold', done ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          {done ? <CheckCircle className="h-4 w-4" /> : number}
        </span>
        {active && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">Agora</span>}
      </div>
      <p className="font-syne text-sm font-bold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{desc}</p>
    </button>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-syne text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function QualitySignal({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/25 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', ok ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
          {ok ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{value}</p>
        </div>
      </div>
      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ok ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>
        {ok ? 'OK' : 'Ajustar'}
      </span>
    </div>
  );
}

function JobQueueCard({ job, onCancel }: { job: Job; onCancel: () => void }) {
  const stage = getJobStage(job);
  const isActive = ['queued', 'processing', 'rendering', 'uploading'].includes(job.status);
  const stageSteps = [
    { label: 'Fila', active: stage.progress >= 1 },
    { label: 'Preparação', active: stage.progress >= 25 },
    { label: 'Render', active: stage.progress >= 55 },
    { label: 'Storage', active: stage.progress >= 85 },
  ];

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
          <p className="mt-1 text-xs font-medium text-primary">{stage.label}</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{stage.detail}</p>
        </div>
        <JobStatusBadge status={job.status} />
      </div>
      <Progress value={stage.progress} className="mt-3" />
      <div className="mt-3 grid grid-cols-4 gap-1">
        {stageSteps.map((step) => (
          <div key={step.label} className={cn('rounded-full px-2 py-1 text-center text-[9px] font-semibold', step.active ? 'bg-primary/15 text-primary' : 'bg-background text-muted-foreground')}>
            {step.label}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {job.status === 'failed' && <Button size="sm" variant="outline" className="h-8 gap-1"><RefreshCw className="h-3.5 w-3.5" /> Repetir</Button>}
        {isActive && <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>Cancelar</Button>}
      </div>
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
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const shortId = String(asset.id || '').slice(0, 10) || 'sem_id';
  const preview = asset.thumbnail_url || asset.url;
  const qualityTone =
    score >= 80
      ? 'border-success/20 bg-success/10 text-success'
      : score >= 50
        ? 'border-warning/20 bg-warning/10 text-warning'
        : 'border-destructive/20 bg-destructive/10 text-destructive';
  const qualityLabel = score >= 80 ? 'Alta qualidade' : score >= 50 ? 'Boa para revisar' : 'Baixa qualidade';
  const reviewMessage =
    score < 50
      ? 'Revisar antes de publicar - qualidade baixa detectada'
      : score < 80
        ? 'Bom para testes - revise roteiro e CTA antes do disparo'
        : 'Pronto para divulgação - ativo com boa qualidade';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[94dvh] !w-[calc(100vw-0.75rem)] !max-w-none flex-col overflow-hidden rounded-t-[1.5rem] border-border bg-card p-0 text-foreground shadow-2xl sm:!h-[90dvh] sm:!w-[calc(100vw-2rem)] sm:rounded-[1.5rem] lg:!h-[min(88dvh,860px)] lg:!w-[min(92vw,1280px)] xl:!h-[min(86dvh,900px)] xl:!w-[min(88vw,1380px)]">
        <DialogHeader className="shrink-0 border-b border-border bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))] px-4 py-3 pr-10 sm:px-6 sm:py-4 sm:pr-12">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20 sm:h-11 sm:w-11">
              <Film className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="line-clamp-2 font-syne text-base font-bold leading-tight text-foreground sm:line-clamp-1 sm:text-lg">
                {asset.title || 'Detalhes do vídeo gerado'}
              </DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {asset.product_name || 'Sem anúncio vinculado'}
              </DialogDescription>
            </div>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              <StatusBadge status={asset.status} />
              <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold', qualityTone)}>{qualityLabel} · {normalizedScore}%</span>
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">IA</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(560px,1.2fr)_minmax(480px,0.8fr)] lg:overflow-hidden">
          <section className="flex min-h-[52dvh] flex-col items-center gap-3 border-b border-border bg-muted/35 p-3 sm:min-h-[620px] sm:gap-4 sm:p-5 md:p-6 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="relative flex min-h-[320px] w-full max-w-[720px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-xl shadow-black/10 sm:rounded-3xl lg:min-h-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,hsl(var(--primary)/0.12),transparent_38%)]" />
              {asset.url ? (
                <video src={asset.url} poster={asset.thumbnail_url} controls className="relative h-full w-full bg-black object-contain" />
              ) : preview ? (
                <img src={preview} alt={asset.title || ''} className="relative h-full w-full object-cover" />
              ) : (
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted">
                  <Play className="ml-0.5 h-5 w-5 fill-muted-foreground/25 text-muted-foreground/25" />
                </div>
              )}
            </div>
            <div className="flex w-full max-w-[720px] shrink-0 items-center justify-between gap-3 px-1">
              <span className="font-syne text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {preview ? 'Prévia do vídeo' : 'Prévia indisponível'}
              </span>
              <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                {asset.duration ? `${asset.duration}` : 'Vídeo'}
              </span>
            </div>
            <div className={cn('w-full max-w-[720px] shrink-0 rounded-2xl border p-3', qualityTone)}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold">Qualidade</span>
                <span className="font-syne text-xs font-bold text-foreground">{normalizedScore}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background/70">
                <div className={cn('h-full rounded-full transition-all', score >= 80 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-gradient-to-r from-destructive to-primary')} style={{ width: `${normalizedScore}%` }} />
              </div>
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:overflow-hidden">
            <div className={cn('shrink-0 rounded-2xl border p-4 sm:rounded-3xl', qualityTone)}>
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Qualidade do vídeo</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{qualityLabel}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{reviewMessage}</p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background/80 font-syne text-lg font-bold text-foreground shadow-sm sm:h-16 sm:w-16 sm:text-xl">
                  {normalizedScore}%
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <QualityLine label="Qualidade visual" value={score} />
                <QualityLine label="Clareza da oferta" value={Math.min(score + 4, 100)} />
                <QualityLine label="Força do CTA" value={Math.min(score + 6, 100)} />
                <QualityLine label="Adequação à plataforma" value={Math.min(score + 2, 100)} />
                <QualityLine label="Risco de parecer spam" value={Math.max(100 - score, 8)} invert />
              </div>
            </div>

            <div className="shrink-0">
              <p className="mb-3 font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Metadados</p>
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3">
                <PreviewMetaBox label="Tipo" value={asset.type?.replace('_', ' ') || 'generated video'} />
                <PreviewMetaBox label="Origem" value={asset.source || 'Não informada'} />
                <PreviewMetaBox label="Duração" value={asset.duration ? String(asset.duration) : 'Não informada'} muted={!asset.duration} />
                <PreviewMetaBox label="Arquivo" value={asset.file_size ? `${Math.round(asset.file_size / 1024)} KB` : 'Não informado'} muted={!asset.file_size} />
              </div>
            </div>

            <div className="shrink-0">
              <p className="mb-3 font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Ações</p>
              <div className="grid gap-2 min-[420px]:grid-cols-2 sm:gap-3">
                <Button className="h-12 gap-2 rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-primary-foreground shadow-lg shadow-primary/20" onClick={() => asset.url && window.open(asset.url, '_blank')}>
                  <Play className="h-3.5 w-3.5" /> Abrir vídeo
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => onStatus(asset, 'approved', 'Vídeo aprovado')}>
                  <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => onStatus(asset, 'rejected', 'Vídeo rejeitado')}>
                  <XCircle className="h-3.5 w-3.5" /> Rejeitar
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => onStatus(asset, 'generating', 'Variação enviada para geração')}>
                  <RefreshCw className="h-3.5 w-3.5" /> Criar variação
                </Button>
                <Button variant="outline" className="h-12 gap-2 rounded-2xl bg-card" onClick={() => navigator.clipboard?.writeText(asset.url || '')}>
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </Button>
                <Button className="h-12 gap-2 rounded-2xl" onClick={() => onStatus(asset, 'scheduled', 'Vídeo enviado para agendamento')}>
                  <Clock className="h-3.5 w-3.5" /> Agendar publicação
                </Button>
              </div>
            </div>

            <div className="min-h-[150px] rounded-2xl border border-border bg-muted/25 p-4 sm:min-h-[170px] sm:rounded-3xl lg:flex-1">
              <p className="font-syne text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Roteiro e legenda</p>
              <p className="mt-2 line-clamp-7 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {asset.caption || 'Sem roteiro salvo.'}
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

function PreviewMetaBox({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/25 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-muted/40">
      <p className="font-syne text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 line-clamp-1 font-syne text-xs font-semibold', muted ? 'text-muted-foreground' : 'text-foreground')}>{value}</p>
    </div>
  );
}
