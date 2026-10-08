import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import { Evidence, External, NewsImage } from "../components/common";
import type { FeedItem } from "../types/domain";
import {
  countryLabel,
  dateLabel,
  newsTitle,
  scopeLabel,
} from "../utils/presentation";

export function ChatNewsCarousel({
  items,
  covered = false,
}: {
  items: FeedItem[];
  covered?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  if (!items.length) {
    return (
      <section
        className={`chat-news-carousel ${covered ? "is-covered" : ""}`}
        aria-label="Noticias para leer"
      >
        <div className="chat-news-empty">
          <Newspaper size={22} aria-hidden="true" />
          <p>Las noticias de esta edición aparecerán aquí.</p>
        </div>
      </section>
    );
  }

  const activeIndex = index % items.length;
  const { article } = items[activeIndex];
  const title = newsTitle(article.title);
  const paragraphs = article.body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const move = (step: number) => {
    setIndex((current) => (current + step + items.length) % items.length);
  };

  return (
    <section
      className={`chat-news-carousel ${covered ? "is-covered" : ""}`}
      aria-label="Noticias para leer mientras conversas"
    >
      <header className="chat-news-carousel-header">
        <div>
          <p>LECTURA EN PARALELO</p>
          <span>Noticias</span>
        </div>
        <div className="chat-news-carousel-controls">
          <span aria-live="polite">
            {activeIndex + 1} / {items.length}
          </span>
          <button
            type="button"
            aria-label="Noticia anterior"
            onClick={() => move(-1)}
            disabled={items.length < 2}
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Siguiente noticia"
            onClick={() => move(1)}
            disabled={items.length < 2}
          >
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      <article
        className="chat-news-card"
        key={article.id}
        onPointerDown={(event) => {
          start.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          if (!start.current) return;
          const deltaX = event.clientX - start.current.x;
          const deltaY = event.clientY - start.current.y;
          start.current = null;
          if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2)
            move(deltaX < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          start.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") move(1);
          if (event.key === "ArrowLeft") move(-1);
        }}
        tabIndex={0}
      >
        {article.image && (
          <div className="chat-news-card-image">
            <NewsImage image={article.image} title={title} lead />
          </div>
        )}
        <div className="chat-news-card-content">
          <p className="chat-news-card-meta">
            {scopeLabel[article.scope]} <span>·</span>
            {article.countries.map(countryLabel).join(" · ")} <span>·</span>
            <time dateTime={article.publishedAt ?? undefined}>
              {dateLabel(article.publishedAt)}
            </time>
          </p>
          <h2>{title}</h2>
          <p className="chat-news-card-summary">{article.summary}</p>
          <div className="chat-news-card-body">
            {paragraphs.map((paragraph, paragraphIndex) => (
              <p key={`${article.id}-${paragraphIndex}`}>{paragraph}</p>
            ))}
          </div>
          <Evidence status={article.verificationStatus} />
          {article.sources.length > 0 && (
            <details className="chat-news-card-sources">
              <summary>Fuentes de esta noticia ({article.sources.length})</summary>
              <ul>
                {article.sources.map((source) => (
                  <li key={source.url}>
                    <External href={source.url}>
                      {source.publisher || source.name}
                    </External>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </article>
    </section>
  );
}
