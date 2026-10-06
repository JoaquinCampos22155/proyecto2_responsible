import { randomUUID } from "node:crypto";
import { assessEvidence } from "../domain/evidence.js";
import type { Article, SourceRecord } from "../domain/types.js";
import { draftInput, imageInput, sourceInput } from "../domain/validation.js";
import type { Repository } from "../repository/repository.js";
import { AppError } from "./errors.js";
export class NewsService {
  constructor(
    private repo: Repository,
    private now: () => string,
  ) {}
  async createDraft(input: unknown, actorUid: string): Promise<Article> {
    const data = draftInput.parse(input);
    const timestamp = this.now();
    const article: Article = {
      ...data,
      id: randomUUID(),
      summary: data.summary ?? "",
      author: data.author ?? "",
      publisher: data.publisher ?? "",
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      sources: [],
      image: null,
      aiDisclosure: data.aiDisclosure ?? { assisted: false, note: null },
      status: "draft",
      verificationStatus: "unverified",
      humanReview: null,
      developing: data.developing ?? false,
    };
    await this.repo.saveArticle(article);
    await this.audit(article.id, actorUid, "create");
    return article;
  }
  async editDraft(
    id: string,
    input: unknown,
    actorUid: string,
  ): Promise<Article> {
    const current = await this.getDraft(id);
    const data = draftInput.partial().strict().parse(input);
    const article = { ...current, ...data, updatedAt: this.now() };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "edit");
    return article;
  }
  async addSource(
    id: string,
    input: unknown,
    actorUid: string,
  ): Promise<Article> {
    const current = await this.getDraft(id);
    const parsed = sourceInput.parse(input);
    const record: SourceRecord = {
      ...parsed,
      retrievedAt: parsed.retrievedAt ?? this.now(),
    };
    const article = {
      ...current,
      sources: [...current.sources, record],
      verificationStatus: "unverified" as const,
      updatedAt: this.now(),
    };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "edit", { field: "sources" });
    return article;
  }
  async setImage(
    id: string,
    input: unknown,
    actorUid: string,
  ): Promise<Article> {
    const current = await this.getDraft(id);
    const image = input === null ? null : imageInput.parse(input);
    const article = { ...current, image, updatedAt: this.now() };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "edit", { field: "image" });
    return article;
  }
  async assess(id: string, actorUid: string): Promise<Article> {
    const current = await this.getDraft(id);
    const article = {
      ...current,
      verificationStatus: assessEvidence(
        current.sources,
        current.developing ?? false,
      ),
      updatedAt: this.now(),
    };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "assess", {
      status: article.verificationStatus,
    });
    return article;
  }
  async publish(id: string, actorUid: string): Promise<Article> {
    const current = await this.getDraft(id);
    if (current.sources.length === 0)
      throw new AppError(
        "PRECONDITION_FAILED",
        "At least one source is required",
        409,
      );
    const timestamp = this.now();
    const article: Article = {
      ...current,
      verificationStatus: assessEvidence(
        current.sources,
        current.developing ?? false,
      ),
      status: "published",
      publishedAt: timestamp,
      updatedAt: timestamp,
      humanReview: { reviewedBy: actorUid, reviewedAt: timestamp },
    };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "publish", {
      verificationStatus: article.verificationStatus,
    });
    return article;
  }
  async archive(id: string, actorUid: string): Promise<Article> {
    const current = await this.repo.getArticle(id);
    if (!current) throw new AppError("NOT_FOUND", "Article not found", 404);
    if (current.status !== "published")
      throw new AppError(
        "PRECONDITION_FAILED",
        "Only published articles can be archived",
        409,
      );
    const article: Article = {
      ...current,
      status: "archived",
      updatedAt: this.now(),
    };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "archive");
    return article;
  }
  async getPublished(id: string): Promise<Article> {
    const article = await this.repo.getArticle(id);
    if (!article || article.status !== "published")
      throw new AppError("NOT_FOUND", "Article not found", 404);
    return article;
  }
  private async getDraft(id: string): Promise<Article> {
    const article = await this.repo.getArticle(id);
    if (!article) throw new AppError("NOT_FOUND", "Article not found", 404);
    if (article.status !== "draft")
      throw new AppError("PRECONDITION_FAILED", "Article is not a draft", 409);
    return article;
  }
  private async audit(
    articleId: string,
    actorUid: string,
    action: "create" | "edit" | "assess" | "publish" | "archive",
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.addAudit({
      id: randomUUID(),
      articleId,
      actorUid,
      action,
      timestamp: this.now(),
      ...(details ? { details } : {}),
    });
  }
}
