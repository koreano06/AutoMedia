import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SectionHeader from '@/components/common/SectionHeader';
import type { VideoScene } from './types';

type SceneEditorProps = {
  scenes: VideoScene[];
  onSceneChange: (id: string, patch: Partial<VideoScene>) => void;
  onAddScene: () => void;
  onRemoveScene: (id: string) => void;
  onSuggestScenes: () => void;
};

export default function SceneEditor({ scenes, onSceneChange, onAddScene, onRemoveScene, onSuggestScenes }: SceneEditorProps) {
  return (
    <>
      <SectionHeader
        icon={Sparkles}
        title="Editor de roteiro por cenas"
        subtitle="Monte cada cena com objetivo, ação, câmera 9:16, fidelidade ao produto e continuidade antes do render."
        action={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onSuggestScenes}>
              <Sparkles className="h-4 w-4" /> Sugerir cenas
            </Button>
            <Button type="button" size="sm" className="gap-2" onClick={onAddScene}>
              <Plus className="h-4 w-4" /> Adicionar cena
            </Button>
          </div>
        )}
      />

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {scenes.map((scene, index) => (
          <article key={scene.id} className="rounded-2xl border border-border bg-muted/25 p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-syne text-xs font-bold uppercase tracking-[0.14em] text-primary">Cena {index + 1}</p>
                <p className="mt-1 text-xs text-muted-foreground">Cena vertical 9:16 com começo, ação visual e conexão narrativa.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                disabled={scenes.length <= 1}
                onClick={() => onRemoveScene(scene.id)}
                aria-label={`Remover cena ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <SceneField label="Título da cena" value={scene.title} onChange={(value) => onSceneChange(scene.id, { title: value })} placeholder="Gancho, benefício, prova..." />
              <SceneField label="Tempo" value={scene.duration} onChange={(value) => onSceneChange(scene.id, { duration: value })} placeholder="0-3s" />
            </div>

            <SceneTextarea label="Objetivo da cena" value={scene.goal} onChange={(value) => onSceneChange(scene.id, { goal: value })} placeholder="Ex: parar o scroll, mostrar benefício, provar uso, preparar CTA..." />
            <SceneTextarea label="Texto na tela" value={scene.onScreenText} onChange={(value) => onSceneChange(scene.id, { onScreenText: value })} placeholder="Frase curta que aparecerá no vídeo" />
            <SceneTextarea label="Narração ou legenda" value={scene.narration} onChange={(value) => onSceneChange(scene.id, { narration: value })} placeholder="O que a IA/roteiro deve comunicar nesta cena" />
            <SceneTextarea label="Ação visual obrigatória" value={scene.visualAction} onChange={(value) => onSceneChange(scene.id, { visualAction: value })} placeholder="Ex: mão abrindo embalagem, close no controle, produto projetando imagem..." />
            <SceneTextarea label="Direção visual" value={scene.visualDirection} onChange={(value) => onSceneChange(scene.id, { visualDirection: value })} placeholder="Zoom, close, movimento, fundo, elementos visuais..." />

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <SceneTextarea label="Câmera e enquadramento 9:16" value={scene.cameraDirection} onChange={(value) => onSceneChange(scene.id, { cameraDirection: value })} placeholder="Produto central, texto em área segura, movimento vertical..." large />
              <SceneTextarea label="Uso das imagens de referência" value={scene.referenceUse} onChange={(value) => onSceneChange(scene.id, { referenceUse: value })} placeholder="Qual imagem usar: close, embalagem, detalhe, uso real..." large />
            </div>

            <SceneTextarea
              label="Fidelidade ao produto"
              value={scene.visualFidelity}
              onChange={(value) => onSceneChange(scene.id, { visualFidelity: value })}
              placeholder="Ex: manter exatamente a cor, formato, proporção, acessórios, embalagem, botões e textura vistos nas fotos do usuário."
              large
            />

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <SceneTextarea label="Transição para próxima cena" value={scene.transition} onChange={(value) => onSceneChange(scene.id, { transition: value })} placeholder="Como essa cena puxa a próxima sem parecer cortada..." large />
              <SceneTextarea label="Restrições da cena" value={scene.constraints} onChange={(value) => onSceneChange(scene.id, { constraints: value })} placeholder="O que a IA não deve inventar, exagerar ou mostrar..." large />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function SceneField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5" />
    </div>
  );
}

function SceneTextarea({ label, value, onChange, placeholder, large }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; large?: boolean }) {
  return (
    <div className="mt-3">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={large ? 'mt-1.5 h-24 resize-none' : 'mt-1.5 h-20 resize-none'}
        placeholder={placeholder}
      />
    </div>
  );
}
