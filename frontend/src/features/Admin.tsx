import { newsTitle } from "../utils/presentation";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, ArrowUpRight } from "lucide-react";
import { api } from "../auth/AuthProvider";
import { keys, useAdminNews } from "../api/queries";
import { Empty, ErrorState, Evidence, Loading } from "../components/common";
import {
  dateLabel,
  money,
  statusLabel,
  scopeLabel,
} from "../utils/presentation";
import type { ArticleStatus } from "../types/domain";
export function AdminNews() {
  const [filter, setFilter] = useState<ArticleStatus | "all">("all");
  const query = useAdminNews();
  if (query.isPending) return <Loading label="Abriendo la mesa editorial…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const items = query.data.items.filter(
    (a) => filter === "all" || a.status === filter,
  );
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>
            Noticias de la redacción<span className="red-dot">.</span>
          </h1>
          <p>Administra noticias, fuentes y publicaciones.</p>
        </div>
        <Link className="button" to="/admin/news/new">
          <Plus size={17} />
          Crear noticia
        </Link>
      </div>
      <div className="tabs" role="group" aria-label="Estado de publicación">
        {(["all", "draft", "published", "archived"] as const).map((status) => (
          <button
            key={status}
            aria-pressed={filter === status}
            onClick={() => setFilter(status)}
          >
            {status === "all" ? "Todas" : statusLabel[status]}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="editorial-list">
          {items.map((article) => (
            <Link
              key={article.id}
              to={`/admin/news/${article.id}`}
              className="editorial-row"
            >
              <div>
                <h2>{newsTitle(article.title)}</h2>
                <span className="article-status">
                  {statusLabel[article.status]} · {scopeLabel[article.scope]}
                </span>
                <span>
                  {article.countries.join(", ")} · {article.sources.length}{" "}
                  fuentes · {dateLabel(article.updatedAt)}
                </span>
              </div>
              <Evidence status={article.verificationStatus} />
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
      ) : (
        <Empty title="No hay noticias en este estado">
          Crea un borrador para comenzar un nuevo reporte.
        </Empty>
      )}
    </section>
  );
}
const actionLabel = {
  create: "Borrador creado",
  edit: "Edición guardada",
  assess: "Evidencia evaluada",
  publish: "Revisión humana y publicación",
  archive: "Noticia archivada",
  submit: "Reporte enviado por la comunidad",
  approve_submission: "Reporte comunitario aprobado",
  delete_submission: "Reporte comunitario eliminado",
};
export function AuditList({ articleId }: { articleId?: string }) {
  const query = useQuery({
    queryKey: keys.audit(articleId),
    queryFn: () => api.audit(articleId),
  });
  if (query.isPending) return <Loading label="Cargando el historial…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  if (!query.data.items.length)
    return (
      <Empty title="Sin movimientos todavía">
        Los cambios editoriales aparecerán aquí.
      </Empty>
    );
  return (
    <ol className="audit-list">
      {[...query.data.items]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .map((record) => (
          <li key={record.id}>
            <span className="audit-dot" />
            <div>
              <strong>{actionLabel[record.action]}</strong>
              <p>
                {dateLabel(record.timestamp)} ·{" "}
                {new Date(record.timestamp).toLocaleTimeString("es-GT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <small>Editor: {record.actorUid}</small>
              {!articleId && record.action !== "delete_submission" && (
                <Link
                  className="text-link"
                  to={`/admin/news/${record.articleId}`}
                >
                  Abrir noticia <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
          </li>
        ))}
    </ol>
  );
}
export function AdminAudit() {
  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>
            Historial de cambios<span className="red-dot">.</span>
          </h1>
          <p>Quién intervino y qué decisiones se tomaron.</p>
        </div>
      </div>
      <AuditList />
    </section>
  );
}
export function AdminUsage() {
  const query = useQuery({ queryKey: keys.usage, queryFn: api.usage });
  if (query.isPending) return <Loading label="Consultando el presupuesto…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  const usage = query.data;
  const budget = usage.totalUsd + usage.remainingUsd;
  const ratio = budget
    ? Math.min(100, Math.max(0, (usage.totalUsd / budget) * 100))
    : 100;
  return (
    <section className="usage-page">
      <div className="page-heading">
        <div>
          <h1>
            Uso de la API<span className="red-dot">.</span>
          </h1>
          <p>Costos estimados de IA registrados por el backend.</p>
        </div>
      </div>
      <div className="budget-panel">
        <div>
          <span>Uso estimado</span>
          <strong>{money(usage.totalUsd)}</strong>
          <p>De {money(budget)} disponibles para el proyecto</p>
        </div>
        <div className="budget-remaining">
          <strong>{money(usage.remainingUsd)}</strong>
          <span>Presupuesto restante</span>
        </div>
        <progress
          value={ratio}
          max={100}
          aria-label="Porcentaje del presupuesto de IA utilizado"
        />
        <p>
          Este cálculo es una estimación de la API, no una factura de Google
          Cloud. Las búsquedas de imágenes no se incluyen.
        </p>
      </div>
      <div className="usage-breakdown">
        <section>
          <h2>Por función</h2>
          {Object.entries(usage.byFeature).length ? (
            Object.entries(usage.byFeature).map(([name, cost]) => (
              <div className="cost-row" key={name}>
                <span>
                  {name === "chat" ? "Conversaciones de noticias" : name}
                </span>
                <strong>{money(cost)}</strong>
              </div>
            ))
          ) : (
            <p>Aún no hay uso registrado.</p>
          )}
        </section>
        <section>
          <h2>Por proveedor y modelo</h2>
          {Object.entries(usage.byProviderModel).length ? (
            Object.entries(usage.byProviderModel).map(([name, cost]) => (
              <div className="cost-row" key={name}>
                <span>{name}</span>
                <strong>{money(cost)}</strong>
              </div>
            ))
          ) : (
            <p>Aún no hay proveedores registrados.</p>
          )}
        </section>
      </div>
    </section>
  );
}
