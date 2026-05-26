import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Bell, Clock, Link2, MessageSquare, Zap } from 'lucide-react';
import { toast } from 'sonner';

const SETTINGS_STORAGE_KEY = 'automedia_settings';

type SettingsState = {
  autoReply: boolean;
  autoSchedule: boolean;
  notifications: boolean;
  randomSchedule: boolean;
  purchaseKeywords: string;
  postingStart: string;
  postingEnd: string;
};

const defaultSettings: SettingsState = {
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
    label: 'Resposta automática',
    desc: 'Marca comentários com intenção de compra e prepara uma resposta com link.',
    icon: MessageSquare,
  },
  {
    key: 'autoSchedule',
    label: 'Agendamento automático',
    desc: 'Cria publicações após aprovação sem precisar montar tudo manualmente.',
    icon: Clock,
  },
  {
    key: 'randomSchedule',
    label: 'Horários naturais',
    desc: 'Distribui posts em horários variados dentro da janela escolhida.',
    icon: Zap,
  },
  {
    key: 'notifications',
    label: 'Notificações',
    desc: 'Mostra alertas sobre aprovações, publicações e comentários importantes.',
    icon: Bell,
  },
] as const;

export default function Settings() {
  const [autoReply, setAutoReply] = useState(defaultSettings.autoReply);
  const [autoSchedule, setAutoSchedule] = useState(defaultSettings.autoSchedule);
  const [notifications, setNotifications] = useState(defaultSettings.notifications);
  const [randomSchedule, setRandomSchedule] = useState(defaultSettings.randomSchedule);
  const [purchaseKeywords, setPurchaseKeywords] = useState(defaultSettings.purchaseKeywords);
  const [postingStart, setPostingStart] = useState(defaultSettings.postingStart);
  const [postingEnd, setPostingEnd] = useState(defaultSettings.postingEnd);

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!savedSettings) return;

    try {
      const parsed = JSON.parse(savedSettings) as Partial<SettingsState>;
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

  const handleSave = () => {
    const settings: SettingsState = {
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
      <TopBar title="Configurações" subtitle="Preferências de automação e operação" />
      <div className="mobile-page-pad page-stack max-w-3xl">
        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-syne text-base font-bold text-foreground">Redes sociais e marketplaces</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  As conexões agora ficam em uma central própria, com status, teste e autorização visual.
                </p>
              </div>
            </div>
            <Button asChild className="gap-2">
              <Link to="/integrations">
                Abrir integrações
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="font-syne text-sm font-bold text-foreground">Automações</p>
            <p className="text-xs text-muted-foreground">Controle o comportamento automático da plataforma.</p>
          </div>

          <div className="divide-y divide-border">
            {automationSettings.map(({ key, label, desc, icon: Icon }) => {
              const [value, onChange] = automationState[key];

              return (
                <div key={key} className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
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
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4">
            <p className="font-syne text-sm font-bold text-foreground">Janela de postagem</p>
            <p className="text-xs text-muted-foreground">Intervalo usado para distribuir posts automáticos.</p>
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
        </section>

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-4">
            <p className="font-syne text-sm font-bold text-foreground">Palavras-chave de compra</p>
            <p className="text-xs text-muted-foreground">
              Comentários com essas frases entram no fluxo de resposta automática.
            </p>
          </div>
          <Label className="mb-1 block text-xs text-muted-foreground">Separadas por vírgula</Label>
          <Input value={purchaseKeywords} onChange={(event) => setPurchaseKeywords(event.target.value)} className="text-sm" />
        </section>

        <Button onClick={handleSave} className="w-full">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
