import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import PlatformIcon from '@/components/common/PlatformIcon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  KeyRound,
  Link2,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unplug,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { connectPlatform, disconnectPlatform, listPlatformAccounts, type PlatformAccountWithConfig } from '@/services/platforms';

const platforms = ['instagram', 'tiktok', 'facebook', 'youtube', 'shopee', 'mercadolivre'] as const;
const STORAGE_KEY = 'automedia_platform_connection_overrides';

type IntegrationPlatform = (typeof platforms)[number];
type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';
type LocalOverrides = Record<string, { status: ConnectionStatus; connected_at?: string; tested_at?: string }>;

const platformDetails: Record<IntegrationPlatform, {
  headline: string;
  description: string;
  capabilities: string[];
  permissions: string[];
  accent: string;
}> = {
  instagram: {
    headline: 'Reels, posts e comentários',
    description: 'Conecte contas profissionais via Meta para publicar criativos e responder leads.',
    capabilities: ['Publicar criativos', 'Ler comentários', 'Responder intenção de compra'],
    permissions: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
    accent: 'from-fuchsia-500/20 via-pink-500/10 to-orange-500/20',
  },
  tiktok: {
    headline: 'Vídeos curtos e automação',
    description: 'Prepare vídeos para envio pela Content Posting API quando o app estiver aprovado.',
    capabilities: ['Upload de vídeo', 'Publicação direta', 'Controle de status'],
    permissions: ['user.info.basic', 'video.publish', 'video.upload'],
    accent: 'from-slate-900/20 via-cyan-500/10 to-rose-500/20',
  },
  facebook: {
    headline: 'Páginas e campanhas',
    description: 'Use páginas do Facebook para publicar posts e acompanhar interação.',
    capabilities: ['Publicar em páginas', 'Sincronizar posts', 'Ler engajamento'],
    permissions: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
    accent: 'from-blue-600/20 via-sky-500/10 to-indigo-500/20',
  },
  youtube: {
    headline: 'Shorts e vídeos',
    description: 'Conecte canais do YouTube para preparar envio de vídeos aprovados.',
    capabilities: ['Upload de vídeo', 'Título e descrição', 'Status de publicação'],
    permissions: ['youtube.upload'],
    accent: 'from-red-600/20 via-orange-500/10 to-red-500/20',
  },
  shopee: {
    headline: 'Loja e catálogo',
    description: 'Prepare integração de catálogo para campanhas e links de compra.',
    capabilities: ['Vincular loja', 'Produtos e links', 'Campanhas comerciais'],
    permissions: ['shop_authorization', 'product_write'],
    accent: 'from-orange-500/20 via-amber-500/10 to-red-500/20',
  },
  mercadolivre: {
    headline: 'Anúncios e marketplace',
    description: 'Conecte a conta para trabalhar com anúncios e links de produtos.',
    capabilities: ['Conta de vendedor', 'Links de anúncio', 'Produtos comerciais'],
    permissions: ['offline_access', 'write'],
    accent: 'from-yellow-400/25 via-amber-300/15 to-blue-500/10',
  },
};

function readOverrides(): LocalOverrides {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as LocalOverrides;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: LocalOverrides) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function mergeAccount(account: PlatformAccountWithConfig | undefined, overrides: LocalOverrides, platform: IntegrationPlatform): PlatformAccountWithConfig {
  const override = overrides[platform];
  return {
    id: account?.id || `platform_${platform}`,
    platform,
    account_name: account?.account_name || platform,
    status: override?.status || account?.status || 'disconnected',
    last_sync_at: override?.tested_at || account?.last_sync_at,
    configured: account?.configured ?? true,
    mode: account?.mode || 'mock',
    required_scopes: account?.required_scopes || platformDetails[platform].permissions,
  };
}

export default function Integrations() {
  const [accounts, setAccounts] = useState<PlatformAccountWithConfig[]>([]);
  const [overrides, setOverrides] = useState<LocalOverrides>(() => readOverrides());
  const [loading, setLoading] = useState(true);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatform | null>(null);
  const [step, setStep] = useState(1);

  const mergedAccounts = useMemo(
    () => platforms.map((platform) => mergeAccount(accounts.find((account) => account.platform === platform), overrides, platform)),
    [accounts, overrides],
  );

  const stats = useMemo(() => {
    const connected = mergedAccounts.filter((account) => account.status === 'connected').length;
    const configured = mergedAccounts.filter((account) => account.configured).length;
    return {
      connected,
      configured,
      readiness: Math.round((connected / platforms.length) * 100),
    };
  }, [mergedAccounts]);

  const selectedAccount = selectedPlatform
    ? mergeAccount(accounts.find((account) => account.platform === selectedPlatform), overrides, selectedPlatform)
    : null;

  const load = async () => {
    setLoading(true);
    try {
      setAccounts(await listPlatformAccounts());
    } catch {
      toast.error('Não foi possível carregar integrações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const persistOverride = (platform: IntegrationPlatform, status: ConnectionStatus, extra: Partial<LocalOverrides[string]> = {}) => {
    const next = {
      ...overrides,
      [platform]: {
        ...overrides[platform],
        status,
        ...extra,
      },
    };
    setOverrides(next);
    writeOverrides(next);
  };

  const startConnection = (platform: IntegrationPlatform) => {
    setSelectedPlatform(platform);
    setStep(1);
  };

  const confirmConnection = async () => {
    if (!selectedPlatform) return;

    setBusyPlatform(selectedPlatform);
    try {
      const response = await connectPlatform(selectedPlatform);
      persistOverride(selectedPlatform, response.account.status, { connected_at: new Date().toISOString(), tested_at: new Date().toISOString() });
      setAccounts((current) => {
        const exists = current.some((account) => account.platform === selectedPlatform);
        return exists ? current.map((account) => (account.platform === selectedPlatform ? response.account : account)) : [...current, response.account];
      });

      if (response.mode === 'live') {
        setStep(3);
        window.location.href = response.oauth_url;
        return;
      }

      setStep(4);
      toast.success(`${selectedPlatform} conectado em modo teste.`);
    } catch {
      persistOverride(selectedPlatform, 'error');
      toast.error('Não foi possível iniciar conexão.');
    } finally {
      setBusyPlatform(null);
    }
  };

  const disconnect = async (platform: IntegrationPlatform) => {
    setBusyPlatform(platform);
    try {
      await disconnectPlatform(platform);
      persistOverride(platform, 'disconnected');
      toast.success(`${platform} desconectado.`);
    } catch {
      persistOverride(platform, 'disconnected');
      toast.warning('Desconectado visualmente. A API não confirmou a alteração.');
    } finally {
      setBusyPlatform(null);
    }
  };

  const testConnection = async (platform: IntegrationPlatform) => {
    setBusyPlatform(platform);
    try {
      await connectPlatform(platform);
      persistOverride(platform, 'connected', { tested_at: new Date().toISOString() });
      toast.success(`Conexão com ${platform} validada.`);
    } catch {
      persistOverride(platform, 'error');
      toast.error(`Falha ao validar ${platform}.`);
    } finally {
      setBusyPlatform(null);
    }
  };

  return (
    <div>
      <TopBar title="Integrações" subtitle="Conecte redes sociais e marketplaces com um fluxo guiado" />
      <div className="space-y-6 p-4 sm:p-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative isolate grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_34%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--muted)/0.35))]" />
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                OAuth oficial, visual simples
              </div>
              <h2 className="font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Central de conexão para publicar e responder sem confusão técnica.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                O usuário vê etapas claras. O backend cuida de autorização, tokens, escopos e envio para o provider correto.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <HeroMetric label="Conectadas" value={`${stats.connected}/${platforms.length}`} icon={PlugZap} />
                <HeroMetric label="Configuradas" value={`${stats.configured}/${platforms.length}`} icon={KeyRound} />
                <HeroMetric label="Prontidão" value={`${stats.readiness}%`} icon={Sparkles} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Checklist operacional</p>
                <span className="text-xs text-muted-foreground">Fluxo de publicação</span>
              </div>
              <Progress value={stats.readiness} />
              <div className="mt-4 space-y-3">
                <ChecklistItem checked={stats.connected > 0} label="Ao menos uma rede conectada" />
                <ChecklistItem checked label="Permissões mapeadas por plataforma" />
                <ChecklistItem checked label="Publicação passa pelo backend/provider" />
                <ChecklistItem checked={stats.connected === platforms.length} label="Todas as plataformas conectadas" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mergedAccounts.map((account) => (
            <IntegrationCard
              key={account.platform}
              account={account}
              loading={loading || busyPlatform === account.platform}
              onConnect={() => startConnection(account.platform as IntegrationPlatform)}
              onDisconnect={() => disconnect(account.platform as IntegrationPlatform)}
              onTest={() => testConnection(account.platform as IntegrationPlatform)}
            />
          ))}
        </section>
      </div>

      <ConnectionDialog
        platform={selectedPlatform}
        account={selectedAccount}
        step={step}
        loading={Boolean(selectedPlatform && busyPlatform === selectedPlatform)}
        onStep={setStep}
        onClose={() => setSelectedPlatform(null)}
        onConfirm={confirmConnection}
      />
    </div>
  );
}

function HeroMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof PlugZap }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 p-4">
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <p className="font-syne text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? <CheckCircle className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
      <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}

function IntegrationCard({
  account,
  loading,
  onConnect,
  onDisconnect,
  onTest,
}: {
  account: PlatformAccountWithConfig;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
}) {
  const platform = account.platform as IntegrationPlatform;
  const details = platformDetails[platform];
  const connected = account.status === 'connected';
  const hasError = account.status === 'error';

  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.05]">
      <div className={cn('border-b border-border bg-gradient-to-br p-5', details.accent)}>
        <div className="flex items-start justify-between gap-4">
          <PlatformIcon platform={platform} showLabel size="lg" />
          <ConnectionPill status={account.status} />
        </div>
        <h3 className="mt-5 font-syne text-xl font-bold text-foreground">{details.headline}</h3>
        <p className="mt-2 min-h-10 text-sm text-muted-foreground">{details.description}</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2">
          {details.capabilities.map((item) => (
            <div key={item} className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {item}
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5" />
            Permissões
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(account.required_scopes || details.permissions).slice(0, 4).map((scope) => (
              <span key={scope} className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                {scope}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Modo {account.mode === 'live' ? 'produção' : 'teste'}</span>
          <span>{account.last_sync_at ? `Sync ${new Date(account.last_sync_at).toLocaleDateString('pt-BR')}` : 'Nunca sincronizado'}</span>
        </div>
        {hasError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <span>{account.error_message || 'A conexão precisa de atenção.'}</span>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {connected ? (
            <>
              <Button variant="outline" className="gap-2" disabled={loading} onClick={onTest}>
                <RefreshCw className="h-4 w-4" />
                Testar
              </Button>
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" disabled={loading} onClick={onDisconnect}>
                <Unplug className="h-4 w-4" />
                Desconectar
              </Button>
            </>
          ) : (
            <Button className="col-span-full gap-2" disabled={loading} onClick={onConnect}>
              <Link2 className="h-4 w-4" />
              Conectar {platform}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ConnectionPill({ status }: { status?: string }) {
  const connected = status === 'connected';
  const error = status === 'error' || status === 'expired';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
      connected && 'border-success/20 bg-success/10 text-success',
      error && 'border-destructive/20 bg-destructive/10 text-destructive',
      !connected && !error && 'border-border bg-background/80 text-muted-foreground',
    )}>
      {connected ? <CheckCircle className="h-3 w-3" /> : error ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {connected ? 'Conectado' : error ? 'Atenção' : 'Desconectado'}
    </span>
  );
}

function ConnectionDialog({
  platform,
  account,
  step,
  loading,
  onStep,
  onClose,
  onConfirm,
}: {
  platform: IntegrationPlatform | null;
  account: PlatformAccountWithConfig | null;
  step: number;
  loading: boolean;
  onStep: (step: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!platform || !account) return null;

  const details = platformDetails[platform];
  const steps = ['Preparar', 'Permissões', 'Autorizar', 'Concluído'];

  return (
    <Dialog open={Boolean(platform)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <DialogHeader className={cn('border-b border-border bg-gradient-to-br p-5 text-left', details.accent)}>
          <DialogTitle className="flex items-center gap-3 font-syne text-2xl">
            <PlatformIcon platform={platform} size="lg" />
            Conectar {platform}
          </DialogTitle>
          <DialogDescription>
            Fluxo guiado para autorizar permissões e deixar a plataforma pronta para publicação automática.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 p-5">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => {
              const active = step >= index + 1;
              return (
                <div key={label} className="space-y-2">
                  <div className={cn('h-1.5 rounded-full', active ? 'bg-primary' : 'bg-muted')} />
                  <p className={cn('text-[10px] font-medium uppercase tracking-wide', active ? 'text-primary' : 'text-muted-foreground')}>{label}</p>
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <DialogPanel
              icon={ShieldCheck}
              title="Vamos preparar a conexão"
              text="Você não precisa informar senha no AutoMedia. A autorização abre no ambiente oficial da plataforma."
              items={['OAuth oficial', 'Tokens guardados pelo backend', 'Permissões separadas por rede']}
            />
          )}
          {step === 2 && (
            <DialogPanel
              icon={KeyRound}
              title="Permissões solicitadas"
              text="Essas permissões permitem publicar conteúdo, ler comentários e acionar respostas automáticas quando a plataforma liberar."
              items={account.required_scopes || details.permissions}
            />
          )}
          {step === 3 && (
            <DialogPanel
              icon={ExternalLink}
              title={account.mode === 'live' ? 'Autorizar na plataforma' : 'Modo teste ativo'}
              text={account.mode === 'live' ? 'Vamos redirecionar para a tela oficial de autorização.' : 'Como o backend está em mock, simularemos a autorização para validar o fluxo visual.'}
              items={['Selecionar conta/página', 'Confirmar permissões', 'Voltar conectado ao AutoMedia']}
            />
          )}
          {step === 4 && (
            <DialogPanel
              icon={CheckCircle}
              title="Conexão pronta"
              text="A plataforma está marcada como conectada e já pode ser usada nas telas de aprovação e publicação."
              items={['Publicação pelo backend', 'Status visível no painel', 'Teste de conexão disponível']}
            />
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            {step < 3 && <Button onClick={() => onStep(step + 1)}>Continuar</Button>}
            {step === 3 && (
              <Button className="gap-2" disabled={loading} onClick={onConfirm}>
                <PlugZap className="h-4 w-4" />
                {loading ? 'Conectando...' : account.mode === 'live' ? 'Autorizar agora' : 'Simular conexão'}
              </Button>
            )}
            {step === 4 && <Button onClick={onClose}>Finalizar</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogPanel({ icon: Icon, title, text, items }: { icon: typeof ShieldCheck; title: string; text: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-syne text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-success" />
            <span className="truncate">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
