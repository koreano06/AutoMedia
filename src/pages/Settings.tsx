import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import PlatformIcon from '@/components/common/PlatformIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Zap, Link2, Clock, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const platforms = ['instagram', 'tiktok', 'facebook', 'youtube', 'shopee', 'mercadolivre'] as const;
const SETTINGS_STORAGE_KEY = 'automedia_settings';

type Platform = (typeof platforms)[number];
type ConnectedState = Record<Platform, boolean>;

type SettingsState = {
  connected: ConnectedState;
  autoReply: boolean;
  autoSchedule: boolean;
  notifications: boolean;
  randomSchedule: boolean;
  purchaseKeywords: string;
  postingStart: string;
  postingEnd: string;
};

const defaultSettings: SettingsState = {
  connected: {
    instagram: true,
    tiktok: false,
    facebook: true,
    youtube: false,
    shopee: false,
    mercadolivre: false,
  },
  autoReply: true,
  autoSchedule: true,
  notifications: true,
  randomSchedule: true,
  purchaseKeywords: 'eu quero, quanto custa, como comprar, onde comprar, link do produto',
  postingStart: '08:00',
  postingEnd: '22:00',
};

const automationSettings = [
  {
    key: 'autoReply',
    label: 'Resposta Automática a Comentários',
    desc: 'Responde automaticamente quando detecta intenção de compra',
    icon: MessageSquare,
  },
  {
    key: 'autoSchedule',
    label: 'Agendamento Automático',
    desc: 'Agenda posts automaticamente após aprovação',
    icon: Clock,
  },
  {
    key: 'randomSchedule',
    label: 'Horários Aleatórios',
    desc: 'Publica em horários variados para parecer natural',
    icon: Zap,
  },
  {
    key: 'notifications',
    label: 'Notificações',
    desc: 'Receba alertas sobre aprovações e publicações',
    icon: Bell,
  },
] as const;

export default function Settings() {
  const [connected, setConnected] = useState<ConnectedState>(defaultSettings.connected);
  const [autoReply, setAutoReply] = useState(defaultSettings.autoReply);
  const [autoSchedule, setAutoSchedule] = useState(defaultSettings.autoSchedule);
  const [notifications, setNotifications] = useState(defaultSettings.notifications);
  const [randomSchedule, setRandomSchedule] = useState(defaultSettings.randomSchedule);
  const [purchaseKeywords, setPurchaseKeywords] = useState(defaultSettings.purchaseKeywords);
  const [postingStart, setPostingStart] = useState(defaultSettings.postingStart);
  const [postingEnd, setPostingEnd] = useState(defaultSettings.postingEnd);

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!savedSettings) {
      return;
    }

    try {
      const parsed = JSON.parse(savedSettings) as Partial<SettingsState>;
      setConnected({ ...defaultSettings.connected, ...parsed.connected });
      setAutoReply(parsed.autoReply ?? defaultSettings.autoReply);
      setAutoSchedule(parsed.autoSchedule ?? defaultSettings.autoSchedule);
      setNotifications(parsed.notifications ?? defaultSettings.notifications);
      setRandomSchedule(parsed.randomSchedule ?? defaultSettings.randomSchedule);
      setPurchaseKeywords(parsed.purchaseKeywords ?? defaultSettings.purchaseKeywords);
      setPostingStart(parsed.postingStart ?? defaultSettings.postingStart);
      setPostingEnd(parsed.postingEnd ?? defaultSettings.postingEnd);
    } catch {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }, []);

  const automationState = {
    autoReply: [autoReply, setAutoReply],
    autoSchedule: [autoSchedule, setAutoSchedule],
    notifications: [notifications, setNotifications],
    randomSchedule: [randomSchedule, setRandomSchedule],
  } as const;

  const handleConnect = (platform: Platform) => {
    const nextConnected = !connected[platform];

    setConnected((prev) => ({ ...prev, [platform]: nextConnected }));
    toast.success(nextConnected ? `${platform} conectado com sucesso!` : `${platform} desconectado`);
  };

  const handleSave = () => {
    const settings: SettingsState = {
      connected,
      autoReply,
      autoSchedule,
      notifications,
      randomSchedule,
      purchaseKeywords,
      postingStart,
      postingEnd,
    };

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    toast.success('Configurações salvas!');
  };

  return (
    <div>
      <TopBar title="Configurações" subtitle="Gerencie suas integrações e preferências" />
      <div className="max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Link2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-syne text-sm font-bold text-foreground">Plataformas Conectadas</p>
              <p className="text-xs text-muted-foreground">Conecte suas redes sociais e marketplaces</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {platforms.map((platform) => (
              <div key={platform} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <PlatformIcon platform={platform} showLabel />
                <div className="flex flex-wrap items-center gap-3">
                  {connected[platform] ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs text-success">
                      <CheckCircle className="h-3 w-3" />
                      Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                      <XCircle className="h-3 w-3" />
                      Desconectado
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={connected[platform] ? 'outline' : 'default'}
                    className="h-8"
                    onClick={() => handleConnect(platform)}
                  >
                    {connected[platform] ? 'Desconectar' : 'Conectar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-syne text-sm font-bold text-foreground">Automações</p>
              <p className="text-xs text-muted-foreground">Configure o comportamento automático</p>
            </div>
          </div>

          <div className="divide-y divide-border">
            {automationSettings.map(({ key, label, desc, icon: Icon }) => {
              const [value, onChange] = automationState[key];

              return (
                <div key={key} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch checked={value} onCheckedChange={onChange} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-syne text-sm font-bold text-foreground">Horário de Postagem</p>
              <p className="text-xs text-muted-foreground">Define o intervalo de horas para publicação</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Início</Label>
              <Input type="time" value={postingStart} onChange={(event) => setPostingStart(event.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">Fim</Label>
              <Input type="time" value={postingEnd} onChange={(event) => setPostingEnd(event.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-syne text-sm font-bold text-foreground">Palavras-chave de Compra</p>
              <p className="text-xs text-muted-foreground">
                O sistema responde automaticamente quando detectar essas frases nos comentários
              </p>
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Palavras-chave separadas por vírgula</Label>
            <Input value={purchaseKeywords} onChange={(event) => setPurchaseKeywords(event.target.value)} className="text-sm" />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
