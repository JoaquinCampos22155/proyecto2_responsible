import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock3,
  ExternalLink,
  FilterX,
  LoaderCircle,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { api } from "../auth/AuthProvider";
import { keys } from "../api/queries";
import {
  Empty,
  ErrorState,
  External,
  Loading,
  Modal,
  NewsImage,
} from "../components/common";
import type { Article, ArticleStatus } from "../types/domain";
import {
  countryLabel,
  dateLabel,
  newsTitle,
  statusLabel,
} from "../utils/presentation";

type QueueStatus = "pending_review" | "published" | "archived" | "all";

function dateText(article: Article) {
  return article.originDate
    ? dateLabel(`${article.originDate}T12:00:00`)
    : dateLabel(article.publishedAt);
}

export function AdminSubmissions() {
  const client = useQueryClient();
  const [status, setStatus] = useState<QueueStatus>("pending_review");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [country, setCountry] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Article | null>(null);
  const filters = useMemo(() => {
    const values: Record<string, string> = { status };
    if (from) values.from = from;
    if (to) values.to = to;
    if (country.trim()) values.country = country.trim().toUpperCase();
    return values;
  }, [country, from, status, to]);
  const query = useQuery({
    queryKey: keys.adminSubmissions(filters),
    queryFn: () => api.adminSubmissions(filters),
  });
  const mutation = useMutation({
    mutationFn: async (
      action:
        | { type: "approve"; id: string; priority: "normal" | "high" }
        | { type: "delete"; id: string },
    ) => {
      if (action.type === "approve")
        await api.approveSubmission(action.id, action.priority);
      else await api.deleteSubmission(action.id);
      return action.type;
    },
    onSuccess: async (_result, action) => {
      setNotice(
        action.type === "approve"
          ? "El reporte ya forma parte de las noticias."
          : "El reporte se eliminó permanentemente.",
      );
      setDeleting(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin", "submissions"] }),
        client.invalidateQueries({ queryKey: keys.mySubmissions }),
        client.invalidateQueries({ queryKey: keys.feed }),
        client.invalidateQueries({ queryKey: keys.globe }),
        client.invalidateQueries({ queryKey: keys.audit() }),
      ]);
    },
  });

  if (query.isPending)
    return <Loading label="Cargando aportes de la comunidad…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const articles = query.data.items;

  return (
    <section className="admin-submissions-page">
      <div className="page-heading">
        <div>
          <p className="profile-kicker">
            <ShieldCheck size={14} aria-hidden="true" /> Mesa editorial
          </p>
          <h1>
            Aportes de la comunidad<span className="red-dot">.</span>
          </h1>
          <p>Revisa cada reporte y su fuente antes de publicarlo.</p>
        </div>
        <span className="admin-submissions-total">
          <Clock3 size={15} aria-hidden="true" /> {articles.length} resultados
        </span>
      </div>

      <div
        className="admin-submissions-tabs"
        role="group"
        aria-label="Estado de los aportes"
      >
        {(
          [
            ["pending_review", "Por revisar"],
            ["published", "Publicadas"],
            ["archived", "Archivadas"],
            ["all", "Todas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={status === value ? "active" : ""}
            aria-pressed={status === value}
            onClick={() => {
              setNotice("");
              setStatus(value);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="admin-submission-filters"
        aria-label="Filtrar aportes"
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          <span>Desde</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label>
          <span>País</span>
          <input
            value={country}
            onChange={(event) =>
              setCountry(
                event.target.value
                  .replace(/[^a-z]/gi, "")
                  .slice(0, 2)
                  .toUpperCase(),
              )
            }
            maxLength={2}
            placeholder="Todos"
            aria-label="País por código ISO"
          />
        </label>
        {(from || to || country) && (
          <button
            className="admin-submission-clear"
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setCountry("");
            }}
          >
            <FilterX size={15} aria-hidden="true" /> Limpiar
          </button>
        )}
      </form>

      {notice && (
        <p className="admin-submission-notice" role="status">
          {notice}
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      {articles.length ? (
        <div className="admin-submission-list">
          {articles.map((article) => {
            const pendingAction =
              mutation.isPending && mutation.variables?.id === article.id
                ? mutation.variables
                : undefined;
            const approvingNormal =
              pendingAction?.type === "approve" &&
              pendingAction.priority === "normal";
            const approvingHigh =
              pendingAction?.type === "approve" &&
              pendingAction.priority === "high";
            return (
              <article className="admin-submission-card" key={article.id}>
                <div className="admin-submission-card-topline">
                  <span className={`admin-submission-status ${article.status}`}>
                    {article.status === "pending_review" && (
                      <Clock3 size={13} aria-hidden="true" />
                    )}
                    {statusLabel[article.status as ArticleStatus]}
                  </span>
                  <span>
                    <CalendarDays size={13} aria-hidden="true" /> Enviado{" "}
                    {dateLabel(article.createdAt)}
                  </span>
                </div>
                <div className="admin-submission-summary">
                  {article.image && (
                    <div className="admin-submission-image">
                      <NewsImage
                        image={article.image}
                        title={article.title}
                        disclose={false}
                      />
                    </div>
                  )}
                  <div className="admin-submission-copy">
                    <h2>{newsTitle(article.title)}</h2>
                    <p>{article.summary}</p>
                    <div className="admin-submission-meta">
                      <span>
                        {article.countries.map(countryLabel).join(", ")}
                      </span>
                      <span>Origen · {dateText(article)}</span>
                      <span>{article.author || "Cuenta comunitaria"}</span>
                    </div>
                  </div>
                </div>

                <details className="admin-submission-details">
                  <summary>Leer reporte y revisar fuente</summary>
                  <p className="admin-submission-body">{article.body}</p>
                  <div className="admin-submission-sources">
                    <strong>Fuentes ({article.sources.length})</strong>
                    {article.sources.map((source, index) => (
                      <div key={`${source.url}-${index}`}>
                        <span>
                          {source.publisher} · {source.name}
                        </span>
                        <External href={source.url}>
                          Abrir fuente{" "}
                          <ExternalLink size={13} aria-hidden="true" />
                        </External>
                      </div>
                    ))}
                  </div>
                </details>

                <div className="admin-submission-actions">
                  {article.status === "pending_review" && (
                    <>
                      <button
                        className="button"
                        type="button"
                        disabled={mutation.isPending}
                        aria-busy={approvingNormal}
                        onClick={() =>
                          mutation.mutate({
                            type: "approve",
                            id: article.id,
                            priority: "normal",
                          })
                        }
                      >
                        {approvingNormal ? (
                          <LoaderCircle
                            className="action-spinner"
                            size={16}
                            aria-hidden="true"
                          />
                        ) : (
                          <Check size={16} aria-hidden="true" />
                        )}
                        {approvingNormal ? "Aprobando…" : "Aprobar"}
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        disabled={mutation.isPending}
                        aria-busy={approvingHigh}
                        onClick={() =>
                          mutation.mutate({
                            type: "approve",
                            id: article.id,
                            priority: "high",
                          })
                        }
                      >
                        {approvingHigh ? (
                          <LoaderCircle
                            className="action-spinner"
                            size={16}
                            aria-hidden="true"
                          />
                        ) : (
                          <Star size={16} aria-hidden="true" />
                        )}
                        {approvingHigh
                          ? "Publicando destacada…"
                          : "Aprobar destacada"}
                      </button>
                    </>
                  )}
                  {article.status === "published" && (
                    <Link className="text-link" to={`/news/${article.id}`}>
                      Ver noticia publicada{" "}
                      <ExternalLink size={14} aria-hidden="true" />
                    </Link>
                  )}
                  <button
                    className="admin-submission-delete"
                    type="button"
                    disabled={mutation.isPending}
                    aria-busy={pendingAction?.type === "delete"}
                    onClick={() => setDeleting(article)}
                  >
                    {pendingAction?.type === "delete" ? (
                      <LoaderCircle
                        className="action-spinner"
                        size={15}
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 size={15} aria-hidden="true" />
                    )}
                    {pendingAction?.type === "delete"
                      ? "Eliminando…"
                      : "Eliminar permanentemente"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title="No hay aportes con estos filtros">
          Cuando lleguen reportes que coincidan, aparecerán aquí para su
          revisión.
        </Empty>
      )}

      {deleting && (
        <Modal
          title="Eliminar este reporte"
          onClose={() => {
            if (!mutation.isPending) setDeleting(null);
          }}
        >
          <p>
            <strong>{newsTitle(deleting.title)}</strong> se quitará de forma
            permanente, también si ya estaba publicado. Esta acción no se puede
            deshacer.
          </p>
          <button
            className="admin-submission-delete-confirm"
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ type: "delete", id: deleting.id })}
          >
            {mutation.isPending && (
              <LoaderCircle
                className="action-spinner"
                size={15}
                aria-hidden="true"
              />
            )}
            {mutation.isPending ? "Eliminando…" : "Sí, eliminar permanentemente"}
          </button>
        </Modal>
      )}
    </section>
  );
}
