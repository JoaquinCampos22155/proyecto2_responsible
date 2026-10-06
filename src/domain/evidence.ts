import type { SourceRecord, VerificationStatus } from "./types.js";

function independentSupportingOrigins(sources: SourceRecord[]): number {
  const supporting = sources.filter((source) => source.stance === "supports");
  const parent = supporting.map((_, index) => index);
  const find = (index: number): number => {
    const current = parent[index];
    if (current === undefined || current === index) return index;
    const root = find(current);
    parent[index] = root;
    return root;
  };
  const seen = new Map<string, number>();
  supporting.forEach((source, index) => {
    const normalize = (value: string) => value.trim().toLowerCase();
    const identities = [
      `publisher:${normalize(source.publisher)}`,
      ...(source.originSource
        ? [`publisher:${normalize(source.originSource)}`]
        : []),
      ...(source.sourceGroup ? [`group:${normalize(source.sourceGroup)}`] : []),
    ];
    for (const identity of identities) {
      const previous = seen.get(identity);
      if (previous === undefined) seen.set(identity, index);
      else parent[find(index)] = find(previous);
    }
  });
  return new Set(supporting.map((_, index) => find(index))).size;
}

export function assessEvidence(
  sources: SourceRecord[],
  developing: boolean,
): VerificationStatus {
  if (sources.length === 0) return "unverified";
  const supporting = sources.filter((source) => source.stance === "supports");
  const disputing = sources.filter((source) => source.stance === "disputes");
  if (supporting.length > 0 && disputing.length > 0)
    return "conflicting_sources";
  if (developing) return "developing";
  if (independentSupportingOrigins(sources) >= 2) return "corroborated";
  return "single_source";
}
