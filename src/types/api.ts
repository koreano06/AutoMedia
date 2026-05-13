import type {
  AutomationSettings,
  Comment,
  EntityId,
  Job,
  MediaAsset,
  Platform,
  PlatformAccount,
  Post,
  Product,
} from '@/types/entities';

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductCreateRequest = {
  name?: string;
  source_url?: string;
  image_url?: string;
  category?: string;
  description?: string;
  brand?: string;
  price?: number;
};

export type ProductAnalyzeRequest = {
  product_id?: EntityId;
  source_url?: string;
  image_asset_id?: EntityId;
};

export type ProductAnalyzeResponse = {
  product: Product;
  job: Job;
};

export type MediaCollectRequest = {
  product_id: EntityId;
  query?: string;
  sources?: Array<'web' | 'youtube' | 'marketplaces' | 'manual'>;
};

export type MediaCollectResponse = {
  job: Job;
};

export type VideoGenerateRequest = {
  product_id: EntityId;
  media_asset_ids?: EntityId[];
  style: 'product' | 'lifestyle' | 'unboxing' | 'review';
  duration: '15s' | '30s' | '60s';
  briefing?: string;
};

export type VideoGenerateResponse = {
  job: Job;
};

export type ApproveMediaRequest = {
  media_asset_id: EntityId;
  platforms: Platform[];
  caption: string;
};

export type SchedulePostRequest = {
  media_asset_id: EntityId;
  platforms: Platform[];
  caption: string;
  schedule_mode: 'now' | 'scheduled' | 'random_window';
  scheduled_at?: string;
};

export type CommentAutoReplyRequest = {
  comment_id: EntityId;
  product_id: EntityId;
  reply_template?: string;
};

export type UploadResponse = {
  asset: MediaAsset;
};

export type ApiContract = {
  products: {
    list: PaginatedResponse<Product>;
    create: Product;
    analyze: ProductAnalyzeResponse;
  };
  media: {
    list: PaginatedResponse<MediaAsset>;
    collect: MediaCollectResponse;
    upload: UploadResponse;
  };
  videos: {
    generate: VideoGenerateResponse;
  };
  posts: {
    list: PaginatedResponse<Post>;
    schedule: Post[];
  };
  comments: {
    list: PaginatedResponse<Comment>;
    autoReply: Comment;
  };
  platforms: {
    accounts: PlatformAccount[];
    connectUrl: { url: string };
  };
  settings: {
    current: AutomationSettings;
  };
};
