import type { UsageRecord } from "../domain/types.js";
import { canSpend, summarizeUsage } from "../domain/budget.js";
import type { Repository } from "../repository/repository.js";
import { AppError } from "./errors.js";
export class UsageService {
  constructor(
    private repo: Repository,
    private budgetUsd: number,
    private now: () => string,
  ) {}
  async record(input: Omit<UsageRecord, "id" | "timestamp">): Promise<void> {
    await this.assertBudget(input.estimatedCostUsd);
    await this.repo.addUsage({ ...input, timestamp: this.now() });
  }
  async report(): Promise<{
    totalUsd: number;
    remainingUsd: number;
    byFeature: Record<string, number>;
    byProviderModel: Record<string, number>;
  }> {
    return summarizeUsage(await this.repo.listUsage(), this.budgetUsd);
  }
  async assertBudget(estimatedCostUsd: number): Promise<void> {
    if (
      !canSpend(await this.repo.listUsage(), this.budgetUsd, estimatedCostUsd)
    )
      throw new AppError("BUDGET_EXCEEDED", "AI/API budget exceeded", 429);
  }
}
