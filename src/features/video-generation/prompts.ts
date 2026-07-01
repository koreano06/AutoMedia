import type { MediaAsset, Platform, Product } from '@/types/entities';
import type { Briefing } from './types';

type VideoTemplateContext = {
  label?: string;
  visual?: string;
  motion?: string;
  prompt?: string;
};

type VideoFormatContext = {
  label?: string;
  ratio?: string;
};

export type VideoPromptContext = {
  product: Product;
  template?: VideoTemplateContext;
  format?: VideoFormatContext;
  duration: string;
  rhythm: string;
  audio: string;
  platform: Platform;
  briefing: Briefing;
  selectedMedia: MediaAsset[];
  visualPrompt?: string;
};

export function createVideoScriptPrompt(context: VideoPromptContext, scriptOnly = false) {
  const {
    product,
    template,
    format,
    duration,
    rhythm,
    audio,
    platform,
    briefing,
    selectedMedia,
  } = context;

  return `
Você é um diretor criativo especialista em vídeos curtos de produto para afiliados, social commerce e anúncios UGC.
Crie ${scriptOnly ? 'um roteiro estruturado por cenas' : 'um roteiro final'} para transformar um anúncio pronto em vídeo de divulgação.
Anúncio/oferta base: ${product.name}
Texto/contexto do anúncio original: ${product.description || 'Sem descrição'}
Categoria/nicho: ${product.category || 'Não informada'}
Template: ${template?.label}
Direção visual do template: ${template?.visual} - ${template?.motion}
Guia criativo do template: ${template?.prompt}
Formato: ${format?.label} ${format?.ratio}
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
}

export function createVideoImagePrompt(context: VideoPromptContext) {
  const { product, format, platform, template, briefing, visualPrompt } = context;

  return `
Crie um criativo vertical profissional para anúncio em vídeo curto.
Anúncio/oferta base: ${product.name}
Categoria: ${product.category || 'campanha de afiliado/colaborador'}
Descrição do anúncio original: ${product.description || 'Sem descrição'}
Formato: ${format?.label} ${format?.ratio}
Plataforma: ${platform}
Template: ${template?.label}
Direção visual do template: ${template?.visual}
Movimento esperado: ${template?.motion}
Guia criativo: ${template?.prompt}
Promessa principal: ${briefing.promise || 'benefício claro da oferta'}
Tom visual: moderno, premium, alto contraste, luz de estúdio, composição limpa.
Instrução: gerar uma imagem comercial bonita para divulgação, com foco na oferta, fundo profissional, espaço para texto curto e sem marcas d'agua.
${visualPrompt ? `Direção visual adicional: ${visualPrompt}` : ''}
`;
}
