import type { UsageRecord } from "./types.js";
export function summarizeUsage(
  records: UsageRecord[],
  budgetUsd: number,
): {
  totalUsd: number;
  remainingUsd: number;
  byFeature: Record<string, number>;
  byProviderModel: Record<string, number>;
} {
  const byFeature: Record<string, number> = {};
  const byProviderModel: Record<string, number> = {};
  let totalUsd = 0;
  for (const record of records) {
    totalUsd += record.estimatedCostUsd;
    byFeature[record.feature] =
      (byFeature[record.feature] ?? 0) + record.estimatedCostUsd;
    const key = `${record.provider}/${record.model}`;
    byProviderModel[key] =
      (byProviderModel[key] ?? 0) + record.estimatedCostUsd;
  }
  return {
    totalUsd: round(totalUsd),
    remainingUsd: round(Math.max(0, budgetUsd - totalUsd)),
    byFeature,
    byProviderModel,
  };
}
export function canSpend(
  records: UsageRecord[],
  budgetUsd: number,
  estimatedCostUsd: number,
): boolean {
  return (
    estimatedCostUsd >= 0 &&
    summarizeUsage(records, budgetUsd).totalUsd + estimatedCostUsd <= budgetUsd
  );
}
function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
