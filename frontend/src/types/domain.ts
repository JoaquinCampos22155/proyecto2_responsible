export type Scope = "local" | "national" | "international";
export type VerificationStatus =
  | "unverified"
  | "single_source"
  | "corroborated"
  | "developing"
  | "conflicting_sources";
export type ArticleStatus =
  "draft" | "pending_review" | "published" | "archived";
export type EditorialPriority = "normal" | "high";
export type SourceType =
  "news" | "wire" | "official" | "report" | "eyewitness" | "social" | "other";
export type EventType =
  | "impression"
  | "article_open"
  | "reading_time"
  | "share"
  | "topic_interaction";

export interface SourceRecord {
  name: string;
  url: string;
  publisher: string;
  retrievedAt: string;
  sourceType: SourceType;
  stance: "supports" | "disputes" | "context";
  originSource?: string;
  sourceGroup?: string;
  credibilityNote?: string;
}

export interface ImageRecord {
  url: string;
  provider: string;
  originalUrl: string | null;
  sourcePageUrl?: string;
  license: string | null;
  attribution: string | null;
  generatedByAI: boolean;
  alteredByAI: boolean;
  retrievedAt: string;
  storagePath?: string;
}

export interface Article {
  id: string;
  title: string;
  body: string;
  summary: string;
  author: string;
  publisher: string;
  canonicalUrl: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scope: Scope;
  countries: string[];
  regions: string[];
  topics: string[];
  editorialPriority: EditorialPriority;
  verificationStatus: VerificationStatus;
  sources: SourceRecord[];
  image: ImageRecord | null;
  aiDisclosure: { assisted: boolean; note: string | null };
  status: ArticleStatus;
  humanReview: { reviewedBy: string; reviewedAt: string } | null;
  developing?: boolean;
  submittedByUid?: string;
  originDate?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  simulatedLocation: { country: string; region?: string };
  interestWeights: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface UserEvent {
  id: string;
  uid: string;
  type: EventType;
  articleId: string;
  durationSeconds?: number;
  topic?: string;
  timestamp: string;
}

export interface AuditRecord {
  id: string;
  articleId: string;
  actorUid: string;
  action:
    | "create"
    | "edit"
    | "assess"
    | "publish"
    | "archive"
    | "submit"
    | "approve_submission"
    | "delete_submission";
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface UsageRecord {
  id?: string;
  provider: string;
  model: string;
  feature: "chat" | "image" | string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd: number;
  timestamp: string;
  actorUid?: string;
  correlationId?: string;
}

export type DraftInput = Pick<
  Article,
  | "title"
  | "body"
  | "canonicalUrl"
  | "scope"
  | "countries"
  | "regions"
  | "topics"
  | "editorialPriority"
> &
  Partial<
    Pick<
      Article,
      "summary" | "author" | "publisher" | "developing" | "aiDisclosure"
    >
  >;
export type SourceInput = Omit<SourceRecord, "retrievedAt"> & {
  retrievedAt?: string;
};
export type SubmissionInput = {
  submissionId: string;
  title: string;
  summary: string;
  body: string;
  originDate: string;
  scope: Scope;
  country: string;
  topics: string[];
  source: SourceInput;
  image?: ImageRecord;
  aiDisclosure?: { assisted: boolean; note: string | null };
};
export type EventInput = {
  type: EventType;
  articleId: string;
  durationSeconds?: number;
  topic?: string;
};
export type LocationInput = UserProfile["simulatedLocation"];
export type FeedItem = { article: Article; reasons: string[] };
export type GlobeResponse = {
  week: { start: string; end: string };
  countries: Record<string, { count: number; items: FeedItem[] }>;
  worldStory: FeedItem | null;
};
export type ChatResponse = {
  answer: string;
  citations: {
    articleId: string;
    title: string;
    sources: { name: string; url: string; publisher: string }[];
  }[];
  uncertainty: VerificationStatus;
  providerMode: "mock" | "gemini";
};
export type Usage = {
  totalUsd: number;
  remainingUsd: number;
  byFeature: Record<string, number>;
  byProviderModel: Record<string, number>;
};
