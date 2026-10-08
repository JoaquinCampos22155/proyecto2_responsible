import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as isoCountries from "i18n-iso-countries";
import spanishCountries from "i18n-iso-countries/langs/es.json";
import { ArrowLeft, Check, ImagePlus, LoaderCircle, X } from "lucide-react";
import { api, useAuth } from "../auth/AuthProvider";
import { ApiError } from "../api/client";
import { useMe, keys } from "../api/queries";
import {
  deleteSubmissionImage,
  uploadSubmissionImage,
} from "../api/submission-media";
import { ErrorState, Loading } from "../components/common";
import { topics } from "../utils/presentation";
import type { ImageRecord, SubmissionInput } from "../types/domain";

isoCountries.registerLocale(spanishCountries);

const countryOptions = Object.entries(isoCountries.getNames("es"))
  .sort((left, right) => left[1].localeCompare(right[1], "es"))
  .map(([code, label]) => ({ code, label }));
const topicOptions = Object.entries(topics).sort((left, right) =>
  left[1].localeCompare(right[1], "es"),
);
const sourceTypes = [
  ["news", "Medio de comunicación"],
  ["wire", "Agencia de noticias"],
  ["official", "Fuente oficial"],
  ["report", "Informe o estudio"],
  ["eyewitness", "Testimonio directo"],
  ["social", "Red social"],
  ["other", "Otra fuente"],
] as const;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function todayInGuatemala() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guatemala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="submission-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function SubmissionForm({ preview = false }: { preview?: boolean }) {
  const { user } = useAuth();
  const profile = useMe(!preview);
  const client = useQueryClient();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [country, setCountry] = useState("GT");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState("");
  const [previewNotice, setPreviewNotice] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(() => {
    if (profile.data?.simulatedLocation.country)
      setCountry(profile.data.simulatedLocation.country);
  }, [profile.data?.simulatedLocation.country]);
  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const submit = useMutation({
    mutationFn: async (body: Omit<SubmissionInput, "image">) => {
      let uploadedImage: ImageRecord | undefined;
      const submissionId = body.submissionId;
      if (imageFile) {
        uploadedImage = await uploadSubmissionImage(
          imageFile,
          user!.uid,
          submissionId,
        );
      }
      try {
        return await api.submitNews({
          ...body,
          ...(uploadedImage ? { image: uploadedImage } : {}),
        });
      } catch (error) {
        if (
          uploadedImage?.storagePath &&
          error instanceof ApiError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 409
        )
          await deleteSubmissionImage(uploadedImage.storagePath).catch(
            () => undefined,
          );
        throw error;
      }
    },
    onSuccess: async (article) => {
      client.setQueryData(
        keys.mySubmissions,
        (current: { items: (typeof article)[] } | undefined) => ({
          items: [article, ...(current?.items ?? [])],
        }),
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: keys.mySubmissions }),
        client.invalidateQueries({ queryKey: keys.adminSubmissions({}) }),
      ]);
      navigate("/profile");
    },
  });

  function chooseImage(file: File | undefined) {
    setImageError("");
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!acceptedTypes.includes(file.type)) {
      setImageFile(null);
      setImageError("Elige una imagen JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageFile(null);
      setImageError("La imagen debe pesar 5 MB o menos.");
      return;
    }
    setImageFile(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) {
      setPreviewNotice(true);
      return;
    }
    const form = new FormData(event.currentTarget);
    const sourceName = String(form.get("sourceName") ?? "").trim();
    const sourcePublisher = String(form.get("sourcePublisher") ?? "").trim();
    const sourceUrl = String(form.get("sourceUrl") ?? "").trim();
    const input: Omit<SubmissionInput, "image"> = {
      submissionId: crypto.randomUUID(),
      title: String(form.get("title") ?? "").trim(),
      summary: String(form.get("summary") ?? "").trim(),
      body: String(form.get("body") ?? "").trim(),
      originDate: String(form.get("originDate") ?? ""),
      scope: String(
        form.get("scope") ?? "national",
      ) as SubmissionInput["scope"],
      country,
      topics: [String(form.get("topic") ?? "community")],
      source: {
        name: sourceName,
        publisher: sourcePublisher,
        url: sourceUrl,
        sourceType: String(
          form.get("sourceType") ?? "news",
        ) as SubmissionInput["source"]["sourceType"],
        stance: "supports",
      },
      aiDisclosure: {
        assisted,
        note: assisted ? String(form.get("aiNote") ?? "").trim() || null : null,
      },
    };
    submit.mutate(input);
  }

  if (!preview && profile.isPending)
    return <Loading label="Preparando tu espacio editorial…" />;
  if (!preview && profile.error)
    return (
      <ErrorState error={profile.error} retry={() => void profile.refetch()} />
    );

  return (
    <section className="submission-page">
      <Link
        className="submission-back"
        to={preview ? "/preview/profile" : "/profile"}
      >
        <ArrowLeft size={16} aria-hidden="true" /> Volver a mi perfil
      </Link>
      <header className="submission-heading">
        <p className="profile-kicker">Tu espacio editorial</p>
        <h1>
          Comparte un reporte<span className="red-dot">.</span>
        </h1>
        <p>
          Cuéntanos qué ocurrió y deja la fuente para que podamos revisarlo.
        </p>
      </header>

      <form
        ref={formRef}
        className="submission-form"
        onSubmit={handleSubmit}
        onChange={() => setPreviewNotice(false)}
      >
        <div className="submission-section-heading">
          <span>01</span>
          <div>
            <h2>La noticia</h2>
            <p>Un titular claro y los datos más importantes.</p>
          </div>
        </div>
        <Field label="Titular" id="submission-title">
          <input
            id="submission-title"
            name="title"
            minLength={5}
            maxLength={250}
            placeholder="¿Qué ocurrió?"
            required
          />
        </Field>
        <Field
          label="Resumen"
          id="submission-summary"
          hint="De 10 a 1,000 caracteres."
        >
          <textarea
            id="submission-summary"
            name="summary"
            rows={3}
            minLength={10}
            maxLength={1000}
            placeholder="La idea principal en pocas líneas"
            required
          />
        </Field>
        <Field
          label="Reporte completo"
          id="submission-body"
          hint="Incluye el contexto y lo que se conoce. Evita publicar datos personales sensibles."
        >
          <textarea
            id="submission-body"
            name="body"
            rows={8}
            minLength={20}
            maxLength={20000}
            placeholder="Describe los hechos con claridad…"
            required
          />
        </Field>
        <div className="submission-fields-row">
          <Field
            label="Fecha de origen"
            id="submission-origin-date"
            hint="La fecha del reporte original; se conservará al aprobarlo."
          >
            <input
              id="submission-origin-date"
              name="originDate"
              type="date"
              max={todayInGuatemala()}
              required
            />
          </Field>
          <Field label="País" id="submission-country">
            <select
              id="submission-country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            >
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="submission-fields-row">
          <Field label="Alcance" id="submission-scope">
            <select id="submission-scope" name="scope" defaultValue="national">
              <option value="local">Local</option>
              <option value="national">Nacional</option>
              <option value="international">Internacional</option>
            </select>
          </Field>
          <Field label="Tema principal" id="submission-topic">
            <select id="submission-topic" name="topic" defaultValue="community">
              {topicOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="submission-section-heading">
          <span>02</span>
          <div>
            <h2>La fuente</h2>
            <p>Necesitamos al menos una referencia que respalde el reporte.</p>
          </div>
        </div>
        <div className="submission-fields-row">
          <Field label="Medio u origen" id="submission-source-publisher">
            <input
              id="submission-source-publisher"
              name="sourcePublisher"
              minLength={2}
              maxLength={120}
              placeholder="Ej. Prensa Libre"
              required
            />
          </Field>
          <Field label="Tipo de fuente" id="submission-source-type">
            <select
              id="submission-source-type"
              name="sourceType"
              defaultValue="news"
            >
              {sourceTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Título o descripción de la fuente"
          id="submission-source-name"
        >
          <input
            id="submission-source-name"
            name="sourceName"
            minLength={2}
            maxLength={200}
            placeholder="Titular del artículo, informe o referencia"
            required
          />
        </Field>
        <Field
          label="Enlace de la fuente"
          id="submission-source-url"
          hint="Debe abrir el material original."
        >
          <input
            id="submission-source-url"
            name="sourceUrl"
            type="url"
            placeholder="https://…"
            required
          />
        </Field>

        <div className="submission-section-heading">
          <span>03</span>
          <div>
            <h2>Detalles opcionales</h2>
            <p>Una imagen puede ayudar a presentar tu reporte.</p>
          </div>
        </div>
        <label className="submission-image-picker">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => chooseImage(event.currentTarget.files?.[0])}
          />
          <span className="submission-image-icon">
            <ImagePlus size={19} aria-hidden="true" />
          </span>
          <span>
            <strong>{imageFile ? imageFile.name : "Añadir una imagen"}</strong>
            <small>
              JPG, PNG o WebP · máximo 5 MB · se guardará en Firebase Storage
            </small>
          </span>
        </label>
        {imagePreviewUrl && (
          <div className="submission-image-preview">
            <img
              src={imagePreviewUrl}
              alt="Vista previa de la imagen adjunta"
            />
            <button
              className="submission-image-remove"
              type="button"
              aria-label="Quitar imagen adjunta"
              onClick={() => chooseImage(undefined)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        {imageError && (
          <p className="submission-inline-error" role="alert">
            {imageError}
          </p>
        )}

        <label className="submission-ai-check">
          <input
            type="checkbox"
            checked={assisted}
            onChange={(event) => setAssisted(event.target.checked)}
          />
          <span>
            Usé asistencia de inteligencia artificial para preparar este
            reporte.
          </span>
        </label>
        {assisted && (
          <Field label="¿Cómo se usó la IA?" id="submission-ai-note">
            <textarea
              id="submission-ai-note"
              name="aiNote"
              rows={2}
              maxLength={500}
              placeholder="Describe brevemente su uso"
            />
          </Field>
        )}

        <div className="submission-review-note">
          <Check size={16} aria-hidden="true" />
          <p>
            Tu reporte quedará <strong>en revisión</strong>. Solo aparecerá en
            las noticias cuando el equipo editorial lo apruebe.
          </p>
        </div>
        {submit.error && <ErrorState error={submit.error} />}
        {previewNotice && (
          <p className="submission-preview-note" role="status">
            Esta es una vista de prueba. <Link to="/login">Inicia sesión</Link>{" "}
            para enviar un reporte.
          </p>
        )}
        <div className="submission-form-actions">
          <Link
            className="button secondary"
            to={preview ? "/preview/profile" : "/profile"}
          >
            Cancelar
          </Link>
          {preview ? (
            <button className="button" type="submit">
              Enviar para revisión <Check size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="button"
              type="submit"
              disabled={submit.isPending}
              aria-busy={submit.isPending}
            >
              {submit.isPending ? "Enviando reporte…" : "Enviar para revisión"}
              {submit.isPending ? (
                <LoaderCircle className="action-spinner" size={16} aria-hidden="true" />
              ) : (
                <Check size={16} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
