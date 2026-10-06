import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin, X } from "lucide-react";
import { useFeed, useMe } from "../api/queries";
import {
  Empty,
  ErrorState,
  Evidence,
  Loading,
  NewsImage,
} from "../components/common";
import {
  countryLabel,
  dateLabel,
  newsTitle,
  locationLabel,
  reasonLabel,
  scopeLabel,
  topicLabel,
} from "../utils/presentation";
import { useImpression } from "./useEvents";
import type { FeedItem } from "../types/domain";
export function Story({
  item,
  variant = "card",
  preview = false,
  country = "GT",
}: {
  item: FeedItem;
  variant?: "lead" | "secondary" | "card" | "compact";
  preview?: boolean;
  country?: string;
}) {
  const { article, reasons } = item;
  const ref = useImpression(article.id, !preview);
  const href = `${preview ? "/preview" : ""}/news/${article.id}`;
  return (
    <article
      ref={ref}
      className={`news-story news-story-${variant}${!article.image ? " news-story-no-image" : ""}`}
    >
      <Link
        className="news-story-photo"
        to={href}
        aria-label={`Leer: ${newsTitle(article.title)}`}
        tabIndex={-1}
      >
        <NewsImage
          image={article.image}
          title={article.title}
          lead={variant === "lead"}
          disclose={false}
        />
      </Link>
      <div className="news-story-content">
        <Link className="news-story-title" to={href}>
          <h3>{newsTitle(article.title)}</h3>
        </Link>
        <p>{article.summary}</p>
        <div className="news-story-meta">
          <span>{scopeLabel[article.scope]}</span>
          <span>{article.countries.map(countryLabel).join(" · ")}</span>
          <time dateTime={article.publishedAt ?? undefined}>
            {dateLabel(article.publishedAt)}
          </time>
        </div>
      </div>
      <footer className="news-story-footer">
        <div className="news-story-context">
          <Evidence status={article.verificationStatus} />
          {reasons[0] && (
            <span className="ranking-reason">
              {reasonLabel(reasons[0], country)}
            </span>
          )}
        </div>
      </footer>
    </article>
  );
}
type SectionLayout = "cover" | "local" | "world" | "briefs" | "interests";
function SectionStories({
  items,
  preview,
  country,
  layout = "cover",
}: {
  items: FeedItem[];
  preview: boolean;
  country: string;
  layout?: SectionLayout;
}) {
  const stacked = layout === "world";
  const showAllSupporting = stacked || layout === "briefs";
  const supporting = showAllSupporting ? items.slice(1) : items.slice(1, 3);
  return (
    <>
      <div
        className={`section-news section-layout-${layout} ${items.length === 1 ? "section-news-single" : ""}`}
      >
        <Story
          item={items[0]}
          variant="lead"
          preview={preview}
          country={country}
        />
        {items.length > 1 && (
          <div
            className={`section-secondary ${items.length === 2 ? "section-secondary-single" : ""}`}
          >
            {supporting.map((item) => (
              <Story
                item={item}
                key={item.article.id}
                variant="secondary"
                preview={preview}
                country={country}
              />
            ))}
          </div>
        )}
      </div>
      {!showAllSupporting && items.length > 3 && (
        <div className="news-grid section-more">
          {items.slice(3).map((item) => (
            <Story
              key={item.article.id}
              item={item}
              preview={preview}
              country={country}
            />
          ))}
        </div>
      )}
    </>
  );
}
const canonicalTopic = (topic: string) =>
  topic === "climate" ? "weather" : topic;
export function FeedContent({
  items,
  preview = false,
  region = "Guatemala",
  country = "GT",
  interests = [],
}: {
  items: FeedItem[];
  preview?: boolean;
  region?: string;
  country?: string;
  interests?: string[];
}) {
  const [topic, setTopic] = useState<string | null>(null);
  if (!items.length)
    return (
      <Empty title="No hay noticias publicadas">
        Vuelve cuando la redacción publique nuevos reportes.
      </Empty>
    );
  const availableTopics = [
    ...new Set(
      items.flatMap(({ article }) => article.topics.map(canonicalTopic)),
    ),
  ];
  const visible = topic
    ? items.filter(({ article }) =>
        article.topics.some((t) => canonicalTopic(t) === topic),
      )
    : items;
  const featured = visible.slice(0, 3);
  const remaining = visible.slice(3);
  const personalized = interests.length
    ? remaining
        .filter(({ article }) =>
          article.topics.some((t) => interests.includes(t)),
        )
        .slice(0, 3)
    : [];
  const personalizedIds = new Set(personalized.map((i) => i.article.id));
  const rest = remaining.filter((i) => !personalizedIds.has(i.article.id));
  const sections = [
    {
      id: "para-ti",
      layout: "interests" as const,
      title: "Según tus intereses",
      description: "Reportes relacionados con los temas que has leído.",
      items: personalized,
    },
    {
      id: "tu-pais",
      layout: "local" as const,
      title: `En ${countryLabel(country)}`,
      description: "Noticias locales y nacionales de tu país seleccionado.",
      items: rest.filter(
        ({ article }) =>
          article.scope !== "international" &&
          article.countries.includes(country),
      ),
    },
    {
      id: "mundo",
      layout: "world" as const,
      title: "Internacional",
      description: "Reportes de distintas regiones del mundo.",
      items: rest.filter(({ article }) => article.scope === "international"),
    },
    {
      id: "otras-regiones",
      layout: "briefs" as const,
      title: "Otras regiones",
      description: "Más noticias para ampliar tu lectura.",
      items: rest.filter(
        ({ article }) =>
          article.scope !== "international" &&
          !article.countries.includes(country),
      ),
    },
  ].filter((s) => s.items.length);
  return (
    <div className="feed-content">
      <div className="feed-heading">
        <h1>
          Noticias<span className="red-dot">.</span>
        </h1>
        {items.every(({ article }) => article.id.startsWith("demo-")) && (
          <span className="edition-note">
            Edición de muestra · Noticias e imágenes ilustrativas
          </span>
        )}
        <Link className="region-control" to={preview ? "/login" : "/location"}>
          <MapPin size={16} />
          {region}
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="feed-toolbar">
        <nav className="edition-navigation" aria-label="Secciones de noticias">
          <a href="#destacadas">Destacadas</a>
          {sections.map((s) => (
            <a href={`#${s.id}`} key={s.id}>
              {s.title}
            </a>
          ))}
        </nav>
        <div className="topic-navigation">
          <label htmlFor="feed-topic">Filtrar por tema</label>
          <select
            id="feed-topic"
            value={topic ?? ""}
            onChange={(e) => setTopic(e.target.value || null)}
          >
            <option value="">Todos los temas</option>
            {availableTopics.map((t) => (
              <option value={t} key={t}>
                {topicLabel(t)}
              </option>
            ))}
          </select>
          {topic && (
            <button className="text-button" onClick={() => setTopic(null)}>
              <X size={15} />
              Quitar filtro
            </button>
          )}
          <span>
            {visible.length} {visible.length === 1 ? "noticia" : "noticias"}
          </span>
        </div>
      </div>
      <section
        className="news-section featured-section"
        id="destacadas"
        aria-labelledby="featured-heading"
      >
        <div className="news-section-heading">
          <h2 id="featured-heading">
            {topic ? topicLabel(topic) : "Destacadas"}
          </h2>
        </div>
        {featured.length ? (
          <SectionStories
            items={featured}
            preview={preview}
            country={country}
          />
        ) : (
          <Empty title="No hay noticias con este tema">
            Selecciona otro tema o quita el filtro.
          </Empty>
        )}
      </section>
      {sections.map((section) => (
        <section
          className="news-section"
          id={section.id}
          key={section.id}
          aria-labelledby={`${section.id}-heading`}
        >
          <div className="news-section-heading">
            <h2 id={`${section.id}-heading`}>{section.title}</h2>
          </div>
          <SectionStories
            items={section.items}
            preview={preview}
            country={country}
            layout={section.layout}
          />
        </section>
      ))}
    </div>
  );
}
export function Feed() {
  const query = useFeed(),
    profile = useMe();
  if (query.isPending) return <Loading label="Cargando noticias…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const interests = Object.entries(profile.data?.interestWeights ?? {})
    .filter(([, weight]) => weight > 0)
    .map(([topic]) => topic);
  return (
    <FeedContent
      items={query.data.items}
      region={locationLabel(profile.data?.simulatedLocation)}
      country={profile.data?.simulatedLocation.country ?? "GT"}
      interests={interests}
    />
  );
}
