import { useRef, useState, type MouseEvent, type TouchEvent } from "react";
import { ArrowLeft, ArrowRight, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeed, useMe } from "../api/queries";
import { Empty, ErrorState, Loading } from "../components/common";
import { countryLabel, locationLabel } from "../utils/presentation";
import sample from "./sample-news.json";
import type { Article, FeedItem } from "../types/domain";
import { Story } from "./Feed";

function byNewest(left: FeedItem, right: FeedItem) {
  const leftDate = Date.parse(
    left.article.publishedAt ?? left.article.createdAt,
  );
  const rightDate = Date.parse(
    right.article.publishedAt ?? right.article.createdAt,
  );
  return (
    (Number.isNaN(rightDate) ? 0 : rightDate) -
    (Number.isNaN(leftDate) ? 0 : leftDate)
  );
}

export function MyCountry({ preview = false }: { preview?: boolean }) {
  const feed = useFeed(!preview);
  const profile = useMe(!preview);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  if (!preview && (feed.isPending || profile.isPending))
    return <Loading label="Cargando las noticias de tu país…" />;
  if (!preview && (feed.error || profile.error))
    return (
      <ErrorState
        error={feed.error ?? profile.error}
        retry={() => {
          void feed.refetch();
          void profile.refetch();
        }}
      />
    );

  const country = preview
    ? "GT"
    : (profile.data?.simulatedLocation.country ?? "GT");
  const name = countryLabel(country);
  const items: FeedItem[] = preview
    ? (sample as Article[]).map((article) => ({ article, reasons: [] }))
    : (feed.data?.items ?? []);
  const stories = items
    .filter(
      ({ article }) =>
        article.scope !== "international" &&
        article.countries.includes(country),
    )
    .sort(byNewest);
  const important = stories
    .filter(({ article }) => article.editorialPriority === "high")
    .sort(byNewest);
  const otherStories = stories.filter(
    ({ article }) => article.editorialPriority !== "high",
  );
  const selectedIndex = important.length ? activeIndex % important.length : 0;
  const selected = important[selectedIndex];

  const showPrevious = () =>
    setActiveIndex(
      (index) => (index - 1 + important.length) % important.length,
    );
  const showNext = () =>
    setActiveIndex((index) => (index + 1) % important.length);
  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    }
  };
  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || important.length < 2) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2)
      return;
    if (deltaX < 0) showNext();
    else showPrevious();
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);
  };
  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  };

  return (
    <div className="feed-content my-country-page">
      <header className="feed-heading my-country-heading">
        <div>
          <p className="my-country-kicker">
            <Star size={14} aria-hidden="true" /> Tu edición personal
          </p>
          <h1>
            Mi país<span className="red-dot">.</span>
          </h1>
          <p className="my-country-subtitle">
            {`Vista de país · ubicación simulada: ${name}`}
          </p>
        </div>
        <Link to="/location" className="region-control">
          <MapPin size={16} />
          {preview
            ? locationLabel({ country })
            : locationLabel(profile.data?.simulatedLocation)}
          <span className="my-country-change">Cambiar</span>
        </Link>
      </header>

      {stories.length ? (
        <>
          <section
            className="my-country-featured"
            aria-labelledby="my-country-featured-title"
          >
            <div className="my-country-section-heading">
              <div>
                <p className="my-country-eyebrow">Prioridad de la redacción</p>
                <h2 id="my-country-featured-title">Lo más importante</h2>
              </div>
              {important.length > 0 && (
                <span className="my-country-count">
                  {important.length}{" "}
                  {important.length === 1 ? "selección" : "selecciones"}
                </span>
              )}
            </div>

            {selected ? (
              <div
                className="my-country-carousel"
                role="group"
                aria-roledescription="carrusel"
                aria-label={`Noticias con prioridad editorial de ${name}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClickCapture={handleClickCapture}
              >
                <div className="my-country-priority-badge">
                  <Star size={13} fill="currentColor" aria-hidden="true" />
                  Alta prioridad editorial
                </div>
                <Story
                  key={selected.article.id}
                  item={selected}
                  variant="lead"
                  country={country}
                  preview={preview}
                />
                {important.length > 1 && (
                  <div className="my-country-carousel-controls">
                    <button
                      type="button"
                      className="my-country-carousel-arrow"
                      onClick={showPrevious}
                      aria-label="Ver noticia destacada anterior"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div
                      className="my-country-carousel-dots"
                      aria-label="Elegir noticia"
                    >
                      {important.map((item, index) => (
                        <button
                          key={item.article.id}
                          type="button"
                          className={`my-country-carousel-dot${index === selectedIndex ? " active" : ""}`}
                          aria-label={`Ver noticia ${index + 1} de ${important.length}`}
                          aria-current={
                            index === selectedIndex ? "true" : undefined
                          }
                          onClick={() => setActiveIndex(index)}
                        />
                      ))}
                    </div>
                    <span
                      className="my-country-carousel-position"
                      aria-live="polite"
                    >
                      {selectedIndex + 1} / {important.length}
                    </span>
                    <button
                      type="button"
                      className="my-country-carousel-arrow"
                      onClick={showNext}
                      aria-label="Ver siguiente noticia destacada"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="my-country-no-priority" role="status">
                <Star size={19} aria-hidden="true" />
                <p>
                  La redacción aún no ha marcado noticias con prioridad alta
                  para {name}.
                </p>
              </div>
            )}
          </section>

          {otherStories.length > 0 && (
            <section
              className="my-country-more"
              aria-labelledby="my-country-more-title"
            >
              <div className="news-section-heading">
                <h2 id="my-country-more-title">Más noticias del país</h2>
                <span>{otherStories.length}</span>
              </div>
              <div className="my-country-news-list">
                {otherStories.map((item) => (
                  <Story
                    key={item.article.id}
                    item={item}
                    variant="compact"
                    country={country}
                    preview={preview}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <Empty title={`Aún no hay noticias de ${name}`}>
          Cuando se publiquen reportes locales o nacionales, aparecerán aquí.
        </Empty>
      )}
    </div>
  );
}
