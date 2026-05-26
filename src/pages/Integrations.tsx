import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import PlatformIcon from '@/components/common/PlatformIcon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, ExternalLink, KeyRound, Link2, PlugZap, RefreshCw, ShieldCheck, Store, Unplug, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ApiRequestError } from '@/api/httpClient';
import { ALL_PLATFORMS } from '@/config/platforms';
import {
  connectPlatform,
  disconnectPlatform,
  listPlatformAccounts,
  refreshPlatformToken,
  syncPlatformAccount,
  type PlatformAccountWithConfig,
} from '@/services/platforms';

const platforms = ALL_PLATFORMS;
const STORAGE_KEY = 'automedia_platform_connection_overrides';

type IntegrationPlatform = (typeof platforms)[number];
type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';
type LocalOverrides = Record<string, { status: ConnectionStatus; tested_at?: string }>;
type OAuthNotice = { type: 'success' | 'error'; platform?: string; message: string } | null;

const platformDetails: Record<IntegrationPlatform, {
  title: string;
  description: string;
  action: string;
  scopes: string[];
}> = {
  instagram: {
    title: 'Instagram',
    description: 'Reels, posts e respostas em comentários.',
    action: 'Melhor para vendas por conteúdo curto.',
    scopes: ['Publicar conteúdo', 'Ler comentários', 'Responder leads'],
  },
  tiktok: {
    title: 'TikTok',
    description: 'Vídeos curtos e campanhas virais.',
    action: 'Ideal para alcance e descoberta.',
    scopes: ['Enviar vídeos', 'Publicar vídeos', 'Ver status'],
  },
  facebook: {
    title: 'Facebook',
    description: 'Páginas, posts e engajamento.',
    action: 'Bom para páginas e comunidades.',
    scopes: ['Publicar em páginas', 'Ler engajamento', 'Gerenciar posts'],
  },
  youtube: {
    title: 'YouTube',
    description: 'Shorts e vídeos de produto.',
    action: 'Use para vídeos mais duradouros.',
    scopes: ['Upload de vídeo', 'Título e descrição', 'Status do vídeo'],
  },
  shopee: {
    title: 'Shopee',
    description: 'Loja, catálogo e links de compra.',
    action: 'Conecta conteúdo com marketplace.',
    scopes: ['Autorizar loja', 'Produtos', 'Links comerciais'],
  },
  mercadolivre: {
    title: 'Mercado Livre',
    description: 'Anúncios, produtos e vendas.',
    action: 'Use para operação comercial.',
    scopes: ['Conta vendedor', 'Anúncios', 'Links de produto'],
  },
};

function readOverrides(): LocalOverrides {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as LocalOverrides;
  } catch {
    return {};
  }
}

function saveOverrides(overrides: LocalOverrides) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function friendlyError(error: unknown) {
  return error instanceof ApiRequestError ? error.message : 'A API não confirmou a operação.';
}

function formatDateTime(value?: string) {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatExpiry(value?: string) {
  if (!value) return 'Sem expiração informada';
  const date = new Date(value);
  const expired = date.getTime() < Date.now();
  return `${expired ? 'Expirado em' : 'Expira em'} ${date.toLocaleDateString('pt-BR')}`;
}

function getReadableAccountInfo(info: unknown) {
  if (!info || typeof info !== 'object') return null;
  const record = info as Record<string, unknown>;
  const name = record.shop_name || record.name || record.account_name || record.username;
  const id = record.shop_id || record.id || record.account_id;

  if (name && id) return `${String(name)} (${String(id)})`;
  if (name) return String(name);
  if (id) return String(id);
  return null;
}

function getAccount(platform: IntegrationPlatform, accounts: PlatformAccountWithConfig[], overrides: LocalOverrides): PlatformAccountWithConfig {
  const account = accounts.find((item) => item.platform === platform);
  const override = overrides[platform];
  const canUseLocalOverride = !account || account.mode === 'mock';

  return {
    id: account?.id || `platform_${platform}`,
    platform,
    account_name: account?.account_name || platformDetails[platform].title,
    status: canUseLocalOverride ? override?.status || account?.status || 'disconnected' : account?.status || 'disconnected',
    last_sync_at: canUseLocalOverride ? override?.tested_at || account?.last_sync_at : account?.last_sync_at,
    configured: account?.configured ?? true,
    mode: account?.mode || 'mock',
    required_scopes: account?.required_scopes || platformDetails[platform].scopes,
    setup_status: account?.setup_status,
    setup_hint: account?.setup_hint,
  };
}

export default function Integrations() {
  const [accounts, setAccounts] = useState<PlatformAccountWithConfig[]>([]);
  const [overrides, setOverrides] = useState<LocalOverrides>(() => readOverrides());
  const [loading, setLoading] = useState(true);
  const [busyPlatform, setBusyPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatform | null>(null);
  const [oauthNotice, setOauthNotice] = useState<OAuthNotice>(null);

  const platformAccounts = useMemo(
    () => platforms.map((platform) => getAccount(platform, accounts, overrides)),
    [accounts, overrides],
  );

  const connectedCount = platformAccounts.filter((account) => account.status === 'connected').length;
  const productionCount = platformAccounts.filter((account) => account.mode === 'live' && account.configured).length;
  const readiness = Math.round((connectedCount / platforms.length) * 100);
  const selectedAccount = selectedPlatform ? getAccount(selectedPlatform, accounts, overrides) : null;

  const reloadAccounts = async () => {
    const nextAccounts = await listPlatformAccounts();
    setAccounts(nextAccounts);
    return nextAccounts;
  };

  useEffect(() => {
    reloadAccounts()
      .catch(() => toast.error('Não foi possível carregar as integrações.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get('platform');
    const platformName = platform && platform in platformDetails ? platformDetails[platform as IntegrationPlatform].title : platform || undefined;

    if (params.get('connected') === '1' && platform) {
      const message = `${platformName} vinculado com autorização oficial.`;
      setOauthNotice({ type: 'success', platform, message });
      toast.success(message);
      reloadAccounts().catch(() => undefined);
    }

    if (params.get('error')) {
      const message = `Falha na autorização ${platformName ? `da ${platformName}` : ''}: ${params.get('error')}`;
      setOauthNotice({ type: 'error', platform: platform || undefined, message });
      toast.error(message);
    }

    if (params.has('connected') || params.has('error')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const persistStatus = (platform: IntegrationPlatform, status: ConnectionStatus) => {
    const next = { ...overrides, [platform]: { status, tested_at: new Date().toISOString() } };
    setOverrides(next);
    saveOverrides(next);
  };

  const handleConnect = async (platform: IntegrationPlatform) => {
    setBusyPlatform(platform);
    try {
      const response = await connectPlatform(platform);

      if (response.mode === 'live') {
        window.location.href = response.oauth_url;
        return;
      }

      setAccounts((current) => {
        const exists = current.some((item) => item.platform === platform);
        return exists ? current.map((item) => (item.platform === platform ? response.account : item)) : [...current, response.account];
      });

      persistStatus(platform, response.account.status);

      toast.success(`${platformDetails[platform].title} conectado em modo teste.`);
      setSelectedPlatform(null);
    } catch (error) {
      toast.error(`Não foi possível conectar. ${friendlyError(error)}`);
    } finally {
      setBusyPlatform(null);
    }
  };

  const handleDisconnect = async (platform: IntegrationPlatform) => {
    setBusyPlatform(platform);
    try {
      const response = await disconnectPlatform(platform);
      setAccounts((current) => current.map((item) => (item.platform === platform ? response : item)));
      const currentMode = accounts.find((item) => item.platform === platform)?.mode;
      if ((response.mode || currentMode) === 'mock') persistStatus(platform, 'disconnected');
      toast.success(`${platformDetails[platform].title} desconectado.`);
    } catch (error) {
      toast.error(`Não foi possível desconectar. ${friendlyError(error)}`);
    } finally {
      setBusyPlatform(null);
    }
  };

  const handleTest = async (platform: IntegrationPlatform) => {
    setBusyPlatform(platform);
    try {
      const response = await syncPlatformAccount(platform);
      setAccounts((current) => current.map((item) => (item.platform === platform ? response.account : item)));
      if (response.account.mode === 'mock') persistStatus(platform, 'connected');
      const accountInfo = getReadableAccountInfo(response.info);
      toast.success(accountInfo ? `${platformDetails[platform].title} validado: ${accountInfo}` : `${platformDetails[platform].title} validado com a API.`);
    } catch (error) {
      toast.error(`Falha ao validar conexão. ${friendlyError(error)}`);
    } finally {
      setBusyPlatform(null);
    }
  };

  const handleRefresh = async (platform: IntegrationPlatform) => {
    setBusyPlatform(platform);
    try {
      const account = await refreshPlatformToken(platform);
      setAccounts((current) => current.map((item) => (item.platform === platform ? account : item)));
      toast.success(`Token da ${platformDetails[platform].title} renovado.`);
    } catch (error) {
      toast.error(`Não foi possível renovar token. ${friendlyError(error)}`);
    } finally {
      setBusyPlatform(null);
    }
  };

  return (
    <div>
      <TopBar title="Integrações" subtitle="Conecte suas redes para publicar e responder automaticamente" />
      <div className="mobile-page-pad page-stack">
        <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Conexão segura
              </div>
              <h2 className="font-syne text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                Conecte uma vez. Publique em vários canais.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Escolha uma plataforma, autorize a conexão e o AutoMedia usa essa conta nas telas de aprovação, agendamento e comentários.
              </p>
              <p className="mt-4 rounded-2xl border border-border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                Status vindo do backend. Em modo produção, a vinculação só aparece como concluída depois do OAuth oficial retornar e salvar tokens no banco.
              </p>
            </div>
            <div className="w-full rounded-2xl border border-border bg-muted/30 p-4 lg:max-w-xs">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Prontidão</span>
                <span className="text-muted-foreground">{connectedCount}/{platforms.length}</span>
              </div>
              <Progress value={readiness} />
              <p className="mt-2 text-xs text-muted-foreground">
                {productionCount > 0 ? `${productionCount} plataforma(s) com credenciais de produção.` : 'Ambiente em modo teste ou aguardando credenciais oficiais.'}
              </p>
            </div>
          </div>
        </section>

        {oauthNotice && (
          <section className={cn(
            'rounded-3xl border p-4 sm:p-5',
            oauthNotice.type === 'success' ? 'border-success/20 bg-success/10 text-success' : 'border-destructive/20 bg-destructive/10 text-destructive',
          )}>
            <div className="flex items-start gap-3">
              {oauthNotice.type === 'success' ? <CheckCircle className="mt-0.5 h-5 w-5" /> : <AlertCircle className="mt-0.5 h-5 w-5" />}
              <div>
                <p className="text-sm font-semibold">{oauthNotice.type === 'success' ? 'Vinculação confirmada' : 'Autorização não concluída'}</p>
                <p className="mt-1 text-xs opacity-85">{oauthNotice.message}</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platformAccounts.map((account) => (
            <IntegrationCard
              key={account.platform}
              account={account}
              loading={loading || busyPlatform === account.platform}
              onDetails={() => setSelectedPlatform(account.platform as IntegrationPlatform)}
              onConnect={() => handleConnect(account.platform as IntegrationPlatform)}
              onTest={() => handleTest(account.platform as IntegrationPlatform)}
              onRefresh={() => handleRefresh(account.platform as IntegrationPlatform)}
              onDisconnect={() => handleDisconnect(account.platform as IntegrationPlatform)}
            />
          ))}
        </section>
      </div>

      <ConnectDialog
        platform={selectedPlatform}
        account={selectedAccount}
        loading={Boolean(selectedPlatform && busyPlatform === selectedPlatform)}
        onClose={() => setSelectedPlatform(null)}
        onConnect={() => selectedPlatform && handleConnect(selectedPlatform)}
      />
    </div>
  );
}

function IntegrationCard({
  account,
  loading,
  onDetails,
  onConnect,
  onTest,
  onRefresh,
  onDisconnect,
}: {
  account: PlatformAccountWithConfig;
  loading: boolean;
  onDetails: () => void;
  onConnect: () => void;
  onTest: () => void;
  onRefresh: () => void;
  onDisconnect: () => void;
}) {
  const platform = account.platform as IntegrationPlatform;
  const details = platformDetails[platform];
  const connected = account.status === 'connected';
  const needsCredentials = account.setup_status === 'missing_credentials' || account.configured === false;
  const supportsRefresh = platform === 'shopee';

  return (
    <article className={cn(
      'rounded-3xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.05]',
      connected ? 'border-success/25' : 'border-border',
    )}>
      <div className="flex items-start justify-between gap-4">
        <PlatformIcon platform={platform} showLabel size="lg" />
        <StatusPill status={account.status} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full">
          {account.mode === 'live' ? 'OAuth oficial' : 'Modo teste'}
        </Badge>
        {account.configured ? (
          <Badge variant="outline" className="rounded-full border-success/30 text-success">API configurada</Badge>
        ) : (
          <Badge variant="outline" className="rounded-full border-warning/30 text-warning">Credenciais pendentes</Badge>
        )}
      </div>
      <p className="mt-5 text-sm font-medium text-foreground">{details.description}</p>
      <p className="mt-1 min-h-9 text-xs text-muted-foreground">{details.action}</p>
      <div className="mt-4 rounded-2xl bg-muted/35 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Conta</span>
          <span className="max-w-[55%] truncate font-medium text-foreground">{account.account_id || account.account_name}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Última sincronização</span>
          <span className="font-medium text-foreground">
            {formatDateTime(account.last_sync_at)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Token</span>
          <span className={cn('font-medium', account.expires_at && new Date(account.expires_at).getTime() < Date.now() ? 'text-destructive' : 'text-foreground')}>
            {formatExpiry(account.expires_at)}
          </span>
        </div>
        {account.error_message && (
          <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            {account.error_message}
          </p>
        )}
        {account.mode !== 'live' && (
          <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted-foreground">
            Modo teste: valida o fluxo sem enviar você para OAuth externo.
          </p>
        )}
        {account.mode === 'live' && account.setup_hint && (
          <p className={cn('mt-3 border-t border-border pt-2 text-[11px]', needsCredentials ? 'text-warning' : 'text-muted-foreground')}>
            {account.setup_hint}
          </p>
        )}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {connected ? (
          <>
            <Button variant="outline" disabled={loading} onClick={onTest}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar
            </Button>
            {supportsRefresh && (
              <Button variant="outline" disabled={loading} onClick={onRefresh}>
                <KeyRound className="mr-2 h-4 w-4" />
                Renovar token
              </Button>
            )}
            <Button variant="outline" disabled={loading} onClick={onDisconnect} className="text-destructive hover:text-destructive">
              <Unplug className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </>
        ) : (
          <>
            <Button disabled={loading || needsCredentials} onClick={onConnect}>
              <Link2 className="mr-2 h-4 w-4" />
              {needsCredentials ? 'Configurar API' : 'Conectar'}
            </Button>
            <Button variant="outline" disabled={loading} onClick={onDetails}>
              Detalhes
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function StatusPill({ status }: { status?: string }) {
  const connected = status === 'connected';
  const error = status === 'error' || status === 'expired';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        connected && 'border-success/20 bg-success/10 text-success',
        error && 'border-destructive/20 bg-destructive/10 text-destructive',
        !connected && !error && 'border-border bg-muted text-muted-foreground',
      )}
    >
      {connected ? <CheckCircle className="h-3 w-3" /> : error ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {connected ? 'Conectado' : error ? 'Atenção' : 'Desconectado'}
    </span>
  );
}

function ConnectDialog({
  platform,
  account,
  loading,
  onClose,
  onConnect,
}: {
  platform: IntegrationPlatform | null;
  account: PlatformAccountWithConfig | null;
  loading: boolean;
  onClose: () => void;
  onConnect: () => void;
}) {
  if (!platform || !account) return null;

  const details = platformDetails[platform];

  return (
    <Dialog open={Boolean(platform)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-syne text-2xl">
            <PlatformIcon platform={platform} size="lg" />
            Conectar {details.title}
          </DialogTitle>
          <DialogDescription>
            Vamos usar a autorização oficial da plataforma. Você nunca informa sua senha dentro do AutoMedia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              {platform === 'shopee' ? <Store className="mt-0.5 h-5 w-5 text-primary" /> : <PlugZap className="mt-0.5 h-5 w-5 text-primary" />}
              <div>
                <p className="text-sm font-semibold text-foreground">O que será habilitado</p>
                <p className="mt-1 text-xs text-muted-foreground">{details.description}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissões</p>
            <div className="flex flex-wrap gap-2">
              {(account.required_scopes || details.scopes).map((scope) => (
                <span key={scope} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Modo atual</span>
              <span className="font-medium text-foreground">{account.mode === 'live' ? 'Produção' : 'Teste seguro'}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {account.mode === 'live'
                ? 'Ao continuar, você será levado para a autorização oficial. A conta só ficará conectada depois do retorno OAuth salvar tokens no banco.'
                : 'No modo teste, simulamos a autorização para validar o fluxo sem credenciais reais.'}
            </p>
            {account.account_id && (
              <p className="mt-2 text-xs text-muted-foreground">
                Conta vinculada: <span className="font-medium text-foreground">{account.account_id}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onConnect} disabled={loading}>
              {loading ? 'Conectando...' : account.mode === 'live' ? 'Autorizar' : 'Conectar em teste'}
              {account.mode === 'live' && <ExternalLink className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
