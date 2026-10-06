import type {
  Article,
  AuditRecord,
  UsageRecord,
  UserEvent,
  UserProfile,
} from "../domain/types.js";
import type { Repository } from "./repository.js";

export class MemoryRepository implements Repository {
  private articles = new Map<string, Article>();
  private users = new Map<string, UserProfile>();
  private events: UserEvent[] = [];
  private audit: AuditRecord[] = [];
  private usage: UsageRecord[] = [];
  constructor(articles: Article[] = []) {
    for (const article of articles)
      this.articles.set(article.id, structuredClone(article));
  }
  async getArticle(id: string): Promise<Article | null> {
    return structuredClone(this.articles.get(id) ?? null);
  }
  async listArticles(): Promise<Article[]> {
    return structuredClone([...this.articles.values()]);
  }
  async saveArticle(article: Article): Promise<void> {
    this.articles.set(article.id, structuredClone(article));
  }
  async getUser(uid: string): Promise<UserProfile | null> {
    return structuredClone(this.users.get(uid) ?? null);
  }
  async saveUser(user: UserProfile): Promise<void> {
    this.users.set(user.uid, structuredClone(user));
  }
  async addEvent(event: UserEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }
  async listEvents(uid: string): Promise<UserEvent[]> {
    return structuredClone(this.events.filter((event) => event.uid === uid));
  }
  async addAudit(record: AuditRecord): Promise<void> {
    this.audit.push(structuredClone(record));
  }
  async listAudit(): Promise<AuditRecord[]> {
    return structuredClone(this.audit);
  }
  async addUsage(record: UsageRecord): Promise<void> {
    this.usage.push(structuredClone(record));
  }
  async listUsage(): Promise<UsageRecord[]> {
    return structuredClone(this.usage);
  }
}
