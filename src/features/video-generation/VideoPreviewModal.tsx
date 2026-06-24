import { CheckCircle, Clock, Copy, Film, Play, RefreshCw, XCircle } from 'lucide-react';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { MediaAsset, Status } from '@/types/entities';

type VideoPreviewModalProps = {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatus: (asset: MediaAsset, status: Status, message: string) => void;
};

const getVideoScore = (asset: MediaAsset) => Number(asset.quality_score ?? (asset.status === 'approved' ? 88 : asset.status === 'rejected' ? 38 : 72));

export default function VideoPreviewModal({ asset, open, onOpenChange, onStatus }: VideoPreviewModalProps) {
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
