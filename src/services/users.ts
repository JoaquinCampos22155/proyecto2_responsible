import { randomUUID } from "node:crypto";
import { applyInterestEvent, interestAnchors } from "../domain/interests.js";
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
    if (existing) return this.anchorProfile(existing);
    const profile: UserProfile = {
      uid: identity.uid,
      displayName: identity.name,
      email: identity.email,
      photoURL: identity.picture,
      simulatedLocation: { country: "GT" },
      interestWeights: {},
      interestUpdatedAt: {},
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
      ...(await this.anchorProfile(profile)),
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
    const timestamp = this.now();
    const updated = {
      ...profile,
      ...applyInterestEvent(
        profile,
        event.type,
        topics,
        new Date(timestamp),
        event.durationSeconds,
      ),
      updatedAt: timestamp,
    };
    await this.repo.addEvent({
      ...event,
      id: randomUUID(),
      uid,
      timestamp,
    });
    await this.repo.saveUser(updated);
    return { profile: updated };
  }
  private async anchorProfile(profile: UserProfile): Promise<UserProfile> {
    const anchors = interestAnchors(profile, new Date(this.now()));
    if (
      profile.interestUpdatedAt &&
      Object.keys(anchors).length ===
        Object.keys(profile.interestUpdatedAt).length &&
      Object.entries(anchors).every(
        ([topic, at]) => profile.interestUpdatedAt?.[topic] === at,
      )
    )
      return profile;
    const updated = { ...profile, interestUpdatedAt: anchors };
    await this.repo.saveUser(updated);
    return updated;
  }
}
