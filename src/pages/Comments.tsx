import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Copy,
  Filter,
  MessageCircle,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Tag,
  User,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import TopBar from '@/components/layout/TopBar';
import PlatformIcon from '@/components/common/PlatformIcon';
import ErrorState from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { SOCIAL_PLATFORMS } from '@/config/platforms';
import { invokeLLM } from '@/services/ai';
import { autoReplyComment, listComments } from '@/services/comments';
import type { Comment, EntityId } from '@/types/entities';

const filters = [
  { key: 'all', label: 'Todos' },
  { key: 'purchase', label: 'Compra' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'replied', label: 'Respondidos' },
  { key: 'negative', label: 'Risco' },
];

const platforms = ['all', ...SOCIAL_PLATFORMS];
const quickReplies = [
  'Claro! Vou te enviar o link do produto agora.',
  'Oi! Esse produto está disponível. Quer que eu te mande o link?',
  'Boa escolha! Me chama que eu te envio o link certinho.',
  'Temos sim. O link está disponível para compra agora.',
];
const purchaseKeywords = ['eu quero', 'quanto custa', 'comprar', 'link', 'preço', 'onde compro'];
const negativeKeywords = ['ruim', 'caro', 'não gostei', 'demora', 'problema', 'golpe'];

const getIntentScore = (comment: Comment) => {
  const text = `${comment.content || ''} ${comment.reply_content || ''}`.toLowerCase();
  let score = comment.is_purchase_intent ? 78 : 22;
  purchaseKeywords.forEach((keyword) => { if (text.includes(keyword)) score += 8; });
  negativeKeywords.forEach((keyword) => { if (text.includes(keyword)) score -= 15; });
  if (comment.auto_replied) score += 6;
  return Math.max(0, Math.min(100, score));
};

const getSentiment = (comment: Comment) => {
  const text = (comment.content || '').toLowerCase();
  if (negativeKeywords.some((keyword) => text.includes(keyword))) return 'Risco';
  if (comment.is_purchase_intent) return 'Compra';
  return 'Neutro';
};

export default function Comments() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeComment, setActiveComment] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      setComments(await listComments('-detected_at', 150));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setReplyText(activeComment?.reply_content || '');
  }, [activeComment?.id]);

  const stats = useMemo(() => ({
    total: comments.length,
    purchase: comments.filter((comment) => comment.is_purchase_intent).length,
    replied: comments.filter((comment) => comment.auto_replied).length,
    pending: comments.filter((comment) => comment.is_purchase_intent && !comment.auto_replied).length,
    risk: comments.filter((comment) => getSentiment(comment) === 'Risco').length,
  }), [comments]);

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return comments
      .filter((comment) => {
        const matchesSearch =
          !normalized ||
          comment.content?.toLowerCase().includes(normalized) ||
          comment.author?.toLowerCase().includes(normalized) ||
          comment.reply_content?.toLowerCase().includes(normalized);
        const matchesFilter =
          filter === 'all' ||
          (filter === 'purchase' && comment.is_purchase_intent) ||
          (filter === 'replied' && comment.auto_replied) ||
          (filter === 'pending' && comment.is_purchase_intent && !comment.auto_replied) ||
          (filter === 'negative' && getSentiment(comment) === 'Risco');
        const matchesPlatform = platformFilter === 'all' || comment.platform === platformFilter;
        return matchesSearch && matchesFilter && matchesPlatform;
      })
      .sort((first, second) => {
        if (sortBy === 'intent') return getIntentScore(second) - getIntentScore(first);
        if (sortBy === 'pending') return Number(first.auto_replied) - Number(second.auto_replied);
        return new Date(second.detected_at || 0).getTime() - new Date(first.detected_at || 0).getTime();
      });
  }, [comments, filter, platformFilter, search, sortBy]);

  const toggleSelected = (id: EntityId) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const markReplied = async (comment: Comment, reply = replyText) => {
    try {
      await autoReplyComment({
        comment_id: comment.id,
        reply_template: reply || 'Olá! Aqui está o link do produto: {{product_url}}',
      });
      toast.success('Comentário marcado como respondido');
      setActiveComment((current) => current?.id === comment.id ? { ...current, auto_replied: true, reply_content: reply } : current);
      load();
    } catch {
      toast.error('Não foi possível atualizar o comentário');
    }
  };

  const bulkReply = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione comentários primeiro.');
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => autoReplyComment({
        comment_id: id,
        reply_template: 'Olá! Aqui está o link do produto: {{product_url}}',
      })));
      toast.success('Respostas em massa marcadas');
      setSelectedIds([]);
      load();
    } catch {
      toast.error('Não foi possível responder em massa');
    }
  };

  const generateReply = async () => {
    if (!activeComment) return;
    try {
      const result = await invokeLLM(`Crie uma resposta curta, natural e vendedora para este comentário: "${activeComment.content}". Se houver intenção de compra, ofereça enviar o link. Evite parecer robô.`);
      setReplyText(result);
      toast.success('Resposta sugerida com IA');
    } catch {
      toast.error('Não foi possível gerar resposta');
    }
  };

  return (
    <div>
      <TopBar title="Comentários" subtitle="Central de engajamento, intenção de compra e respostas automáticas" />
      <div className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Total" value={stats.total} icon={MessageCircle} tone="primary" />
          <Metric label="Intenção" value={stats.purchase} icon={ShoppingBag} tone="warning" />
          <Metric label="Auto resposta" value={stats.replied} icon={Zap} tone="success" />
          <Metric label="Pendentes" value={stats.pending} icon={Clock} tone="destructive" />
          <Metric label="Risco" value={stats.risk} icon={AlertTriangle} tone="warning" />
        </div>

        {stats.pending > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-warning/20 bg-warning/10 p-4">
            <ShoppingBag className="mt-0.5 h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-semibold text-foreground">{stats.pending} comentário(s) com intenção de compra aguardando resposta</p>
              <p className="mt-1 text-xs text-muted-foreground">Priorize essas conversas para capturar vendas e enviar o link do produto rapidamente.</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar autor, comentário ou resposta..." className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex">
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger className="h-10 xl:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{platforms.map((platform) => <SelectItem key={platform} value={platform}>{platform === 'all' ? 'Plataformas' : platform}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 xl:w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="recent">Mais recentes</SelectItem><SelectItem value="intent">Maior intenção</SelectItem><SelectItem value="pending">Pendentes</SelectItem></SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" onClick={bulkReply}><Bot className="h-4 w-4" /> Responder selecionados</Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map(({ key, label }) => (
                <button key={key} onClick={() => setFilter(key)} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-all', filter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted')}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              {filtered.length} de {comments.length} comentários
              {selectedIds.length > 0 && <span className="font-medium text-primary">{selectedIds.length} selecionados</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <main className="space-y-3">
            {error ? (
              <ErrorState onRetry={load} />
            ) : loading ? (
              Array(5).fill(0).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />)
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card py-16">
                <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum comentário encontrado</p>
              </div>
            ) : filtered.map((comment) => (
              <CommentCard key={comment.id} comment={comment} selected={selectedIds.includes(comment.id)} onToggle={toggleSelected} onOpen={setActiveComment} onReply={markReplied} />
            ))}
          </main>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-border bg-card p-5">
              <SectionTitle icon={Tag} title="Palavras monitoradas" subtitle="Gatilhos de intenção e risco" />
              <div className="mt-4 flex flex-wrap gap-2">
                {[...purchaseKeywords, ...negativeKeywords.slice(0, 3)].map((keyword) => <span key={keyword} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{keyword}</span>)}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <SectionTitle icon={Sparkles} title="Templates rápidos" subtitle="Respostas comuns para acelerar atendimento" />
              <div className="mt-4 space-y-2">
                {quickReplies.map((reply) => (
                  <button key={reply} className="w-full rounded-xl border border-border p-3 text-left text-xs text-muted-foreground hover:bg-muted" onClick={() => navigator.clipboard.writeText(reply)}>
                    {reply}
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-5">
              <SectionTitle icon={Bot} title="Automação" subtitle="Resumo operacional" />
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Insight text={`${Math.round((stats.replied / Math.max(stats.purchase, 1)) * 100)}% das intenções de compra foram respondidas.`} />
                <Insight text={stats.risk ? `${stats.risk} comentário(s) precisam de cuidado humano.` : 'Nenhum comentário crítico detectado.'} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <Dialog open={Boolean(activeComment)} onOpenChange={(open) => !open && setActiveComment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-syne">Responder comentário</DialogTitle></DialogHeader>
          {activeComment && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-semibold text-foreground">{activeComment.author || 'Usuário'}</span>{activeComment.platform && <PlatformIcon platform={activeComment.platform} size="sm" />}</div>
                <p className="text-sm text-foreground">{activeComment.content}</p>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <div className="mb-2 flex justify-between"><Label>Resposta</Label><Button size="sm" variant="outline" className="gap-2" onClick={generateReply}><Sparkles className="h-4 w-4" /> Sugerir com IA</Button></div>
                <Textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} className="h-32" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Info label="Intenção" value={`${getIntentScore(activeComment)}%`} />
                <Info label="Sentimento" value={getSentiment(activeComment)} />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => navigator.clipboard.writeText(replyText)}><Copy className="h-4 w-4" /> Copiar</Button>
                <Button className="flex-1 gap-2" onClick={() => markReplied(activeComment)}><Send className="h-4 w-4" /> Marcar como respondido</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone = 'neutral' }: { label: string; value: number | string; icon: typeof MessageCircle; tone?: 'neutral' | 'primary' | 'success' | 'destructive' | 'warning' }) {
  const toneClass = { neutral: 'bg-muted text-muted-foreground', primary: 'bg-primary/10 text-primary', success: 'bg-success/10 text-success', destructive: 'bg-destructive/10 text-destructive', warning: 'bg-warning/10 text-warning' }[tone];
  return <div className="rounded-2xl border border-border bg-card p-4"><div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClass)}><Icon className="h-4 w-4" /></div><p className="font-syne text-2xl font-bold text-foreground">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof MessageCircle; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div><div><h3 className="font-syne text-sm font-bold text-foreground">{title}</h3><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>;
}

function CommentCard({ comment, selected, onToggle, onOpen, onReply }: { comment: Comment; selected: boolean; onToggle: (id: EntityId) => void; onOpen: (comment: Comment) => void; onReply: (comment: Comment, reply?: string) => void }) {
  const score = getIntentScore(comment);
  return (
    <div className={cn('rounded-2xl border bg-card p-4 transition-all', selected ? 'border-primary ring-2 ring-primary/15' : comment.is_purchase_intent && !comment.auto_replied ? 'border-warning/40' : 'border-border')}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onToggle(comment.id)} />
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted"><User className="h-4 w-4 text-muted-foreground" /></div>
        <button type="button" onClick={() => onOpen(comment)} className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{comment.author || 'Usuário'}</span>
            {comment.platform && <PlatformIcon platform={comment.platform} size="sm" />}
            {comment.is_purchase_intent && <Badge tone="warning" icon={ShoppingBag} label="Intenção de compra" />}
            {comment.auto_replied && <Badge tone="success" icon={Zap} label="Respondido" />}
            {getSentiment(comment) === 'Risco' && <Badge tone="destructive" icon={AlertTriangle} label="Risco" />}
          </div>
          <p className="text-sm text-foreground">{comment.content}</p>
          {comment.auto_replied && comment.reply_content && <div className="mt-3 border-l-2 border-primary/30 pl-3"><p className="mb-0.5 flex items-center gap-1 text-xs font-medium text-primary"><Zap className="h-3 w-3" /> Resposta enviada</p><p className="text-xs text-muted-foreground">{comment.reply_content}</p></div>}
          {comment.detected_at && <p className="mt-2 text-[10px] text-muted-foreground/70">{format(new Date(comment.detected_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
        </button>
        <div className="hidden w-32 sm:block"><div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Intenção</span><span>{score}%</span></div><Progress value={score} /></div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onOpen(comment)}><MessageCircle className="h-3.5 w-3.5" /> Responder</Button>
        {!comment.auto_replied && <Button size="sm" className="h-8 gap-1" onClick={() => onReply(comment)}><CheckCircle className="h-3.5 w-3.5" /> Marcar respondido</Button>}
      </div>
    </div>
  );
}

function Badge({ tone, icon: Icon, label }: { tone: 'warning' | 'success' | 'destructive'; icon: typeof ShoppingBag; label: string }) {
  const toneClass = { warning: 'bg-warning/10 text-warning border-warning/20', success: 'bg-success/10 text-success border-success/20', destructive: 'bg-destructive/10 text-destructive border-destructive/20' }[tone];
  return <span className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', toneClass)}><Icon className="h-2.5 w-2.5" /> {label}</span>;
}

function Info({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-border bg-muted/25 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-syne text-lg font-bold text-foreground">{value}</p></div>;
}

function Insight({ text }: { text: string }) {
  return <div className="rounded-xl bg-muted/35 p-3">{text}</div>;
}
