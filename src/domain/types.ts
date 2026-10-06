export type Scope = "local" | "national" | "international";
export type VerificationStatus =
  | "unverified"
  | "single_source"
  | "corroborated"
  | "developing"
  | "conflicting_sources";
export type ArticleStatus = "draft" | "published" | "archived";
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
  action: "create" | "edit" | "assess" | "publish" | "archive";
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
