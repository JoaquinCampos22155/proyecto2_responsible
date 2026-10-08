import { useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, LayoutGrid, Plus, ShieldCheck, UserRound } from "lucide-react";
import { useMe, useMySubmissions } from "../api/queries";
import { useAuth } from "../auth/AuthProvider";
import { Empty, ErrorState, Loading, NewsImage } from "../components/common";
import { dateLabel, locationLabel, newsTitle } from "../utils/presentation";
import demoNews from "./sample-news.json";
import type { Article } from "../types/domain";

type ProfileStory = {
  article: Article;
  status: "published" | "review" | "archived";
};
type StoryFilter = "all" | "review";

const previewStatuses: Record<string, ProfileStory["status"]> = {
  "demo-guatemala-river": "published",
  "demo-guatemala-library": "published",
  "demo-guatemala-schools": "published",
  "demo-guatemala-transit": "published",
  "demo-international-weather": "review",
  "demo-international-art": "review",
};

const previewStories: ProfileStory[] = (demoNews as Article[])
  .filter((article) => article.id in previewStatuses)
  .map((article) => ({ article, status: previewStatuses[article.id] }));

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "P"
  );
}

function ProfileStoryCard({
  story,
  preview,
}: {
  story: ProfileStory;
  preview: boolean;
}) {
  const title = newsTitle(story.article.title);
  const href = `${preview ? "/preview" : ""}/news/${story.article.id}`;
  const image = (
    <>
      <NewsImage
        image={story.article.image}
        title={story.article.title}
        disclose={false}
      />
      {story.status === "review" && (
        <span className="profile-review-badge">
          <Clock3 size={12} aria-hidden="true" /> En revisión
        </span>
      )}
    </>
  );
  return (
    <article className="profile-story-card">
      {story.status === "published" ? (
        <Link
          className="profile-story-image"
          to={href}
          aria-label={`Abrir noticia: ${title}`}
        >
          {image}
        </Link>
      ) : (
        <div
          className="profile-story-image"
          aria-label={`${title}, en revisión`}
        >
          {image}
        </div>
      )}
      {story.status === "published" ? (
        <Link className="profile-story-title" to={href}>
          <h2>{title}</h2>
        </Link>
      ) : (
        <div className="profile-story-title">
          <h2>{title}</h2>
        </div>
      )}
      <div className="profile-story-meta">
        <span>
          {story.status === "review"
            ? "En revisión"
            : story.status === "archived"
              ? "Archivada"
              : "Publicada"}
        </span>
        <time
          dateTime={
            story.article.originDate ?? story.article.publishedAt ?? undefined
          }
        >
          {dateLabel(
            story.article.originDate
              ? `${story.article.originDate}T12:00:00`
              : story.article.publishedAt,
          )}
        </time>
      </div>
    </article>
  );
}

export function Profile({ preview = false }: { preview?: boolean }) {
  const { user, admin } = useAuth();
  const profile = useMe(!preview);
  const [filter, setFilter] = useState<StoryFilter>("all");

  const submissions = useMySubmissions(!preview);

  if (!preview && (profile.isPending || submissions.isPending))
    return <Loading label="Cargando tu perfil…" />;
  if (!preview && (profile.error || submissions.error))
    return (
      <ErrorState
        error={profile.error ?? submissions.error!}
        retry={() => {
          void profile.refetch();
          void submissions.refetch();
        }}
      />
    );

  const stories = preview
    ? previewStories
    : (submissions.data?.items ?? []).map((article) => ({
        article,
        status:
          article.status === "published"
            ? ("published" as const)
            : article.status === "archived"
              ? ("archived" as const)
              : ("review" as const),
      }));
  const publishedCount = stories.filter(
    (story) => story.status === "published",
  ).length;
  const reviewCount = stories.filter(
    (story) => story.status === "review",
  ).length;
  const visibleStories =
    filter === "review"
      ? stories.filter((story) => story.status === "review")
      : stories;
  const displayName = preview
    ? "Ana López"
    : (user?.displayName ?? "Tu perfil");
  const location = preview
    ? "Guatemala"
    : locationLabel(profile.data?.simulatedLocation);

  return (
    <div className="feed-content profile-page">
      {(admin || preview) && (
        <div className="profile-admin-row">
          <Link
            className="profile-admin-access"
            to={preview ? "/login" : "/admin/submissions"}
          >
            <ShieldCheck size={15} aria-hidden="true" /> Admin access
          </Link>
        </div>
      )}

      <header className="profile-heading">
        <div className="profile-overview">
          <div
            className="profile-avatar"
            role="img"
            aria-label={`Perfil de ${displayName}`}
          >
            {!preview && user?.photoURL ? (
              <img src={user.photoURL} alt="" />
            ) : (
              initials(displayName)
            )}
          </div>
          <div className="profile-identity">
            <p className="profile-kicker">
              <UserRound size={14} aria-hidden="true" /> Tu espacio editorial
            </p>
            <h1>
              {displayName}
              <span className="red-dot">.</span>
            </h1>
            <p className="profile-location">{location}</p>
          </div>
        </div>

        <div className="profile-stats" aria-label="Resumen de noticias">
          <div>
            <strong>{stories.length}</strong>
            <span>reportes</span>
          </div>
          <div>
            <strong>{publishedCount}</strong>
            <span>publicados</span>
          </div>
          <div>
            <strong>{reviewCount}</strong>
            <span>en revisión</span>
          </div>
        </div>

        <div className="profile-actions">
          {preview ? (
            <Link className="profile-create" to="/preview/profile/new">
              <Plus size={17} aria-hidden="true" /> Subir noticia
            </Link>
          ) : (
            <Link className="profile-create" to="/profile/new">
              <Plus size={17} aria-hidden="true" /> Subir noticia
            </Link>
          )}
        </div>
      </header>

      <section className="profile-posts" aria-labelledby="profile-posts-title">
        <div className="profile-posts-heading">
          <h2 id="profile-posts-title">Tus noticias</h2>
          {stories.length > 0 && <span>{stories.length} reportes</span>}
        </div>
        <div
          className="profile-tabs"
          role="group"
          aria-label="Filtrar noticias del perfil"
        >
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            aria-pressed={filter === "all"}
            onClick={() => setFilter("all")}
          >
            <LayoutGrid size={15} aria-hidden="true" /> Noticias
          </button>
          <button
            type="button"
            className={filter === "review" ? "active" : ""}
            aria-pressed={filter === "review"}
            onClick={() => setFilter("review")}
          >
            <Clock3 size={15} aria-hidden="true" /> En revisión
            {reviewCount > 0 && <span>{reviewCount}</span>}
          </button>
        </div>

        {visibleStories.length ? (
          <div className="profile-news-grid">
            {visibleStories.map((story) => (
              <ProfileStoryCard
                key={story.article.id}
                story={story}
                preview={preview}
              />
            ))}
          </div>
        ) : preview ? (
          <Empty title="No hay noticias en revisión">
            Los reportes que envíes y estén esperando aprobación aparecerán
            aquí.
          </Empty>
        ) : (
          <div className="profile-empty">
            <div className="profile-empty-icon" aria-hidden="true">
              <UserRound size={23} />
            </div>
            <h2>Aún no tienes noticias</h2>
            <p>
              Comparte un reporte con sus fuentes. Podrás seguir aquí su estado
              mientras el equipo editorial lo revisa.
            </p>
            <Link className="text-link" to="/profile/new">
              Crear mi primer reporte <Plus size={15} aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
