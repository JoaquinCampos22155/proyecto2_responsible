import { newsTitle } from "../utils/presentation";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Search, Trash2, ArrowUpRight } from "lucide-react";
import { api } from "../auth/AuthProvider";
import { keys } from "../api/queries";
import {
  ErrorState,
  Evidence,
  External,
  Loading,
  Modal,
  NewsImage,
} from "../components/common";
import { statusLabel, imageLabels } from "../utils/presentation";
import type { Article, DraftInput } from "../types/domain";
import { draftFromForm, sourceFromForm } from "./editor-payload";
import { ArticleContent } from "./Article";
import { AuditList } from "./Admin";
function Field({
  name,
  label,
  value = "",
  required = false,
  type = "text",
  maxLength,
  help,
}: {
  name: string;
  label: string;
  value?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  help?: string;
}) {
  return (
    <label className="field">
      {label}
      {required && <span className="required"> *</span>}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        maxLength={maxLength}
        aria-describedby={help ? `${name}-help` : undefined}
      />
      {help && <small id={`${name}-help`}>{help}</small>}
    </label>
  );
}
function ArticleForm({
  article,
  pending,
  onSave,
  onDirty,
}: {
  article?: Article;
  pending: boolean;
  onSave: (body: DraftInput) => void;
  onDirty: () => void;
}) {
  return (
    <form
      className="editor-form"
      onChange={onDirty}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draftFromForm(new FormData(e.currentTarget)));
      }}
    >
      <fieldset disabled={pending || (article && article.status !== "draft")}>
        <div className="field full">
          <label htmlFor="title">Titular *</label>
          <input
            id="title"
            name="title"
            defaultValue={article?.title}
            required
            minLength={5}
            maxLength={250}
            placeholder="Un titular claro y preciso"
          />
        </div>
        <label className="field full">
          Resumen
          <textarea
            name="summary"
            defaultValue={article?.summary}
            rows={3}
            maxLength={1000}
            placeholder="Resumen de la noticia"
          />
        </label>
        <label className="field full">
          Cuerpo de la noticia *
          <textarea
            name="body"
            defaultValue={article?.body}
            rows={12}
            required
            minLength={10}
            maxLength={20000}
          />
        </label>
        <Field
          name="author"
          label="Autor"
          value={article?.author}
          maxLength={120}
        />
        <Field
          name="publisher"
          label="Publicación"
          value={article?.publisher}
          maxLength={120}
        />
        <Field
          name="canonicalUrl"
          label="URL editorial original"
          value={article?.canonicalUrl}
          type="url"
          required
        />
        <label className="field">
          Alcance
          <select name="scope" defaultValue={article?.scope ?? "local"}>
            <option value="local">Local</option>
            <option value="national">Nacional</option>
            <option value="international">Internacional</option>
          </select>
        </label>
        <Field
          name="countries"
          label="Países"
          value={article?.countries.join(", ") ?? "GT"}
          required
          help="Códigos ISO separados por coma: GT, US, MX, ES"
        />
        <Field
          name="regions"
          label="Regiones"
          value={article?.regions.join(", ") ?? "GT-GU"}
          help="Códigos separados por coma: GT-GU, US-NY. Puede quedar vacío."
        />
        <Field
          name="topics"
          label="Temas"
          value={article?.topics.join(", ")}
          required
          help="Etiquetas separadas por coma: education, culture, technology"
        />
        <label className="field">
          Prioridad editorial
          <select
            name="editorialPriority"
            defaultValue={article?.editorialPriority ?? "normal"}
          >
            <option value="normal">Normal</option>
            <option value="high">Destacada por la redacción</option>
          </select>
          <small>Es una decisión humana de prominencia.</small>
        </label>
        <label className="checkbox full">
          <input
            type="checkbox"
            name="developing"
            defaultChecked={article?.developing}
          />
          Este reporte está en desarrollo
        </label>
        <label className="checkbox full">
          <input
            type="checkbox"
            name="assisted"
            defaultChecked={article?.aiDisclosure.assisted}
          />
          El texto tuvo asistencia de IA
        </label>
        <Field
          name="aiNote"
          label="Describe la asistencia de IA"
          value={article?.aiDisclosure.note ?? ""}
          maxLength={500}
        />
      </fieldset>
      {(!article || article.status === "draft") && (
        <button className="button" type="submit" disabled={pending}>
          {pending
            ? "Guardando…"
            : article
              ? "Guardar cambios"
              : "Crear borrador"}
          <Check size={17} />
        </button>
      )}
    </form>
  );
}
export function AdminEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [tab, setTab] = useState("Texto"),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false),
    [confirmation, setConfirmation] = useState<"publish" | "archive" | null>(
      null,
    ),
    [reviewed, setReviewed] = useState(false),
    [keywords, setKeywords] = useState("");
  const query = useQuery({
    queryKey: keys.adminArticle(id ?? "new"),
    queryFn: () => api.adminArticle(id!),
    enabled: Boolean(id),
  });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<Article>) => operation(),
    onSuccess: async (article) => {
      client.setQueryData(keys.adminArticle(article.id), article);
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.adminNews, exact: true }),
        client.invalidateQueries({ queryKey: ["admin", "audit"] }),
        client.invalidateQueries({ queryKey: keys.feed }),
        client.invalidateQueries({ queryKey: keys.article(article.id) }),
      ]);
      setNotice("Cambio editorial guardado.");
      setConfirmation(null);
      setReviewed(false);
      setDirty(false);
      if (!id) navigate(`/admin/news/${article.id}`, { replace: true });
    },
  });
  const imageSearch = useMutation({ mutationFn: api.images });
  const article = query.data;
  const canEdit = article?.status === "draft";
  function act(operation: () => Promise<Article>) {
    setNotice("");
    mutation.reset();
    mutation.mutate(operation);
  }
  if (id && query.isPending)
    return <Loading label="Abriendo el reporte editorial…" />;
  if (query.error)
    return (
      <ErrorState error={query.error} retry={() => void query.refetch()} />
    );
  function sourceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    const form = event.currentTarget;
    const body = sourceFromForm(new FormData(form));
    mutation.mutate(() => api.source(id, body), {
      onSuccess: () => form.reset(),
    });
  }
  return (
    <section className="editor-page">
      <Link to="/admin/news" className="text-link">
        <ArrowLeft size={16} />
        Mesa editorial
      </Link>
      <div className="page-heading">
        <div>
          <h1>
            {article ? "Editar reporte" : "Nueva noticia"}
            <span className="red-dot">.</span>
          </h1>
          <p>
            {article
              ? `${statusLabel[article.status]} · ${article.sources.length} fuentes`
              : "Empieza un borrador. Las fuentes se añaden después de guardar."}
          </p>
        </div>
        {article && <Evidence status={article.verificationStatus} />}
      </div>
      {notice && (
        <p role="status" className="success-message">
          {notice}
        </p>
      )}
      {dirty && (
        <p className="unsaved-note">
          Hay cambios sin guardar. Guarda el texto antes de revisarlo o
          publicar.
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      <div className="tabs" role="group" aria-label="Secciones del editor">
        {["Texto", "Fuentes", "Imagen", "Vista previa", "Historial"].map(
          (section) => (
            <button
              key={section}
              disabled={(!article || dirty) && section !== "Texto"}
              aria-pressed={tab === section}
              onClick={() => setTab(section)}
            >
              {section}
            </button>
          ),
        )}
      </div>
      {tab === "Texto" && (
        <ArticleForm
          key={article?.id ?? "new"}
          article={article}
          pending={mutation.isPending}
          onDirty={() => setDirty(true)}
          onSave={(body) =>
            act(() => (id ? api.edit(id, body) : api.create(body)))
          }
        />
      )}{" "}
      {article && tab === "Fuentes" && (
        <div className="sources-workspace">
          <section>
            <h2>La procedencia del reporte</h2>
            <p>
              Distintos medios pueden compartir el mismo origen. Registra la
              agencia o el grupo de sindicación cuando lo conozcas.
            </p>
            {article.sources.map((source, i) => (
              <div className="source-entry" key={i}>
                <External href={source.url}>
                  <strong>{source.name}</strong>
                </External>
                <p>
                  {source.publisher} · {source.sourceType} ·{" "}
                  {source.stance === "supports"
                    ? "Apoya"
                    : source.stance === "disputes"
                      ? "Discrepa"
                      : "Contexto"}
                </p>
                {source.originSource && <p>Origen: {source.originSource}</p>}
                {source.sourceGroup && <p>Grupo: {source.sourceGroup}</p>}
                {source.credibilityNote && <p>{source.credibilityNote}</p>}
              </div>
            ))}
            {!article.sources.length && (
              <p className="empty-inline">
                Sin fuentes todavía. Añade el primer reporte.
              </p>
            )}
            <Evidence status={article.verificationStatus} detail />
            <button
              className="button secondary"
              disabled={!canEdit || mutation.isPending || dirty}
              onClick={() => act(() => api.assess(article.id))}
            >
              Evaluar orígenes de evidencia
            </button>
            <p className="help">
              Este criterio compara procedencias; no es una declaración de
              veracidad por IA.
            </p>
          </section>
          {canEdit && (
            <form className="source-form" onSubmit={sourceSubmit}>
              <h2>Añadir una fuente</h2>
              <fieldset disabled={mutation.isPending}>
                <Field
                  name="name"
                  label="Nombre del reporte"
                  required
                  maxLength={200}
                />
                <Field
                  name="url"
                  label="URL de la fuente"
                  required
                  type="url"
                />
                <Field
                  name="publisher"
                  label="Medio o entidad"
                  required
                  maxLength={120}
                />
                <label className="field">
                  Tipo de fuente
                  <select name="sourceType">
                    {[
                      ["news", "Noticia"],
                      ["wire", "Agencia"],
                      ["official", "Oficial"],
                      ["report", "Informe"],
                      ["eyewitness", "Testigo"],
                      ["social", "Red social"],
                      ["other", "Otro"],
                    ].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Relación con el reporte
                  <select name="stance">
                    <option value="supports">Apoya</option>
                    <option value="disputes">Discrepa</option>
                    <option value="context">Aporta contexto</option>
                  </select>
                </label>
                <Field
                  name="originSource"
                  label="Origen del reporte"
                  help="Ejemplo: Reuters, si este medio republica a Reuters."
                  maxLength={120}
                />
                <Field
                  name="sourceGroup"
                  label="Grupo de fuentes"
                  help="Grupo de sindicación o propiedad compartida, si se conoce."
                  maxLength={120}
                />
                <Field
                  name="credibilityNote"
                  label="Nota sobre la procedencia"
                  maxLength={500}
                />
              </fieldset>
              <button className="button" disabled={mutation.isPending}>
                Añadir fuente
              </button>
            </form>
          )}
        </div>
      )}
      {article && tab === "Imagen" && (
        <section className="images-workspace">
          <h2>Una imagen, con procedencia</h2>
          <p>
            Las fotografías de stock son ilustrativas. Comprueba atribución y
            licencia antes de usarlas.
          </p>
          {article.image ? (
            <div className="selected-image">
              <NewsImage image={article.image} title={article.title} />
              <p>Proveedor: {article.image.provider}</p>
              <External
                href={article.image.sourcePageUrl ?? article.image.originalUrl}
              >
                Ver origen
              </External>
              {canEdit && (
                <button
                  className="text-button"
                  disabled={mutation.isPending}
                  onClick={() => act(() => api.image(article.id, null))}
                >
                  <Trash2 size={16} />
                  Quitar imagen
                </button>
              )}
            </div>
          ) : (
            <p className="empty-inline">
              Este reporte no tiene imagen. Puede publicarse así.
            </p>
          )}
          {canEdit && (
            <>
              <form
                className="image-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  imageSearch.mutate(keywords);
                }}
              >
                <label className="field">
                  Buscar una imagen ilustrativa
                  <input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    minLength={2}
                    maxLength={100}
                    required
                    placeholder="Ej. river, education"
                  />
                </label>
                <button
                  className="button"
                  disabled={imageSearch.isPending || keywords.trim().length < 2}
                >
                  <Search size={17} />
                  {imageSearch.isPending ? "Buscando…" : "Buscar"}
                </button>
              </form>
              {imageSearch.error && (
                <ErrorState
                  error={imageSearch.error}
                  retry={() => imageSearch.mutate(keywords)}
                />
              )}
              <div className="image-candidates">
                {imageSearch.data?.images.map((image, index) => (
                  <div key={`${image.url}-${index}`}>
                    <NewsImage
                      image={image}
                      title="Candidato de imagen ilustrativa"
                    />
                    <p>
                      {image.attribution ?? "Sin atribución registrada"} ·{" "}
                      {image.provider}
                    </p>
                    <External href={image.sourcePageUrl ?? image.originalUrl}>
                      Origen de la imagen
                    </External>
                    <button
                      className="button secondary"
                      disabled={mutation.isPending}
                      onClick={() => act(() => api.image(article.id, image))}
                    >
                      Usar esta imagen
                    </button>
                  </div>
                ))}
              </div>
              {imageSearch.isSuccess && !imageSearch.data.images.length && (
                <p role="status">
                  No encontramos imágenes. Prueba con otras palabras o publica
                  sin imagen.
                </p>
              )}
            </>
          )}
        </section>
      )}
      {article && tab === "Vista previa" && (
        <div className="editor-preview">
          <div className="preview-note">
            Vista previa del reporte guardado · {statusLabel[article.status]}
          </div>
          <ArticleContent article={article} preview embedded />
        </div>
      )}
      {article && tab === "Historial" && <AuditList articleId={article.id} />}{" "}
      {article && (
        <div className="editor-actions">
          <span>
            {canEdit
              ? "La publicación requiere una decisión humana."
              : article.status === "published"
                ? "Esta noticia está disponible para los lectores."
                : "Esta noticia ya no aparece en la portada."}
          </span>
          {canEdit && (
            <button
              className="button"
              disabled={mutation.isPending || dirty || !article.sources.length}
              onClick={() => {
                setReviewed(false);
                setConfirmation("publish");
              }}
            >
              Revisar y publicar <ArrowUpRight size={16} />
            </button>
          )}
          {article.status !== "archived" && (
            <button
              className="button secondary"
              disabled={mutation.isPending || dirty}
              onClick={() => setConfirmation("archive")}
            >
              Archivar
            </button>
          )}
        </div>
      )}
      {article && confirmation && (
        <Modal
          title={
            confirmation === "publish"
              ? "Revisión humana antes de publicar"
              : "Archivar este reporte"
          }
          onClose={() => {
            if (!mutation.isPending) setConfirmation(null);
          }}
        >
          {confirmation === "publish" ? (
            <>
              <h3>{newsTitle(article.title)}</h3>
              <Evidence status={article.verificationStatus} detail />
              <p>
                <strong>{article.sources.length} fuentes:</strong>{" "}
                {article.sources.map((s) => s.publisher).join(", ")}
              </p>
              <p>
                <strong>Imagen:</strong>{" "}
                {article.image
                  ? `${article.image.provider} · ${imageLabels(article.image).join(", ") || "Recurso editorial"}`
                  : "Sin imagen"}
              </p>
              <p>
                <strong>Asistencia de IA:</strong>{" "}
                {article.aiDisclosure.assisted
                  ? (article.aiDisclosure.note ?? "Declarada por el editor")
                  : "No declarada"}
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                He revisado el texto, sus fuentes y las declaraciones de IA.
                Asumo esta decisión editorial.
              </label>
              <button
                className="button"
                disabled={!reviewed || mutation.isPending}
                onClick={() => act(() => api.publish(article.id))}
              >
                {mutation.isPending
                  ? "Publicando…"
                  : "Confirmar publicación humana"}
              </button>
            </>
          ) : (
            <>
              <p>
                La noticia dejará de estar disponible en la portada. Su
                historial se conservará.
              </p>
              <button
                className="button"
                disabled={mutation.isPending}
                onClick={() => act(() => api.archive(article.id))}
              >
                {mutation.isPending ? "Archivando…" : "Confirmar archivo"}
              </button>
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
