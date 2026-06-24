import { CheckCircle, Images, Link2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type UploadMode = 'local' | 'url';

export type UploadForm = {
  title: string;
  product_name: string;
  url: string;
  thumbnail_url: string;
  caption: string;
};

type MediaImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadMode: UploadMode;
  onUploadModeChange: (mode: UploadMode) => void;
  uploadForm: UploadForm;
  onUploadFormChange: (form: UploadForm) => void;
  uploadFile: File | null;
  onUploadFileChange: (file: File | null) => void;
  uploadPreview: string | null;
  savingUpload: boolean;
  onSave: () => void;
};

export default function MediaImportModal({
  open,
  onOpenChange,
  uploadMode,
  onUploadModeChange,
  uploadForm,
  onUploadFormChange,
  uploadFile,
  onUploadFileChange,
  uploadPreview,
  savingUpload,
  onSave,
}: MediaImportModalProps) {
  const previewUrl = uploadMode === 'local' ? uploadPreview : uploadForm.thumbnail_url || uploadForm.url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex !h-[94dvh] !w-[calc(100vw-0.75rem)] !max-w-none flex-col overflow-hidden rounded-t-[1.5rem] border-border bg-card p-0 text-foreground shadow-2xl sm:!h-[90dvh] sm:!w-[calc(100vw-2rem)] sm:rounded-[1.5rem] lg:!h-[min(88dvh,860px)] lg:!w-[min(92vw,1280px)] xl:!w-[min(88vw,1380px)]">
        <DialogHeader className="shrink-0 border-b border-border bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--muted)/0.25)_42%,transparent)] px-5 py-4 pr-12 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Images className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="line-clamp-1 font-syne text-lg sm:text-xl">Adicionar imagem à biblioteca</DialogTitle>
                <DialogDescription className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  Salve imagens de referência do produto para orientar roteiros, cenas e vídeos com IA.
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-semibold text-primary">Referência IA</span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-muted-foreground">
                {uploadMode === 'url' ? 'Imagem por URL' : uploadFile?.name || 'Imagem local'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)]">
          <aside className="order-1 min-h-0 border-border bg-muted/20 p-4 sm:p-5">
            <div className="flex h-full min-h-[420px] flex-col rounded-3xl border border-border bg-background/70 p-4 shadow-inner">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-syne text-sm font-bold text-foreground">Prévia da imagem</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Confira o que será salvo antes de entrar na biblioteca.</p>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {uploadMode === 'url' ? 'URL' : 'Local'}
                </span>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-border bg-card">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full max-h-[460px] w-full object-contain" />
                ) : (
                  <div className="px-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                      {uploadMode === 'url' ? <Link2 className="h-7 w-7" /> : <Upload className="h-7 w-7" />}
                    </div>
                    <p className="font-syne text-sm font-bold text-foreground">Aguardando imagem</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {uploadMode === 'url' ? 'Cole uma URL direta de imagem para visualizar aqui.' : 'Selecione uma imagem local para ver a prévia aqui.'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-2 rounded-2xl border border-border bg-muted/25 p-3 text-xs text-muted-foreground">
                <PreviewLine label="Título" value={uploadForm.title || 'Não informado'} />
                <PreviewLine label="Produto" value={uploadForm.product_name || 'Não vinculado'} />
                <PreviewLine label="Itens" value={uploadMode === 'url' ? (uploadForm.url ? '1' : '0') : uploadFile ? '1' : '0'} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button variant="outline" className="h-12 rounded-2xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button className="h-12 gap-2 rounded-2xl" onClick={onSave} disabled={savingUpload}>
                  <CheckCircle className="h-4 w-4" />
                  {savingUpload ? 'Salvando...' : 'Salvar na biblioteca'}
                </Button>
              </div>
              <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
                Depois de salva, esta imagem fica disponível para seleção em novos vídeos com IA.
              </p>
            </div>
          </aside>

          <section className="order-2 min-h-0 overflow-y-auto border-t border-border bg-card p-4 sm:p-5 lg:border-l lg:border-t-0">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { key: 'local', title: 'Imagem local', description: 'Enviar imagem do computador', icon: Upload },
                { key: 'url', title: 'Imagem por URL', description: 'Usar link direto de imagem', icon: Link2 },
              ].map(({ key, title, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onUploadModeChange(key as UploadMode)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40',
                    uploadMode === key ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' : 'border-border bg-card',
                  )}
                >
                  <Icon className={cn('mb-3 h-5 w-5', uploadMode === key ? 'text-primary' : 'text-muted-foreground')} />
                  <p className="font-syne text-sm font-bold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 rounded-3xl border border-border bg-card/70 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Título da imagem *" value={uploadForm.title} onChange={(title) => onUploadFormChange({ ...uploadForm, title })} placeholder="ex: Unboxing mini projetor" />
                <FormField label="Produto vinculado *" value={uploadForm.product_name} onChange={(product_name) => onUploadFormChange({ ...uploadForm, product_name })} placeholder="Nome do produto" />
              </div>

              {uploadMode === 'url' && (
                <div className="grid gap-3">
                  <FormField label="URL da imagem *" value={uploadForm.url} onChange={(url) => onUploadFormChange({ ...uploadForm, url })} placeholder="https://..." />
                  <FormField label="URL da thumbnail" value={uploadForm.thumbnail_url} onChange={(thumbnail_url) => onUploadFormChange({ ...uploadForm, thumbnail_url })} placeholder="Opcional" />
                </div>
              )}

              {uploadMode === 'local' && (
                <div>
                  <Label>Imagem local *</Label>
                  <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
                    <Upload className="mb-3 h-8 w-8 text-primary" />
                    <span className="font-syne text-sm font-bold text-foreground">Selecionar imagem</span>
                    <span className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Use imagens nítidas do produto para alimentar a geração de vídeo.</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={(event) => onUploadFileChange(event.target.files?.[0] || null)} />
                  </label>
                </div>
              )}

              <div>
                <Label>Observações / roteiro de uso</Label>
                <Textarea
                  value={uploadForm.caption}
                  onChange={(event) => onUploadFormChange({ ...uploadForm, caption: event.target.value })}
                  className="mt-1.5 min-h-28 rounded-2xl"
                  placeholder="Explique como essa imagem deve ser usada no vídeo: close do produto, unboxing, controle remoto, tela projetada, CTA..."
                />
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 rounded-2xl" placeholder={placeholder} />
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <strong className="max-w-[60%] truncate text-foreground">{value}</strong>
    </div>
  );
}
