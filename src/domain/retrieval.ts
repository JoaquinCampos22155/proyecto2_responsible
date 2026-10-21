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
    "the and for what in on to is are a an of about happened que qué los las el la un una unos unas de del con por para como cómo cual cuál hay es son sobre en al se me mi mis tus sus esta este estas estos noticias noticia news hoy today debo puedo deberia paso ocurrio ocurre sucedio cuentame explicame explica quiero aprender entender saber hablame trata recomiendas tienes tienen puedes otra otro otras otros ahora",
  ),
);
const briefingWords = new Set(
  tokens(
    "noticias noticia reportes reporte titulares novedades actualidad news briefing resumen resumir dame dar dime mostrar muestra cuentame leer leo lectura debo deberia puedo recomiendame recomienda recomiendas recomendarias recomendar recomendaciones importantes principales recientes ultima ultimas ultimo ultimos hoy today daily quiero necesito ver informacion",
  ),
);
const briefingMarkers = new Set(
  tokens(
    "noticias noticia reportes reporte titulares novedades actualidad news briefing resumen",
  ),
);

// Only a topic-free news request can fall back to the personalized feed.
// Specific unanswered questions (for example, news about volcanoes) must stay empty.
export function isGeneralNewsQuestion(query: string): boolean {
  const words = tokens(query);
  return (
    words.some((word) => briefingMarkers.has(word)) &&
    words.every(
      (word) =>
        stopwords.has(word) || briefingWords.has(word) || /^\d+$/.test(word),
    )
  );
}

export interface ChatTurn {
  question: string;
  articleIds: string[];
}

export function refersToOpenArticle(query: string): boolean {
  const value = tokens(query).join(" ");
  return /\b(?:esta|este)\s+(?:noticia|reporte|articulo)\b|\b(?:noticia|reporte|articulo)\s+(?:abiert[oa]|actual|que estoy leyendo)\b/.test(
    value,
  );
}

// Follow-ups may reuse IDs, but never reuse client-supplied article content.
// A named new subject such as "y sobre volcanes" must start a new search.
export function isFollowUpQuestion(query: string): boolean {
  const value = tokens(query).join(" ");
  if (
    /\b(?:sobre|acerca de)\s+(?!(?:esa|ese|esta|este|la noticia|el reporte)\b)/.test(
      value,
    )
  )
    return false;
  return /\b(?:esa|ese|esta|este|dicha|dicho|la|el)\s+(?:noticia|reporte|articulo|historia|tema|ejercicio)\b|\b(?:eso|ello|lo anterior|que fuentes|cuales fuentes|sus fuentes|sus consecuencias|de que (?:se )?trata|hablame mas|explicame mas|explicalo|dime mas|que mas|por que|cuanto costo|quienes participaron|cuando ocurrio|donde ocurrio|que significa|profundiza|continua|resumela|resumelo|resumirla|resumirlo)\b|^(?:dame un resumen|un resumen|resume|resumen|resumir|cuentame mas|cuales son los puntos principales)$/.test(
    value,
  );
}

function stem(word: string): string {
  return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}

// Bounded edit distance tolerates minor misspellings; short words stay exact.
function matches(left: string, right: string): boolean {
  const a = stem(left),
    b = stem(right);
  if (a === b) return true;
  const budget = Math.min(a.length, b.length) >= 9 ? 2 : 1;
  if (
    Math.min(a.length, b.length) < 5 ||
    Math.abs(a.length - b.length) > budget
  )
    return false;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1]! + 1,
        row[j]! + 1,
        row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    if (Math.min(...next) > budget) return false;
    row = next;
  }
  return row[b.length]! <= budget;
}

function contains(words: Set<string>, word: string): boolean {
  return (
    words.has(word) || [...words].some((candidate) => matches(word, candidate))
  );
}

function textMatchesTopic(topic: string, text: Set<string>): boolean {
  // "Tiempo" may mean travel time, not weather; only use it in the question.
  return topicAliases[topic]!.some(
    (alias) => alias !== "tiempo" && contains(text, alias),
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
  body: string;
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
      .filter(([, aliases]) =>
        words.some((word) => aliases.some((alias) => matches(word, alias))),
      )
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
          (topic) => topics.has(topic) || textMatchesTopic(topic, text),
        );
        const matchedWords = words.filter((word) =>
          contains(text, word),
        ).length;
        // Geographic or incidental overlap cannot answer a different topic.
        const relevant =
          queryTopics.length > 0
            ? matchesTopic
            : matchedWords > words.length * 0.5;
        const score =
          words.reduce(
            (sum, word) =>
              sum +
              (contains(title, word) ? 3 : 0) +
              (contains(text, word) ? 1 : 0),
            0,
          ) +
          queryTopics.reduce(
            (sum, topic) =>
              sum +
              (topics.has(topic) || textMatchesTopic(topic, text) ? 4 : 0),
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
    excerpt: (article.summary || article.body.slice(0, 500)).slice(0, 1500),
    body: article.body.slice(0, 6000),
    sources: article.sources,
    verificationStatus: article.verificationStatus,
  }));
}
