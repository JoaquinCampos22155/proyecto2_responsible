import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Share2, Check, ArrowUpRight } from "lucide-react";
import { api } from "../auth/AuthProvider";
import { keys, useFeed } from "../api/queries";
import {
  ErrorState,
  Evidence,
  External,
  Loading,
  NewsImage,
} from "../components/common";
import {
  dateLabel,
  scopeLabel,
  topicLabel,
  newsTitle,
} from "../utils/presentation";
import { useEventAction } from "./EventProvider";
import { useReading } from "./useEvents";
import type { Article as ArticleType } from "../types/domain";
import { Story } from "./Feed";
export function ArticleContent({
  article,
  preview = false,
  embedded = false,
  related = [],
}: {
  article: ArticleType;
  preview?: boolean;
  embedded?: boolean;
  related?: ArticleType[];
}) {
  const sendEvent = useEventAction();
  const [shareStatus, setShareStatus] = useState("");
  useReading(article.id, !preview);
  const available = related.filter(
    (candidate, index, all) =>
      candidate.id !== article.id &&
      candidate.status === "published" &&
      all.findIndex((a) => a.id === candidate.id) === index,
  );
  const sameTopic = (candidate: ArticleType) =>
    candidate.topics.some((topic) => article.topics.includes(topic));
  const nextArticles = [
    ...available.filter(sameTopic),
    ...available.filter((candidate) => !sameTopic(candidate)),
  ].slice(0, 3);
  async function share() {
    try {
      const data = {
        title: newsTitle(article.title),
        url: window.location.href,
      };
      if (typeof navigator.share === "function") await navigator.share(data);
      else await navigator.clipboard.writeText(data.url);
      setShareStatus(
        typeof navigator.share === "function" ? "Compartida" : "Enlace copiado",
      );
      if (!preview) await sendEvent({ type: "share", articleId: article.id });
    } catch {
      setShareStatus(
        "No se compartió. Puedes copiar el enlace de la barra de direcciones.",
      );
    }
  }
  return (
    <div className="article-layout">
      {!embedded && (
        <div className="article-top">
          <Link className="text-link" to={preview ? "/preview" : "/feed"}>
            <ArrowLeft size={16} />
            Volver a la portada
          </Link>
          <button className="text-button" onClick={() => void share()}>
            {shareStatus ? <Check size={16} /> : <Share2 size={16} />}Compartir
          </button>
        </div>
      )}
      {shareStatus && (
        <p role="status" className="share-status">
          {shareStatus}
        </p>
      )}
      <header className="article-header">
        {embedded ? (
          <h2 className="embedded-title">{newsTitle(article.title)}</h2>
        ) : (
          <h1>{newsTitle(article.title)}</h1>
        )}
        <p className="article-deck">{article.summary}</p>
        <div className="article-topics">
          {article.topics.map((topic) => (
            <button
              key={topic}
              onClick={() => {
                if (!preview)
                  void sendEvent({
                    type: "topic_interaction",
                    articleId: article.id,
                    topic,
                  });
              }}
            >
              {topicLabel(topic)}
            </button>
          ))}
          <span>{scopeLabel[article.scope]}</span>
        </div>
        <div className="article-byline">
          <strong>{article.author || article.publisher}</strong>
          <span>{article.publisher}</span>
          <time dateTime={article.publishedAt ?? undefined}>
            {dateLabel(article.publishedAt)}
          </time>
        </div>
      </header>
      <NewsImage image={article.image} title={newsTitle(article.title)} lead />
      <div className="reading-grid">
        <div className="article-body">
          {article.body
            .split(/\n+/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          {article.aiDisclosure.assisted && (
            <div className="disclosure">
              <strong>Texto asistido por IA</strong>
              <p>
                {article.aiDisclosure.note ??
                  "La elaboración del texto recibió asistencia de IA. Consulta las fuentes originales."}
              </p>
            </div>
          )}
          <External href={article.canonicalUrl} className="text-link">
            Abrir publicación original
          </External>
        </div>
        <aside className="article-evidence">
          <h2>El estado del reporte</h2>
          <Evidence status={article.verificationStatus} detail />
          {article.humanReview && (
            <p className="review-note">
              Publicación con revisión humana ·{" "}
              {dateLabel(article.humanReview.reviewedAt)}
            </p>
          )}
          <h2>Fuentes y procedencia</h2>
          {article.sources.length ? (
            article.sources.map((source, index) => (
              <div className="source-entry" key={`${source.url}-${index}`}>
                <External href={source.url}>
                  <strong>{source.name}</strong>
                </External>
                <p>{source.publisher}</p>
                <span>
                  {source.stance === "supports"
                    ? "Apoya el reporte"
                    : source.stance === "disputes"
                      ? "Discrepa del reporte"
                      : "Aporta contexto"}{" "}
                  · {source.sourceType}
                </span>
                {source.originSource && <p>Origen: {source.originSource}</p>}
                {source.sourceGroup && (
                  <p>Grupo de fuentes: {source.sourceGroup}</p>
                )}
                {source.credibilityNote && <p>{source.credibilityNote}</p>}
                <small>Consultada el {dateLabel(source.retrievedAt)}</small>
              </div>
            ))
          ) : (
            <p>Aún no hay fuentes registradas.</p>
          )}
          <Link to="/about" className="text-link">
            Qué significan estas etiquetas <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
      {!embedded && (
        <section className="article-related" aria-labelledby="related-heading">
          <div className="article-related-heading">
            <h2 id="related-heading">Sigue leyendo</h2>
            <Link className="text-link" to={preview ? "/preview" : "/feed"}>
              Ver la portada <ArrowUpRight size={16} />
            </Link>
          </div>
          {nextArticles.length > 0 && (
            <div className="article-related-grid">
              {nextArticles.map((next) => (
                <Story
                  key={next.id}
                  item={{ article: next, reasons: [] }}
                  preview={preview}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
export function Article() {
  const { id = "" } = useParams();
  const feed = useFeed();
  const query = useQuery({
    queryKey: keys.article(id),
    queryFn: () => api.news(id),
  });
  if (query.isPending) return <Loading label="Abriendo la noticia…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  return (
    <ArticleContent
      key={id}
      article={query.data}
      related={feed.data?.items.map(({ article }) => article) ?? []}
    />
  );
}
