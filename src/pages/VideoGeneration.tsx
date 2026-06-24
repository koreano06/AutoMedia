import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import StatusBadge from '@/components/common/StatusBadge';
import ErrorState from '@/components/common/ErrorState';
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
  Upload,
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
import { getJob, retryJob } from '@/services/jobs';
import { uploadProductImage } from '@/services/uploads';
import type { EntityId, Job, MediaAsset, Platform, Product, Status } from '@/types/entities';
import JobStatusPanel from '@/features/video-generation/JobStatusPanel';
import SceneEditor from '@/features/video-generation/SceneEditor';
import VideoPreviewModal from '@/features/video-generation/VideoPreviewModal';
import type { Briefing, VideoScene } from '@/features/video-generation/types';

const templates = [
  { id: 'product', label: 'Anúncio direto', desc: 'Gancho, benefício principal e CTA direto', visual: 'Studio clean', motion: 'Zoom suave + texto grande', accent: 'from-primary to-emerald-500', prompt: 'fundo limpo, foco no produto, tipografia grande, CTA direto' },
  { id: 'unboxing', label: 'Unboxing', desc: 'Abertura, detalhes e primeira impressão', visual: 'UGC premium', motion: 'Cortes rápidos + close', accent: 'from-amber-400 to-orange-500', prompt: 'mãos abrindo embalagem, detalhe do produto, sensação real de descoberta' },
  { id: 'before_after', label: 'Antes e depois', desc: 'Transformação visual e prova de valor', visual: 'Split screen', motion: 'Comparação + transição', accent: 'from-teal-400 to-emerald-500', prompt: 'comparação antes e depois, transformação visual clara, prova de valor' },
  { id: 'seller_review', label: 'Review vendedor', desc: 'Apresentador mostra o produto com prova visual', visual: 'Creator review', motion: 'Fala direta + close demonstrativo', accent: 'from-sky-400 to-blue-500', prompt: 'review vendedor, apresentador segurando produto, demonstração real, bullets visuais, detalhes do produto em cena' },
  { id: 'flash_offer', label: 'Oferta relâmpago', desc: 'Urgência, preço e chamada de compra', visual: 'Sale impact', motion: 'Pulsos + contador', accent: 'from-red-500 to-orange-500', prompt: 'oferta relâmpago, urgência visual, preço e CTA destacados sem parecer spam' },
  { id: 'demo', label: 'Demonstração', desc: 'Mostra a oferta em uso ou contexto real', visual: 'Hands-on demo', motion: 'Passo a passo curto', accent: 'from-lime-400 to-emerald-500', prompt: 'produto em uso, demonstração clara, contexto cotidiano e benefício prático' },
  { id: 'marketplace', label: 'Marketplace', desc: 'Vídeo de oferta para Shopee, Mercado Livre e social commerce', visual: 'Produto + benefícios + confiança', motion: 'Cards de benefício + CTA de link', accent: 'from-yellow-400 to-primary', prompt: 'visual de marketplace, produto em destaque, benefícios claros, confiança, entrega, preço e CTA para link sem poluição visual' },
] as const;

const formats = [
  { id: 'reels', label: 'Reels', ratio: '9:16' },
  { id: 'tiktok', label: 'TikTok', ratio: '9:16' },
  { id: 'shorts', label: 'Shorts', ratio: '9:16' },
  { id: 'feed', label: 'Feed', ratio: '1:1' },
  { id: 'youtube', label: 'YouTube', ratio: '16:9' },
  { id: 'story', label: 'Story', ratio: '9:16' },
] as const;

const durations = ['15s', '20s', '30s', '60s'] as const;
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
    goal: 'Parar o scroll nos primeiros segundos e deixar claro qual produto será demonstrado.',
    onScreenText: `${productName}: veja antes de comprar`,
    narration: currentBriefing.promise || `Olha esse ${productName} em uma demonstração rápida e direta.`,
    visualAction: 'Mostrar o produto inteiro por 0,5s e entrar em close no detalhe mais reconhecível, sem cortes confusos.',
    visualDirection: 'Produto centralizado, fundo limpo, contraste alto, visual de demonstração real e não apenas foto estática.',
    cameraDirection: 'Vídeo vertical 9:16. Produto no centro, margem segura para texto no topo e CTA no rodapé. Movimento de push-in suave.',
    referenceUse: 'Usar a melhor imagem real do produto como referência obrigatória. O vídeo precisa ser extremamente fiel ao formato, cor, proporções, textura, detalhes e acessórios visíveis do produto enviado pelo usuário.',
    visualFidelity: 'Preservar exatamente o produto das imagens: mesma cor, formato, lente/tela/controle/acessório, textura, proporção e identidade visual. Se algo não estiver claro nas fotos, não inventar.',
    transition: 'Terminar com movimento aproximando do detalhe que será explicado na próxima cena.',
    constraints: 'Não inventar funções que não apareçam no anúncio. Não alterar aparência, cor, formato, logo, embalagem ou acessórios do produto das imagens. Evitar promessa absoluta e texto muito longo.',
  },
  {
    id: createSceneId(),
    title: 'Benefício principal',
    duration: '3-8s',
    goal: 'Transformar a atenção inicial em interesse, mostrando o benefício mais vendável do produto.',
    onScreenText: currentBriefing.promise || 'Benefício principal em uso real',
    narration: `Mostre de forma simples por que esse ${productName} resolve uma necessidade prática do comprador.`,
    visualAction: 'Demonstrar o produto em uso ou simular o uso com mãos, mesa, ambiente real e detalhe do recurso principal.',
    visualDirection: 'Cortes curtos, zoom/pan no produto, foco no antes/depois do benefício e ritmo de review vendedor.',
    cameraDirection: 'Manter composição 9:16 com produto ocupando 60% da tela. Texto curto em área livre, sem cobrir detalhes importantes.',
    referenceUse: 'Se houver várias imagens, usar close, embalagem, acessório ou controle como apoio visual fiel. Cada detalhe mostrado deve bater com as fotos do usuário ou com o pedido feito na plataforma.',
    visualFidelity: 'Demonstrar o mesmo produto enviado, sem trocar por versão genérica. A ação pode ser encenada, mas o objeto precisa manter aparência e acessórios iguais às imagens.',
    transition: 'Conectar com a prova: depois do benefício, mostrar evidência visual ou contexto que dá confiança.',
    constraints: 'Não usar frases genéricas como “produto incrível” sem mostrar o motivo visualmente. Não criar uma versão diferente do produto; preservar design, escala, materiais e acessórios das imagens.',
  },
  {
    id: createSceneId(),
    title: 'Prova e contexto',
    duration: '8-12s',
    goal: 'Dar confiança ao comprador mostrando contexto real, detalhe físico e utilidade concreta.',
    onScreenText: 'Detalhes que fazem diferença',
    narration: 'Reforce o uso no dia a dia com uma prova visual simples, natural e sem exageros.',
    visualAction: 'Mostrar textura, tamanho, acessório, tela, encaixe ou resultado final. Se for unboxing, incluir embalagem e item fora da caixa.',
    visualDirection: 'Cena de demonstração com luz natural/premium, fundo organizado e destaque para mãos interagindo com o produto.',
    cameraDirection: 'Alternar close vertical e plano médio. Manter o produto nítido e o fundo levemente desfocado.',
    referenceUse: 'Usar imagens secundárias para manter continuidade fiel: acessório, controle, embalagem, tela projetada ou detalhe de acabamento. Tudo que aparecer precisa parecer o mesmo produto das fotos.',
    visualFidelity: 'Detalhes físicos, embalagem, acabamento, botões, tela, controle e acessórios precisam permanecer coerentes com as imagens reais do usuário.',
    transition: 'Finalizar com o produto pronto para uso, preparando a chamada de ação final.',
    constraints: 'Evitar aparência de propaganda exagerada. A cena precisa parecer uma demonstração honesta e fiel ao produto real enviado pelo usuário.',
  },
  {
    id: createSceneId(),
    title: 'CTA final',
    duration: '12-15s',
    onScreenText: currentBriefing.cta || 'Comente "eu quero"',
    narration: currentBriefing.cta || 'Comente eu quero para receber o link.',
    goal: 'Encerrar com ação clara e fácil, mantendo o produto visível até o último segundo.',
    visualAction: 'Mostrar produto em composição final bonita, com benefício resumido e CTA destacado.',
    visualDirection: 'Tela final limpa, produto em destaque, CTA grande, contraste alto e sensação de anúncio pronto para Reels/TikTok/Shorts.',
    cameraDirection: 'Formato 9:16 com CTA no terço inferior, produto central e espaço superior para frase curta. Sem elementos cortados.',
    referenceUse: 'Usar imagem mais bonita do produto como hero shot final, mantendo aparência extremamente fiel ao produto original enviado pelo usuário.',
    visualFidelity: 'Hero shot final deve mostrar o mesmo produto do anúncio, sem alterar modelo, cor, escala, proporções, marca aparente ou acessórios.',
    transition: 'Encerrar com leve zoom out ou brilho sutil no CTA, sem cortar abruptamente.',
    constraints: 'Não colocar excesso de texto. Manter CTA único e direto. Não mudar o produto para um modelo genérico ou visual diferente das imagens de referência.',
  },
];

const getAssetPreview = (asset: MediaAsset) => asset.thumbnail_url || asset.url;
const getVideoScore = (asset: MediaAsset) => Number(asset.quality_score ?? (asset.status === 'approved' ? 88 : asset.status === 'rejected' ? 38 : 72));
const getDurationSeconds = (value: string) => Number.parseInt(value, 10) || 15;
const estimateSegmentCount = (value: string) => Math.max(1, Math.ceil(getDurationSeconds(value) / 10));
const estimateVideoCost = (value: string) => {
  const segments = estimateSegmentCount(value);
  const costPerSegment = 0.08;
  return {
    segments,
    seconds: getDurationSeconds(value),
    estimatedCost: Number((segments * costPerSegment).toFixed(4)),
    costPerSegment,
  };
};
const getFriendlyError = (error: unknown, fallback = 'Não foi possível concluir a ação agora.') => {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;
  const lower = raw.toLowerCase();
  if (lower.includes('429') || lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'A IA recebeu muitos pedidos em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }
  if (lower.includes('401') || lower.includes('unauthorized') || lower.includes('auth')) {
    return 'A autenticação falhou. Faça login novamente ou revise a chave/API configurada.';
  }
  if (
    lower.includes('imagem inicial precisa estar em uma url pública') ||
    lower.includes('url pública') ||
    lower.includes('start_image_not_public') ||
    lower.includes('192.168.') ||
    lower.includes('localhost')
  ) {
    return 'A IA de vídeo não consegue acessar imagens locais da VM. Use uma imagem com URL pública ou publique o storage/túnel antes de gerar com Kling.';
  }
  if (lower.includes('provider') || lower.includes('replicate') || lower.includes('kling')) {
    return 'O provedor de vídeo não conseguiu concluir a geração. Tente novamente ou use o fallback FFmpeg.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'A conexão com o backend falhou. Verifique a rede e tente outra vez.';
  }
  if (lower.includes('storage') || lower.includes('s3') || lower.includes('minio')) {
    return 'O vídeo foi gerado, mas houve problema ao salvar no storage. Confira MinIO/S3.';
  }
  return raw || fallback;
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
  const [uploadingReferences, setUploadingReferences] = useState(false);
  const [scriptPreview, setScriptPreview] = useState('');
  const [scenes, setScenes] = useState<VideoScene[]>(createDefaultScenes());
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingVisual, setGeneratingVisual] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState<Job[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [activeVideo, setActiveVideo] = useState<MediaAsset | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);

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
  const failedJobs = queue.filter((job) => job.status === 'failed' || job.error_message);

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
  const stageCardClass = (step: number) =>
    cn('rounded-2xl border border-border bg-card p-4 transition-all sm:p-5', step > 0 && 'shadow-sm shadow-black/[0.02]');

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
        goal: '',
        onScreenText: '',
        narration: '',
        visualAction: '',
        visualDirection: '',
        cameraDirection: 'Vídeo vertical 9:16, produto centralizado, texto em área segura e sem cortar detalhes importantes.',
        referenceUse: '',
        visualFidelity: 'Manter o produto extremamente fiel às imagens do usuário: mesma aparência, cor, proporção, textura, acessórios e detalhes físicos.',
        transition: '',
        constraints: 'Não inventar características do produto. Manter linguagem natural e comercial.',
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
    const filledScenes = scenes.filter((scene) => scene.title || scene.onScreenText || scene.narration || scene.visualDirection || scene.goal || scene.visualAction || scene.visualFidelity);
    if (filledScenes.length === 0) return scriptPreview;

    const sceneText = filledScenes
      .map((scene, index) => [
        `Cena ${index + 1}: ${scene.title || 'Sem título'}`,
        scene.duration ? `Tempo: ${scene.duration}` : '',
        scene.goal ? `Objetivo da cena: ${scene.goal}` : '',
        scene.onScreenText ? `Texto na tela: ${scene.onScreenText}` : '',
        scene.narration ? `Narração/legenda: ${scene.narration}` : '',
        scene.visualAction ? `Ação visual obrigatória: ${scene.visualAction}` : '',
        scene.visualDirection ? `Direção visual: ${scene.visualDirection}` : '',
        scene.cameraDirection ? `Câmera e enquadramento 9:16: ${scene.cameraDirection}` : '',
        scene.referenceUse ? `Uso das imagens de referência: ${scene.referenceUse}` : '',
        scene.visualFidelity ? `Fidelidade ao produto: ${scene.visualFidelity}` : '',
        scene.transition ? `Transição/conexão com a próxima cena: ${scene.transition}` : '',
        scene.constraints ? `Restrições da cena: ${scene.constraints}` : '',
      ].filter(Boolean).join('\n'))
      .join('\n\n');

    return [
      baseScript ? `Roteiro IA/base:\n${baseScript}` : '',
      [
        'Instruções técnicas obrigatórias para o vídeo:',
        `- Formato final: ${selectedFormatConfig?.ratio || '9:16'} vertical, otimizado para Reels, TikTok e Shorts.`,
        '- Manter continuidade visual entre cenas, como se fosse uma demonstração de produto com começo, meio e CTA.',
        '- Usar as imagens reais selecionadas como referência de aparência, cor, proporção e acessórios do produto.',
        '- Fidelidade visual obrigatória: o produto gerado deve ser extremamente fiel às fotos enviadas pelo usuário ou ao pedido feito na plataforma. Não trocar modelo, cor, formato, textura, escala, embalagem, controle, tela, logo aparente ou acessórios.',
        '- Não inventar funções, marcas, preço, descontos ou resultados que não estejam no anúncio/briefing.',
        '- Texto na tela deve ser curto, grande, legível no celular e dentro da área segura vertical.',
      ].join('\n'),
      `Roteiro estruturado por cenas:\n${sceneText}`,
      `CTA final: ${briefing.cta}`,
      `Observações: ${briefing.restrictions || 'Evitar promessas exageradas e manter linguagem natural.'}`,
    ].filter(Boolean).join('\n\n');
  };
  const filledSceneCount = scenes.filter((scene) => scene.title && scene.goal && scene.onScreenText && scene.narration && scene.visualAction && scene.visualFidelity).length;
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
  const costPreview = estimateVideoCost(duration);

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
Você é um diretor criativo especialista em vídeos curtos de produto para afiliados, social commerce e anúncios UGC.
Crie ${scriptOnly ? 'um roteiro estruturado por cenas' : 'um roteiro final'} para transformar um anúncio pronto em vídeo de divulgação.
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

Regras de qualidade:
- O vídeo deve ser pensado para formato vertical 9:16, com texto legível em celular e área segura.
- O roteiro precisa ter começo, meio e fim: gancho, demonstração, prova/contexto e CTA.
- Cada cena precisa explicar o que aparece, o que acontece, como a câmera se move e como conecta com a próxima.
- Fidelidade máxima ao produto: toda cena deve respeitar rigorosamente as imagens enviadas pelo usuário e o pedido feito na plataforma. O vídeo não pode transformar o produto em outro modelo, mudar cor, proporção, textura, embalagem, controle/acessório, tela, logo aparente ou detalhes físicos.
- Quando houver dúvida visual, preferir uma cena mais simples e fiel ao produto real em vez de inventar elementos.
- Não invente preço, desconto, marca, garantia, recursos técnicos ou resultados que não estejam no anúncio.
- Evite frases genéricas. Mostre benefício por ação visual concreta.
- Linguagem natural de vendedor/apresentador, sem promessa exagerada e sem cara de spam.

Responda em português neste formato exato:

Resumo criativo:
- Ideia central:
- Público:
- Promessa principal:
- CTA:

Roteiro estruturado por cenas:
Cena 1: [título curto]
Tempo: [ex: 0-3s]
Objetivo da cena: [por que essa cena existe]
Texto na tela: [frase curta e grande]
Narração/legenda: [fala natural]
Ação visual obrigatória: [o que deve acontecer na imagem/vídeo]
Direção visual: [luz, fundo, ritmo, estética]
Câmera e enquadramento 9:16: [posição do produto, margem segura, movimento]
Uso das imagens de referência: [qual tipo de imagem usar e como]
Fidelidade ao produto: [quais detalhes das fotos do usuário precisam permanecer idênticos nesta cena]
Transição/conexão com a próxima cena: [como uma cena puxa a outra]
Restrições da cena: [o que não fazer]

Repita para 4 a 6 cenas, conforme a duração ${duration}. Depois finalize com:

Legenda para publicação:
CTA final:
Observação anti-spam/naturalidade:
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
        setSelectedMediaIds((current) => current.includes(result.asset!.id) ? current : [result.asset!.id, ...current]);
      } else {
        const fallbackAsset = {
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
        };
        setGeneratedVisual(fallbackAsset);
        setSelectedMediaIds((current) => current.includes(fallbackAsset.id) ? current : [fallbackAsset.id, ...current]);
      }

      toast.success(result.provider === 'openai' ? 'Imagem gerada pela API de IA' : 'Imagem fallback gerada para teste');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a imagem com IA real');
    } finally {
      setGeneratingVisual(false);
    }
  };

  const handleReferenceUpload = async (files: FileList | null) => {
    if (!product) {
      toast.error('Selecione um anúncio base antes de enviar imagens.');
      return;
    }

    const images = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    if (!images.length) return;

    setUploadingReferences(true);
    try {
      const uploaded = await Promise.all(images.map((file) => uploadProductImage(file, product.id)));
      const assets = uploaded.map((item) => item.asset).filter(Boolean) as MediaAsset[];
      setMediaAssets((current) => [...assets, ...current]);
      setSelectedMediaIds((current) => Array.from(new Set([...assets.map((asset) => asset.id), ...current])));
      toast.success(`${assets.length} imagem(ns) enviada(s) e selecionada(s) para o vídeo`);
    } catch {
      toast.error('Não foi possível enviar todas as imagens agora.');
    } finally {
      setUploadingReferences(false);
    }
  };

  const upsertQueue = (job: Job) => setQueue((current) => [job, ...current]);
  const updateQueue = (id: EntityId, patch: Partial<Job>) =>
    setQueue((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));

  const requestGenerate = () => {
    if (!product) {
      toast.error('Selecione um anúncio base');
      return;
    }

    if (readiness < 80) {
      toast.error('Complete o checklist antes de gerar o vídeo.');
      return;
    }

    setShowPreflight(true);
  };

  const handleGenerate = async () => {
    if (!product) return;
    setShowPreflight(false);
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
    } catch (error) {
      const friendly = getFriendlyError(error, 'Falha ao gerar vídeo');
      updateQueue(jobId, { status: 'failed', progress: 100, error_message: friendly });
      toast.error(friendly);
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
    } catch (error) {
      toast.error(getFriendlyError(error, 'Não foi possível atualizar o vídeo'));
    }
  };

  const handleRetryJob = async (job: Job) => {
    try {
      const retried = await retryJob(job.id);
      updateQueue(job.id, retried);
      toast.success('Job reenviado para a fila de renderização');
    } catch (error) {
      toast.error(getFriendlyError(error, 'Não foi possível repetir o job agora'));
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

        {error && <ErrorState onRetry={load} />}

        {queue.length > 0 && (
          <JobStatusPanel jobs={queue} onRetry={handleRetryJob} />
        )}

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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle icon={Layers3} title="Mídias para composição" subtitle="Suba ou escolha imagens reais para orientar cada cena do vídeo" />
                <label className={cn('inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted', (!product || uploadingReferences) && 'pointer-events-none opacity-60')}>
                  <Upload className="h-4 w-4" />
                  {uploadingReferences ? 'Enviando...' : 'Subir imagens'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    disabled={!product || uploadingReferences}
                    onChange={(event) => {
                      handleReferenceUpload(event.target.files);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                As imagens selecionadas abaixo são enviadas ao backend como referências. O worker tenta distribuir essas imagens entre as cenas e manter consistência visual na geração.
              </div>
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
              <Button className="mt-4 w-full gap-2" onClick={requestGenerate} disabled={generating || !product}>
                <Rocket className="h-4 w-4" />
                {generating ? 'Gerando vídeo...' : 'Revisar custo e gerar'}
              </Button>
            </section>

            {failedJobs.length > 0 && (
              <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:p-5">
                <SectionTitle icon={AlertTriangle} title="Central de erros amigável" subtitle="O que falhou, em linguagem simples, e qual ação tomar" />
                <div className="mt-4 space-y-2">
                  {failedJobs.slice(0, 4).map((job) => (
                    <FriendlyErrorCard key={job.id} job={job} onRetry={() => handleRetryJob(job)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <section className={stageCardClass(3)}>
          <SceneEditor
            scenes={scenes}
            onSceneChange={updateScene}
            onAddScene={addScene}
            onRemoveScene={removeScene}
            onSuggestScenes={resetScenesFromBriefing}
          />
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

      <PreflightDialog
        open={showPreflight}
        onOpenChange={setShowPreflight}
        productName={product?.name || 'Produto não selecionado'}
        template={selectedTemplateConfig?.label || selectedTemplate}
        platform={platform}
        duration={duration}
        format={selectedFormatConfig?.ratio || '9:16'}
        scenes={scenes}
        readiness={readiness}
        costPreview={costPreview}
        mediaCount={selectedMedia.length + (generatedVisual ? 1 : 0)}
        onConfirm={handleGenerate}
        generating={generating}
      />
      <VideoPreviewModal asset={activeVideo} open={Boolean(activeVideo)} onOpenChange={(open) => !open && setActiveVideo(null)} onStatus={handleVideoStatus} />
    </div>
  );
}

function PreflightDialog({
  open,
  onOpenChange,
  productName,
  template,
  platform,
  duration,
  format,
  scenes,
  readiness,
  costPreview,
  mediaCount,
  onConfirm,
  generating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  template: string;
  platform: Platform;
  duration: string;
  format: string;
  scenes: VideoScene[];
  readiness: number;
  costPreview: ReturnType<typeof estimateVideoCost>;
  mediaCount: number;
  onConfirm: () => void;
  generating: boolean;
}) {
  const visibleScenes = scenes.filter((scene) => scene.title || scene.onScreenText || scene.narration || scene.visualDirection || scene.goal || scene.visualAction || scene.visualFidelity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[94dvh] !w-[calc(100vw-0.75rem)] !max-w-none flex-col overflow-hidden rounded-[1.5rem] border-border bg-card p-0 shadow-2xl sm:!h-[92dvh] sm:!w-[calc(100vw-2rem)] lg:!h-[min(90dvh,900px)] lg:!w-[min(94vw,1320px)] xl:!w-[min(90vw,1460px)]">
        <DialogHeader className="shrink-0 border-b border-border bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.22),transparent_36%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.28))] px-5 py-5 sm:px-7 lg:px-8">
          <DialogTitle className="font-syne text-xl sm:text-2xl">Revisar antes de gastar crédito</DialogTitle>
          <DialogDescription className="max-w-3xl text-sm leading-6">
            Confira roteiro, cenas e custo estimado antes de enviar para IA/render.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PreflightMetric label="Produto" value={productName} />
            <PreflightMetric label="Template" value={template} />
            <PreflightMetric label="Formato" value={`${platform} · ${format}`} />
            <PreflightMetric label="Prontidão" value={`${readiness}%`} tone={readiness >= 80 ? 'success' : 'warning'} />
          </div>

          <div className="mt-5 grid min-h-[520px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-h-0 flex-col rounded-3xl border border-border bg-muted/20 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-syne text-base font-bold text-foreground">Plano de cenas</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Cada bloco será usado para orientar a IA e o render com fidelidade às imagens do produto.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {visibleScenes.length} cena(s)
                </span>
              </div>
              <div className="grid gap-3 overflow-visible lg:grid-cols-2 xl:max-h-[58vh] xl:overflow-y-auto xl:pr-2">
                {visibleScenes.map((scene, index) => (
                  <div key={scene.id} className="rounded-2xl border border-border bg-background/75 p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="line-clamp-1 font-syne text-sm font-bold text-foreground">Cena {index + 1}: {scene.title || 'Sem título'}</p>
                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{scene.duration || 'sem tempo'}</span>
                    </div>
                    {scene.goal && (
                      <p className="mb-1 text-xs leading-5 text-muted-foreground">
                        <span className="font-semibold text-foreground">Objetivo:</span> {scene.goal}
                      </p>
                    )}
                    <p className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Tela:</span> {scene.onScreenText || 'Sem texto definido'}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Narração:</span> {scene.narration || 'Sem narração definida'}</p>
                    {(scene.visualAction || scene.cameraDirection || scene.transition) && (
                      <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-muted/25 p-3">
                        {scene.visualAction && <p className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Ação:</span> {scene.visualAction}</p>}
                        {scene.cameraDirection && <p className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">9:16:</span> {scene.cameraDirection}</p>}
                        {scene.visualFidelity && <p className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Fidelidade:</span> {scene.visualFidelity}</p>}
                        {scene.transition && <p className="text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Transição:</span> {scene.transition}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 xl:sticky xl:top-0 xl:self-start">
              <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5">
                <p className="font-syne text-xs font-bold uppercase tracking-[0.14em] text-primary">Estimativa</p>
                <p className="mt-4 font-syne text-4xl font-bold text-foreground">US$ {costPreview.estimatedCost.toFixed(4)}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {costPreview.segments} segmento(s) de IA · {costPreview.seconds}s · aprox. US$ {costPreview.costPerSegment.toFixed(2)} por segmento.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-muted/25 p-5">
                <p className="font-syne text-sm font-bold text-foreground">Checklist rápido</p>
                <div className="mt-3 space-y-2">
                  <MiniCheck ok={readiness >= 80} label="Anúncio pronto para render" />
                  <MiniCheck ok={mediaCount > 0} label={`${mediaCount} imagem(ns) de referência`} />
                  <MiniCheck ok={visibleScenes.length >= 3} label="Cenas suficientes para narrativa" />
                  <MiniCheck ok={duration !== '60s' || costPreview.segments >= 2} label={`Duração definida: ${duration}`} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7 lg:px-8">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar e ajustar</Button>
            <Button className="gap-2" onClick={onConfirm} disabled={generating}>
              <Rocket className="h-4 w-4" />
              {generating ? 'Enviando...' : 'Confirmar e gerar vídeo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreflightMetric({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' }) {
  return (
    <div className={cn('min-w-0 rounded-2xl border border-border bg-muted/25 p-3', tone === 'success' && 'border-success/20 bg-success/10', tone === 'warning' && 'border-warning/20 bg-warning/10')}>
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-syne text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function MiniCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {ok ? <CheckCircle className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
      <span>{label}</span>
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-syne text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function FriendlyErrorCard({ job, onRetry }: { job: Job; onRetry: () => void }) {
  const message = getFriendlyError(job.error_message, 'Falha não identificada no job.');
  const action = message.includes('muitos pedidos')
    ? 'Aguarde alguns minutos antes de tentar novamente.'
    : message.includes('autenticação') || message.includes('chave')
      ? 'Revise login, token ou chave configurada no backend.'
      : message.includes('storage')
        ? 'Confira MinIO/S3 e rode o diagnóstico de storage.'
        : 'Tente novamente; se repetir, use fallback FFmpeg ou revise as imagens.';

  return (
    <div className="rounded-2xl border border-destructive/15 bg-background/70 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{job.title || 'Job de vídeo'}</p>
          <p className="mt-1 text-xs leading-5 text-destructive">{message}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground"><span className="font-semibold text-foreground">Ação recomendada:</span> {action}</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 shrink-0 gap-1" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
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
