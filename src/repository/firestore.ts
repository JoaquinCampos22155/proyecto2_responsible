import { randomUUID } from "node:crypto";
import type { Firestore, DocumentSnapshot } from "firebase-admin/firestore";
import type {
  Article,
  AuditRecord,
  UsageRecord,
  UserEvent,
  UserProfile,
} from "../domain/types.js";
import type { Repository } from "./repository.js";

function decode<T>(snapshot: DocumentSnapshot): T | null {
  if (!snapshot.exists) return null;
  return snapshot.data() as T;
}

export class FirestoreRepository implements Repository {
  constructor(private db: Firestore) {}
  async getArticle(id: string): Promise<Article | null> {
    return decode<Article>(await this.db.collection("news").doc(id).get());
  }
  async listArticles(): Promise<Article[]> {
    return (await this.db.collection("news").get()).docs.map(
      (doc) => doc.data() as Article,
    );
  }
  async listSubmittedArticles(uid?: string): Promise<Article[]> {
    const collection = this.db.collection("news");
    const snapshot = uid
      ? await collection.where("submittedByUid", "==", uid).get()
      : await collection.where("submittedByUid", "!=", "").get();
    return snapshot.docs
      .map((doc) => doc.data() as Article)
      .filter((article) => Boolean(article.submittedByUid));
  }
  async listArticlesPublishedBetween(
    start: string,
    end: string,
  ): Promise<Article[]> {
    return (
      await this.db
        .collection("news")
        .where("publishedAt", ">=", start)
        .where("publishedAt", "<", end)
        .get()
    ).docs.map((doc) => doc.data() as Article);
  }
  async saveArticle(article: Article): Promise<void> {
    await this.db.collection("news").doc(article.id).set(article);
  }
  async deleteArticle(id: string): Promise<void> {
    await this.db.collection("news").doc(id).delete();
  }
  async getUser(uid: string): Promise<UserProfile | null> {
    return decode<UserProfile>(
      await this.db.collection("users").doc(uid).get(),
    );
  }
  async saveUser(user: UserProfile): Promise<void> {
    await this.db.collection("users").doc(user.uid).set(user);
  }
  async addEvent(event: UserEvent): Promise<void> {
    await this.db.collection("userEvents").doc(event.id).set(event);
  }
  async listEvents(uid: string): Promise<UserEvent[]> {
    return (
      await this.db.collection("userEvents").where("uid", "==", uid).get()
    ).docs.map((doc) => doc.data() as UserEvent);
  }
  async addAudit(record: AuditRecord): Promise<void> {
    await this.db.collection("audit").doc(record.id).set(record);
  }
  async listAudit(): Promise<AuditRecord[]> {
    return (await this.db.collection("audit").get()).docs.map(
      (doc) => doc.data() as AuditRecord,
    );
  }
  async addUsage(record: UsageRecord): Promise<void> {
    await this.db
      .collection("apiUsage")
      .doc(record.id ?? randomUUID())
      .set(record);
  }
  async listUsage(): Promise<UsageRecord[]> {
    return (await this.db.collection("apiUsage").get()).docs.map(
      (doc) => doc.data() as UsageRecord,
    );
  }
}
