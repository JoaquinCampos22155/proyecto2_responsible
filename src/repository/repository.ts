import type {
  Article,
  AuditRecord,
  UsageRecord,
  UserEvent,
  UserProfile,
} from "../domain/types.js";

export interface Repository {
  getArticle(id: string): Promise<Article | null>;
  listArticles(): Promise<Article[]>;
  listSubmittedArticles(uid?: string): Promise<Article[]>;
  listArticlesPublishedBetween?(start: string, end: string): Promise<Article[]>;
  saveArticle(article: Article): Promise<void>;
  deleteArticle(id: string): Promise<void>;
  getUser(uid: string): Promise<UserProfile | null>;
  saveUser(user: UserProfile): Promise<void>;
  addEvent(event: UserEvent): Promise<void>;
  listEvents(uid: string): Promise<UserEvent[]>;
  addAudit(record: AuditRecord): Promise<void>;
  listAudit(): Promise<AuditRecord[]>;
  addUsage(record: UsageRecord): Promise<void>;
  listUsage(): Promise<UsageRecord[]>;
}
