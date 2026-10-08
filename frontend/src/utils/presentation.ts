import type { VerificationStatus } from "../types/domain";
export const evidence: Record<
  VerificationStatus,
  { label: string; description: string }
> = {
  unverified: {
    label: "Sin evaluar",
    description: "La evidencia disponible aún no ha sido evaluada.",
  },
  single_source: {
    label: "Un solo origen",
    description: "La información procede de un único origen de reporte.",
  },
  corroborated: {
    label: "Fuentes coincidentes",
    description:
      "Varios orígenes independientes apoyan el reporte. No es una garantía de veracidad.",
  },
  developing: {
    label: "En desarrollo",
    description: "La información puede cambiar conforme avanza el reporte.",
  },
  conflicting_sources: {
    label: "Versiones en conflicto",
    description: "Las fuentes disponibles discrepan en aspectos importantes.",
  },
};
export const topics: Record<string, string> = {
  environment: "Medioambiente",
  community: "Comunidad",
  education: "Educación",
  culture: "Cultura",
  technology: "Tecnología",
  transport: "Movilidad",
  science: "Ciencia",
  health: "Salud",
  energy: "Energía",
  weather: "Clima",
  climate: "Clima",
  art: "Arte",
  sports: "Deportes",
  politics: "Política",
};
export const topicLabel = (topic: string) => topics[topic] ?? topic;
export const scopeLabel = {
  local: "Local",
  national: "Nacional",
  international: "Internacional",
};
export const statusLabel = {
  draft: "Borrador",
  pending_review: "En revisión",
  published: "Publicada",
  archived: "Archivada",
};
export const countryLabel = (country: string) =>
  ({ GT: "Guatemala", US: "Estados Unidos", MX: "México", ES: "España" })[
    country
  ] ?? country;
export function reasonLabel(reason: string, country = "GT") {
  if (/region/i.test(reason)) return "Cerca de tu región";
  if (/country/i.test(reason)) return countryLabel(country);
  if (/editorial/i.test(reason)) return "Prioridad editorial";
  if (/interest|topic/i.test(reason)) {
    const topic = reason.split(" ").at(-1) ?? "";
    return `Afinidad con ${topicLabel(topic).toLowerCase()}`;
  }
  if (/recent|fresh/i.test(reason)) return "Reporte reciente";
  if (/divers/i.test(reason)) return "Otra perspectiva para tu lectura";
  return reason;
}
export function imageLabels(image: {
  generatedByAI: boolean;
  alteredByAI: boolean;
  provider: string;
}) {
  const labels: string[] = [];
  if (image.generatedByAI) labels.push("Imagen generada con IA");
  if (image.alteredByAI) labels.push("Imagen alterada con IA");
  if (/pexels|stock/i.test(image.provider)) labels.push("Imagen ilustrativa");
  return labels;
}
export function dateLabel(date: string | null) {
  return date
    ? new Intl.DateTimeFormat("es-GT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date))
    : "Sin publicar";
}
export const money = (value: number) =>
  new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
export const locationLabel = (location?: {
  country: string;
  region?: string;
}) =>
  location?.region === "US-NY"
    ? "Nueva York"
    : location?.region === "GT-GU"
      ? "Ciudad de Guatemala"
      : ({ GT: "Guatemala", US: "Estados Unidos", MX: "México", ES: "España" }[
          location?.country ?? "GT"
        ] ??
        location?.country ??
        "Guatemala");
export function safeUrl(url: string | undefined | null) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}
export const newsTitle = (title: string) => title.replace(/^\[DEMO\]\s*/i, "");
