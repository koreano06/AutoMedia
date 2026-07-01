import { describe, expect, it } from 'vitest';
import type { MediaAsset, Product } from '@/types/entities';
import { createVideoImagePrompt, createVideoScriptPrompt, type VideoPromptContext } from './prompts';

const product = {
  id: 'product_1',
  name: 'Mini Projetor Portátil HD',
  description: 'Projetor compacto com controle remoto para assistir filmes em casa.',
  category: 'Eletrônicos',
} as Product;

const media = [{
  id: 'media_1',
  product_id: 'product_1',
  title: 'Close do projetor com controle',
  type: 'image',
  url: 'https://example.com/projector.jpg',
} as MediaAsset];

const context: VideoPromptContext = {
  product,
  template: {
    label: 'Unboxing',
    visual: 'UGC premium',
    motion: 'Cortes rápidos + close',
    prompt: 'mãos abrindo embalagem e demonstrando o produto',
  },
  format: { label: 'Reels', ratio: '9:16' },
  duration: '20s',
  rhythm: 'Cortes dinâmicos',
  audio: 'Música leve',
  platform: 'instagram',
  selectedMedia: media,
  visualPrompt: 'ambiente realista de sala, luz suave e produto fiel às fotos',
  briefing: {
    targetAudience: 'pessoas que querem cinema em casa',
    tone: 'natural e consultivo',
    objective: 'gerar pedidos de link',
    promise: 'transformar qualquer parede em uma tela',
    cta: 'Comente EU QUERO para receber o link',
    restrictions: 'não inventar resolução ou preço',
    extra: 'mostrar controle remoto e projeção na parede',
  },
};

describe('video generation prompts', () => {
  it('keeps mandatory creative and fidelity rules in the script prompt', () => {
    const prompt = createVideoScriptPrompt(context, true);

    expect(prompt).toContain('Mini Projetor Portátil HD');
    expect(prompt).toContain('formato vertical 9:16');
    expect(prompt).toContain('Fidelidade máxima ao produto');
    expect(prompt).toContain('Close do projetor com controle');
    expect(prompt).toContain('Roteiro estruturado por cenas');
  });

  it('uses visual context in the image prompt', () => {
    const prompt = createVideoImagePrompt(context);

    expect(prompt).toContain('Mini Projetor Portátil HD');
    expect(prompt).toContain('UGC premium');
    expect(prompt).toContain('ambiente realista de sala');
    expect(prompt).toContain('sem marcas d');
  });
});
