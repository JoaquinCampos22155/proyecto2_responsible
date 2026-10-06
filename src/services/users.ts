import { randomUUID } from "node:crypto";
import { updateInterests } from "../domain/interests.js";
import type { UserProfile } from "../domain/types.js";
import { eventInput, locationInput } from "../domain/validation.js";
import type { Repository } from "../repository/repository.js";
import { AppError } from "./errors.js";
export class UserService {
  constructor(
    private repo: Repository,
    private now: () => string,
  ) {}
  async getOrCreate(identity: {
    uid: string;
    name: string | null;
    email: string | null;
    picture: string | null;
  }): Promise<UserProfile> {
    const existing = await this.repo.getUser(identity.uid);
    if (existing) return existing;
    const profile: UserProfile = {
      uid: identity.uid,
      displayName: identity.name,
      email: identity.email,
      photoURL: identity.picture,
      simulatedLocation: { country: "GT" },
      interestWeights: {},
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    await this.repo.saveUser(profile);
    return profile;
  }
  async setLocation(uid: string, input: unknown): Promise<UserProfile> {
    const location = locationInput.parse(input);
    const profile = await this.repo.getUser(uid);
    if (!profile)
      throw new AppError("NOT_FOUND", "User profile not found", 404);
    const updated = {
      ...profile,
      simulatedLocation: location,
      updatedAt: this.now(),
    };
    await this.repo.saveUser(updated);
    return updated;
  }
  async recordEvent(
    uid: string,
    input: unknown,
  ): Promise<{ profile: UserProfile }> {
    const event = eventInput.parse(input);
    const profile = await this.repo.getUser(uid);
    if (!profile)
      throw new AppError("NOT_FOUND", "User profile not found", 404);
    const article = await this.repo.getArticle(event.articleId);
    if (!article || article.status !== "published")
      throw new AppError("NOT_FOUND", "Article not found", 404);
    const topics =
      event.type === "topic_interaction" && event.topic
        ? [event.topic]
        : article.topics;
    const updated = {
      ...profile,
      interestWeights: updateInterests(
        profile.interestWeights,
        event.type,
        topics,
        event.durationSeconds,
      ),
      updatedAt: this.now(),
    };
    await this.repo.addEvent({
      ...event,
      id: randomUUID(),
      uid,
      timestamp: this.now(),
    });
    await this.repo.saveUser(updated);
    return { profile: updated };
  }
}
