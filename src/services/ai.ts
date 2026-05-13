import { base44 } from '@/api/base44Client';

export async function invokeLLM(prompt: string) {
  return base44.integrations.Core.InvokeLLM({ prompt }) as Promise<string>;
}
