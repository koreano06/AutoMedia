import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { listComments } from '@/services/comments';
import { listJobs } from '@/services/jobs';
import { listMediaAssets } from '@/services/mediaAssets';
import { listPosts } from '@/services/posts';
import type { Comment, Job, MediaAsset, Post } from '@/types/entities';

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  type: 'approval' | 'comment' | 'publication' | 'job' | 'system';
  severity: 'info' | 'warning' | 'danger' | 'success';
  href?: string;
};

type OperationalCounts = {
  approvals: number;
  comments: number;
  failures: number;
  jobs: number;
  scheduled: number;
};

type NotificationContextValue = {
  counts: OperationalCounts;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

const initialCounts: OperationalCounts = {
  approvals: 0,
  comments: 0,
  failures: 0,
  jobs: 0,
  scheduled: 0,
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const asArray = <T,>(value: T[] | unknown): T[] => (Array.isArray(value) ? value : []);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<OperationalCounts>(initialCounts);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [mediaResult, commentsResult, postsResult, jobsResult] = await Promise.allSettled([
        listMediaAssets('-created_date', 100),
        listComments('-detected_at', 100),
        listPosts('-scheduled_at', 150),
        listJobs(),
      ]);

      const media = mediaResult.status === 'fulfilled' ? asArray<MediaAsset>(mediaResult.value) : [];
      const comments = commentsResult.status === 'fulfilled' ? asArray<Comment>(commentsResult.value) : [];
      const posts = postsResult.status === 'fulfilled' ? asArray<Post>(postsResult.value) : [];
      const jobs = jobsResult.status === 'fulfilled' ? asArray<Job>(jobsResult.value) : [];

      setCounts({
        approvals: media.filter((asset) => asset.status === 'pending_review').length,
        comments: comments.filter((comment) => comment.is_purchase_intent && !comment.auto_replied).length,
        failures: posts.filter((post) => post.status === 'failed').length,
        jobs: jobs.filter((job) => ['queued', 'processing'].includes(job.status)).length,
        scheduled: posts.filter((post) => post.status === 'scheduled').length,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const notifications = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];

    if (counts.approvals > 0) {
      items.push({
        id: 'approvals',
        title: `${counts.approvals} conteúdo(s) aguardando aprovação`,
        description: 'Revise vídeos e mídias antes de enviar para agendamento.',
        type: 'approval',
        severity: 'warning',
        href: '/approval',
      });
    }

    if (counts.comments > 0) {
      items.push({
        id: 'comments',
        title: `${counts.comments} comentário(s) com intenção de compra`,
        description: 'Responda rapidamente para capturar oportunidades de venda.',
        type: 'comment',
        severity: 'danger',
        href: '/comments',
      });
    }

    if (counts.failures > 0) {
      items.push({
        id: 'failures',
        title: `${counts.failures} publicação(ões) com falha`,
        description: 'Verifique erros de API, tokens e retry de publicações.',
        type: 'publication',
        severity: 'danger',
        href: '/publications',
      });
    }

    if (counts.jobs > 0) {
      items.push({
        id: 'jobs',
        title: `${counts.jobs} job(s) em andamento`,
        description: 'Acompanhe processamento de vídeos, mídia e publicações.',
        type: 'job',
        severity: 'info',
      });
    }

    return items;
  }, [counts]);

  return (
    <NotificationContext.Provider
      value={{ counts, notifications, unreadCount: notifications.length, loading, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
