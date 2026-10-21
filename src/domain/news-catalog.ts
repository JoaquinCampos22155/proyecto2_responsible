import type { Article } from "./types.js";
import { retrieveContext } from "./retrieval.js";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
export const isDemoArticle = (article: Article) =>
  /^\s*\[demo\]/i.test(article.title) || article.id.startsWith("demo-");

// Catalog questions concern the available edition, not words inside articles.
// An absent demo label is not certification that an article's claims are true.
export function answerCatalogQuestion(
  articles: Article[],
  question: string,
): { answer: string; selected: Article[] } | undefined {
  const value = normalize(question);
  const descriptor = /\b(?:demo|demostracion|fictici[oa]s?|real(?:es)?)\b/;
  const request =
    /\b(?:hay|tienes|tienen|existe|existen|todas|todos|cuantas|cuantos|noticias que|noticias sin|noticias reales|reportes que|reportes sin|reportes reales)\b|\b(?:dame|quiero|recomiendame|muestrame)\s+(?:las\s+|algunas\s+)?(?:noticias|reportes)\b/;
  if (
    !descriptor.test(value) ||
    !request.test(value) ||
    !/\b(?:noticias?|reportes?|articulos?|alguna|alguno|todas|todos)\b/.test(
      value,
    )
  )
    return undefined;
  const published = articles.filter(
    (article) => article.status === "published",
  );
  const demo = published.filter(isDemoArticle);
  const unmarked = published.filter((article) => !isDemoArticle(article));
  const nonDemo =
    /\b(?:no\s+(?:sea[n]?\s+|es\s+|son\s+)?(?:demo|de demostracion|fictici[oa]s?)|sin\s+(?:ser\s+|etiqueta\s+)?demo|real(?:es)?)\b/.test(
      value,
    );
  const overview = /\b(?:todas|todos)\b/.test(value);
  if (!published.length)
    return {
      answer: "Todavía no hay noticias publicadas en esta edición.",
      selected: [],
    };
  if (!unmarked.length)
    return {
      answer: `Actualmente hay ${published.length} noticias publicadas y todas están marcadas como demo: son material ficticio de demostración. No hay noticias publicadas sin esa etiqueta.`,
      selected: [],
    };
  if (overview)
    return {
      answer: `Hay ${published.length} noticias publicadas: ${demo.length} marcadas como demo y ${unmarked.length} sin esa etiqueta. La ausencia de la etiqueta demo no certifica la veracidad de un reporte; consulta sus fuentes.`,
      selected: unmarked.slice(0, 3),
    };
  const candidates = nonDemo ? unmarked : demo;
  const generic = new Set(
    "hay alguna alguno algunas algunos noticia noticias reporte reportes articulo articulos que no sea sean es son sin ser etiqueta de del las los la el un una unos unas demo demostracion ficticio ficticia ficticios ficticias real reales tienes tienen existe existen dame quiero recomiendame muestrame por favor solo solamente unicamente cuantas cuantos mas otra otro otras otros publicadas publicados disponible disponibles en esta este edicion sobre al".split(
      " ",
    ),
  );
  const topic = (value.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => !generic.has(word))
    .join(" ");
  const matched = topic
    ? new Set(
        retrieveContext(candidates, topic, 3).map((item) => item.articleId),
      )
    : undefined;
  const selected = candidates
    .filter((article) => !matched || matched.has(article.id))
    .slice(0, 3);
  return {
    answer: selected.length
      ? `Encontré ${candidates.length === 1 ? "1 noticia" : `${candidates.length} noticias`} ${nonDemo ? "sin etiqueta demo" : "marcadas como demo"} en esta edición. ${nonDemo ? "Estos reportes no están identificados como demostraciones; consulta sus fuentes para evaluar sus afirmaciones." : "Son ejemplos ficticios, no hechos reales."}`
      : `No encontré noticias publicadas ${nonDemo ? "sin etiqueta demo" : "de demostración"}${topic ? " que coincidan con ese tema" : ""}.`,
    selected,
  };
}
