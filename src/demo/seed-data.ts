import type { Article } from "../domain/types.js";
import { assessEvidence } from "../domain/evidence.js";

type Seed = {
  slug: string;
  title: string;
  summary: string;
  country: string;
  region?: string;
  scope: Article["scope"];
  topics: string[];
  editorialPriority?: Article["editorialPriority"];
  publishers: string[];
  conflicting?: boolean;
  developing?: boolean;
  image?: "stock" | "generated";
};
const stories: Seed[] = [
  {
    slug: "guatemala-river",
    title: "Limpieza comunitaria de un río en Ciudad de Guatemala",
    summary:
      "En esta demostración ficticia, un grupo de voluntarios ensaya un plan de limpieza para un río de la ciudad.",
    country: "GT",
    region: "GT-GU",
    scope: "local",
    topics: ["environment", "community"],
    publishers: [
      "Boletín Municipal de Demostración",
      "Diario Cívico de Demostración",
    ],
    image: "stock",
  },
  {
    slug: "guatemala-library",
    title: "Una biblioteca ficticia amplía sus horarios de lectura",
    summary:
      "Este ejemplo ficticio muestra cómo una biblioteca local podría ampliar sus horarios de lectura.",
    country: "GT",
    region: "GT-GU",
    scope: "local",
    topics: ["education", "culture"],
    publishers: ["Oficina de Biblioteca de Demostración"],
  },
  {
    slug: "guatemala-schools",
    title: "Una feria escolar de ciencias se extiende por Guatemala",
    summary:
      "En este ejercicio ficticio, equipos de estudiantes preparan exposiciones científicas en distintas regiones de Guatemala.",
    country: "GT",
    scope: "national",
    topics: ["education", "technology"],
    publishers: [
      "Oficina de Educación de Demostración",
      "Gaceta Estudiantil de Demostración",
    ],
    editorialPriority: "high",
  },
  {
    slug: "guatemala-transit",
    title: "Un taller de transporte ensaya una nueva ruta",
    summary:
      "Un taller ficticio de planificación compara los tiempos de viaje de una ruta de transporte simulada.",
    country: "GT",
    scope: "national",
    topics: ["transport"],
    publishers: ["Oficina de Transporte de Demostración"],
    developing: true,
  },
  {
    slug: "new-york-garden",
    title: "Jornada de jardinería vecinal en Nueva York",
    summary:
      "En esta demostración ficticia, vecinos de Nueva York organizan una jornada en un jardín comunitario.",
    country: "US",
    region: "US-NY",
    scope: "local",
    topics: ["environment", "community"],
    publishers: ["Noticias Vecinales de Demostración"],
  },
  {
    slug: "united-states-research",
    title: "Muestra universitaria de investigación en Estados Unidos",
    summary:
      "Una muestra universitaria ficticia presenta sensores diseñados por estudiantes de Estados Unidos.",
    country: "US",
    scope: "national",
    topics: ["technology", "education"],
    publishers: [
      "Boletín Universitario de Demostración",
      "Redacción Científica de Demostración",
    ],
  },
  {
    slug: "mexico-cultural",
    title: "México acoge un intercambio cultural ficticio",
    summary:
      "Un programa ficticio reúne a clubes de arte de distintas ciudades de México.",
    country: "MX",
    scope: "national",
    topics: ["culture"],
    publishers: ["Oficina de Cultura de Demostración"],
  },
  {
    slug: "spain-energy",
    title: "Comienza un reto estudiantil sobre energía en España",
    summary:
      "En este ejercicio ficticio, equipos de estudiantes en España comparan propuestas de diseño para aprovechar la energía solar.",
    country: "ES",
    scope: "national",
    topics: ["energy", "technology"],
    publishers: [
      "Revista de Energía de Demostración",
      "Editorial Universitaria de Demostración",
    ],
  },
  {
    slug: "international-weather",
    title: "Se publica un ejercicio internacional de datos meteorológicos",
    summary:
      "Un conjunto ficticio de datos meteorológicos de distintas partes del mundo ayuda a estudiantes a practicar el análisis del clima; no es un pronóstico real.",
    country: "GT",
    scope: "international",
    topics: ["science", "climate", "weather"],
    publishers: [
      "Laboratorio Global de Demostración",
      "Redacción de Investigación de Demostración",
    ],
    editorialPriority: "high",
  },
  {
    slug: "international-art",
    title: "Se anuncia un intercambio internacional de arte juvenil",
    summary:
      "Un intercambio internacional ficticio invita a estudiantes a presentar trabajos artísticos realizados en clase.",
    country: "ES",
    scope: "international",
    topics: ["culture", "education"],
    publishers: ["Red de Artes de Demostración"],
    image: "generated",
  },
  {
    slug: "international-dispute",
    title: "Dos fuentes discrepan sobre la asistencia a un evento simulado",
    summary:
      "Dos informes ficticios ofrecen estimaciones distintas de asistencia a un evento simulado; la verificación sigue abierta.",
    country: "MX",
    scope: "international",
    topics: ["community"],
    publishers: ["Fuente A de Demostración", "Fuente B de Demostración"],
    conflicting: true,
  },
  {
    slug: "international-health",
    title: "Un taller estudiantil de salud pública comparte materiales",
    summary:
      "Un taller internacional ficticio de salud pública comparte materiales de aprendizaje para estudiantes.",
    country: "US",
    scope: "international",
    topics: ["health", "education"],
    publishers: [
      "Oficina de Talleres de Demostración",
      "Editorial Universitaria de Demostración",
    ],
  },
];

export function buildSeedArticles(now = "2026-09-26T12:00:00.000Z"): Article[] {
  return stories.map((seed) => {
    const sources: Article["sources"] = seed.publishers.map(
      (publisher, sourceIndex) => ({
        name: `${publisher}: informe ficticio`,
        url: `https://example.com/demo/${seed.slug}/source-${sourceIndex + 1}`,
        publisher,
        retrievedAt: now,
        sourceType: "report",
        stance: seed.conflicting && sourceIndex === 1 ? "disputes" : "supports",
        credibilityNote:
          "Fuente ficticia creada únicamente para una demostración académica",
      }),
    );
    const image: Article["image"] = seed.image
      ? {
          url: `https://placehold.co/1200x800/png?text=DEMO+${seed.image.toUpperCase()}`,
          provider: seed.image === "stock" ? "mock-stock" : "mock-generated",
          originalUrl: seed.image === "stock" ? "https://placehold.co/" : null,
          license: "Imagen de ejemplo para la demostración",
          attribution: "Imagen ficticia para uso académico",
          generatedByAI: seed.image === "generated",
          alteredByAI: false,
          retrievedAt: now,
        }
      : null;
    return {
      id: `demo-${seed.slug}`,
      title: `[DEMO] ${seed.title}`,
      body: `${seed.summary} Todo este artículo es contenido ficticio de demostración. No describe un hecho real.`,
      summary: seed.summary,
      author: "Redacción de Demostración",
      publisher: "Demostración del Proyecto 2",
      canonicalUrl: `https://example.com/demo/${seed.slug}`,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      scope: seed.scope,
      countries: [seed.country],
      regions: seed.region ? [seed.region] : [],
      topics: seed.topics,
      editorialPriority: seed.editorialPriority ?? "normal",
      verificationStatus: assessEvidence(sources, seed.developing ?? false),
      sources,
      image,
      aiDisclosure: { assisted: false, note: null },
      status: "published",
      humanReview: { reviewedBy: "demo-seed", reviewedAt: now },
      developing: seed.developing ?? false,
    };
  });
}
