import { randomUUID } from "node:crypto";
import { assessEvidence } from "../domain/evidence.js";
import type { Article, SourceRecord } from "../domain/types.js";
import {
  draftInput,
  imageInput,
  sourceInput,
  submissionInput,
} from "../domain/validation.js";
import type { Repository } from "../repository/repository.js";
import { AppError } from "./errors.js";
export class NewsService {
  constructor(
    private repo: Repository,
    private now: () => string,
    private deleteStoredImage?: (path: string) => Promise<void>,
  ) {}
  async submit(
    input: unknown,
    actor: { uid: string; name: string | null },
  ): Promise<Article> {
    const data = submissionInput.parse(input);
    if (await this.repo.getArticle(data.submissionId))
      throw new AppError(
        "CONFLICT",
        "Este envío ya existe. Vuelve a intentarlo.",
        409,
      );
    const timestamp = this.now();
    const todayInGuatemala = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
    }).format(new Date(timestamp));
    if (data.originDate > todayInGuatemala)
      throw new AppError(
        "INVALID_INPUT",
        "La fecha de origen no puede ser futura.",
        400,
      );
    const source = sourceInput.parse(data.source);
    const image = data.image ? imageInput.parse(data.image) : null;
    if (image)
      this.assertOwnedSubmissionImage(image, actor.uid, data.submissionId);
    const article: Article = {
      id: data.submissionId,
      title: data.title,
      body: data.body,
      summary: data.summary,
      author: actor.name ?? "Reportero de la comunidad",
      publisher: source.publisher,
      canonicalUrl: source.url,
      publishedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      originDate: data.originDate,
      scope: data.scope,
      countries: [data.country],
      regions: [],
      topics: data.topics,
      editorialPriority: "normal",
      verificationStatus: "unverified",
      sources: [{ ...source, retrievedAt: source.retrievedAt ?? timestamp }],
      image,
      aiDisclosure: data.aiDisclosure ?? { assisted: false, note: null },
      status: "pending_review",
      humanReview: null,
      submittedByUid: actor.uid,
    };
    await this.repo.saveArticle(article);
    await this.audit(article.id, actor.uid, "submit");
    return article;
  }
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
  async approveSubmission(
    id: string,
    actorUid: string,
    editorialPriority: "normal" | "high",
  ): Promise<Article> {
    const current = await this.repo.getArticle(id);
    if (!current || !current.submittedByUid)
      throw new AppError("NOT_FOUND", "Community report not found", 404);
    if (current.status !== "pending_review")
      throw new AppError(
        "PRECONDITION_FAILED",
        "Only reports awaiting review can be approved",
        409,
      );
    if (!current.originDate || current.sources.length === 0)
      throw new AppError(
        "PRECONDITION_FAILED",
        "The report needs an origin date and at least one source",
        409,
      );
    const timestamp = this.now();
    // Weekly editions and the globe follow the report's origin date, not its review date.
    const publishedAt = new Date(
      `${current.originDate}T06:00:00.000Z`,
    ).toISOString();
    const article: Article = {
      ...current,
      verificationStatus: assessEvidence(
        current.sources,
        current.developing ?? false,
      ),
      editorialPriority,
      status: "published",
      publishedAt,
      updatedAt: timestamp,
      humanReview: { reviewedBy: actorUid, reviewedAt: timestamp },
    };
    await this.repo.saveArticle(article);
    await this.audit(id, actorUid, "approve_submission", {
      editorialPriority,
      originDate: current.originDate,
    });
    return article;
  }
  async deleteSubmission(id: string, actorUid: string): Promise<void> {
    const current = await this.repo.getArticle(id);
    if (!current || !current.submittedByUid)
      throw new AppError("NOT_FOUND", "Community report not found", 404);
    if (current.image?.storagePath) {
      if (!this.deleteStoredImage)
        throw new AppError(
          "STORAGE_UNAVAILABLE",
          "Image storage is not configured; the report was not deleted.",
          503,
        );
      await this.deleteStoredImage(current.image.storagePath);
    }
    await this.audit(id, actorUid, "delete_submission", {
      status: current.status,
      title: current.title,
    });
    await this.repo.deleteArticle(id);
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
  private assertOwnedSubmissionImage(
    image: NonNullable<Article["image"]>,
    uid: string,
    submissionId: string,
  ): void {
    const path = image.storagePath;
    const validPath = path?.match(
      /^user-submissions\/([^/]+)\/([0-9a-f-]{36})\/image\.(jpg|png|webp)$/i,
    );
    if (
      !path ||
      !validPath ||
      validPath[1] !== uid ||
      validPath[2] !== submissionId
    )
      throw new AppError(
        "INVALID_INPUT",
        "La imagen debe pertenecer a tu cuenta y usar un formato permitido.",
        400,
      );
    let urlPath: string;
    try {
      const url = new URL(image.url);
      const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/);
      if (url.hostname !== "firebasestorage.googleapis.com" || !match)
        throw new Error("Invalid Firebase Storage URL");
      urlPath = decodeURIComponent(match[1]!);
    } catch {
      throw new AppError(
        "INVALID_INPUT",
        "La imagen debe ser un archivo de Firebase Storage.",
        400,
      );
    }
    if (urlPath !== path || image.provider !== "firebase-storage")
      throw new AppError(
        "INVALID_INPUT",
        "La URL y la ruta de la imagen no coinciden.",
        400,
      );
  }
  private async audit(
    articleId: string,
    actorUid: string,
    action:
      | "create"
      | "edit"
      | "assess"
      | "publish"
      | "archive"
      | "submit"
      | "approve_submission"
      | "delete_submission",
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
