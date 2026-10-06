import type { Article, SourceRecord } from "./types.js";

function tokens(text: string): string[] {
  return (
    text
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

const stopwords = new Set(
  tokens(
    "the and for what in on to is are a an of about happened que qué los las el la un una unos unas de del con por para como cómo cual cuál hay es son sobre en al se me mi mis tus sus esta este estas estos noticias noticia news hoy today debo puedo deberia paso ocurrio ocurre sucedio cuentame explicame explica",
  ),
);
const briefingWords = new Set(
  tokens(
    "noticias noticia titulares novedades actualidad news briefing resumen resumir dame dar dime mostrar muestra cuentame leer leo lectura debo deberia puedo recomiendame recomienda recomiendas recomendarias recomendar recomendaciones importantes principales recientes ultima ultimas ultimo ultimos hoy today daily quiero necesito ver informacion",
  ),
);
const briefingMarkers = new Set(
  tokens(
    "noticias noticia titulares novedades actualidad news briefing resumen",
  ),
);

// Only a topic-free news request can fall back to the personalized feed.
// Specific unanswered questions (for example, news about volcanoes) must stay empty.
export function isGeneralNewsQuestion(query: string): boolean {
  const words = tokens(query);
  return (
    words.some((word) => briefingMarkers.has(word)) &&
    words.every((word) => stopwords.has(word) || briefingWords.has(word))
  );
}

const topicAliases: Record<string, string[]> = {
  weather: tokens(
    "weather climate clima climaticos climatico climatica climaticas meteorologia meteorologico meteorologica meteorologicos meteorologicas tiempo pronostico pronosticos lluvia lluvias",
  ),
  education: tokens(
    "education educacion educativo educativa escuela escuelas escolar escolares estudiante estudiantes universidad universitario universitaria",
  ),
  technology: tokens("technology tecnologia tecnologico tecnologica sensores"),
  environment: tokens(
    "environment ambiente ambiental medioambiente ecologia ecologico ecologica",
  ),
  community: tokens(
    "community comunidad comunitario comunitaria vecinos vecinal",
  ),
  culture: tokens("culture cultura cultural arte artes artistico artistica"),
  energy: tokens("energy energia energetico energetica solar"),
  transport: tokens("transport transporte transito movilidad"),
  science: tokens("science ciencia ciencias cientifico cientifica"),
  health: tokens("health salud sanitario sanitaria"),
};

export function retrieveContext(
  articles: Article[],
  query: string,
  limit: number,
): Array<{
  articleId: string;
  title: string;
  excerpt: string;
  sources: SourceRecord[];
  verificationStatus: Article["verificationStatus"];
}> {
  const capacity = Math.max(0, Math.min(limit, 3));
  const published = articles.filter(
    (article) => article.status === "published",
  );
  let selected: Article[];
  if (isGeneralNewsQuestion(query)) {
    // The caller supplies the feed order for a general briefing.
    selected = published.slice(0, capacity);
  } else {
    const words = [
      ...new Set(
        tokens(query).filter(
          (word) =>
            word.length >= 3 &&
            !stopwords.has(word) &&
            !briefingWords.has(word),
        ),
      ),
    ];
    if (words.length === 0) return [];
    const queryTopics = Object.entries(topicAliases)
      .filter(([, aliases]) => words.some((word) => aliases.includes(word)))
      .map(([topic]) => topic);
    const ranked = published
      .map((article) => {
        const title = new Set(tokens(article.title));
        const text = new Set(
          tokens(`${article.title} ${article.summary} ${article.body}`),
        );
        const topics = new Set(
          article.topics.map((topic) =>
            topic === "climate" ? "weather" : topic,
          ),
        );
        const matchesTopic = queryTopics.some(
          (topic) =>
            topics.has(topic) ||
            topicAliases[topic]!.some((alias) => text.has(alias)),
        );
        const matchedWords = words.filter((word) => text.has(word)).length;
        // Geographic or incidental overlap cannot answer a different topic.
        const relevant =
          queryTopics.length > 0
            ? matchesTopic
            : matchedWords > words.length * 0.5;
        const score =
          words.reduce(
            (sum, word) =>
              sum + (title.has(word) ? 3 : 0) + (text.has(word) ? 1 : 0),
            0,
          ) +
          queryTopics.reduce(
            (sum, topic) => sum + (topics.has(topic) ? 4 : 0),
            0,
          );
        return { article, score, relevant };
      })
      .filter(({ score, relevant }) => score > 0 && relevant)
      .sort(
        (a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id),
      );
    const highestScore = ranked[0]?.score ?? 0;
    selected = ranked
      .filter(({ score }) => score >= highestScore * 0.5)
      .slice(0, capacity)
      .map(({ article }) => article);
  }
  return selected.map((article) => ({
    articleId: article.id,
    title: article.title,
    excerpt: article.summary || article.body.slice(0, 500),
    sources: article.sources,
    verificationStatus: article.verificationStatus,
  }));
}
