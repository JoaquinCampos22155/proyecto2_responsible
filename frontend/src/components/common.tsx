import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  ExternalLink,
  RotateCw,
  WifiOff,
  X,
  Info,
  Newspaper,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useState } from "react";
import { ApiError } from "../api/client";
import { evidence, imageLabels, safeUrl } from "../utils/presentation";
import type { ImageRecord, VerificationStatus } from "../types/domain";
export function Evidence({
  status,
  detail = false,
}: {
  status: VerificationStatus;
  detail?: boolean;
}) {
  const state = evidence[status];
  return (
    <div className={`evidence ${detail ? "evidence-detail" : ""}`}>
      <span>
        <Info size={13} />
        {state.label}
      </span>
      {detail && <p>{state.description}</p>}
    </div>
  );
}
export function External({
  href,
  children,
  className,
}: {
  href: string | undefined | null;
  children: ReactNode;
  className?: string;
}) {
  const url = safeUrl(href);
  return url ? (
    <a
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  ) : (
    <span>{children}</span>
  );
}
export function NewsImage({
  image,
  title,
  lead = false,
  disclose = true,
}: {
  image: ImageRecord | null;
  title: string;
  lead?: boolean;
  disclose?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!image) return null;
  const labels = imageLabels(image);
  return (
    <figure className="news-image">
      {failedUrl === image.url ? (
        <div className="demo-image">
          <strong>Imagen no disponible</strong>
          <span>La fuente no pudo cargar este recurso.</span>
        </div>
      ) : /^mock/.test(image.provider) ? (
        <div className="demo-image">
          <Newspaper size={32} />
          <strong>Imagen de demostración</strong>
          <span>Recurso simulado por el backend</span>
        </div>
      ) : (
        <div className="image-frame">
          <img
            width={1200}
            height={800}
            decoding="async"
            fetchPriority={lead ? "high" : "auto"}
            srcSet={
              image.provider === "openai-imagegen"
                ? [480, 800, 1200]
                    .map(
                      (width) =>
                        `${image.url.replace("-1200.webp", `-${width}.webp`)} ${width}w`,
                    )
                    .join(", ")
                : undefined
            }
            sizes="(max-width: 600px) 100vw, (max-width: 1100px) 60vw, 800px"
            src={safeUrl(image.url)}
            alt={
              labels.length
                ? "Recurso visual ilustrativo para esta noticia"
                : title
            }
            loading={lead ? "eager" : "lazy"}
            onError={() => setFailedUrl(image.url)}
          />
        </div>
      )}
      {disclose && labels.length > 0 && (
        <div className="image-labels">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
      {disclose && (
        <figcaption>
          {image.attribution && (
            <External href={image.sourcePageUrl ?? image.originalUrl}>
              {image.attribution}
            </External>
          )}
          {image.license && <span>{image.license}</span>}
        </figcaption>
      )}
    </figure>
  );
}
export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="state loading" role="status">
      <div className="loading-line" />
      <p>{label}</p>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="state">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { logout } = useAuth();
  const apiError = error instanceof ApiError ? error : null;
  const status = apiError?.status;
  const title =
    status === 401
      ? "Tu sesión necesita renovarse"
      : status === 403
        ? "No tienes acceso editorial"
        : status === 404
          ? "Esta noticia ya no está disponible"
          : status === 429
            ? "El presupuesto de IA no está disponible"
            : status === 409
              ? "Falta completar un paso editorial"
              : status === 502
                ? "El proveedor está temporalmente fuera de servicio"
                : "No pudimos cargar esta información";
  return (
    <div className="state error" role="alert">
      <h2>{title}</h2>
      <p>
        {status === 401
          ? "Vuelve a entrar con Google para continuar."
          : status === 403
            ? "Un operador debe asignar el permiso de editor a tu cuenta."
            : status === 429
              ? "Puedes seguir leyendo las noticias. Intenta el chat más tarde."
              : (apiError?.message ??
                "Revisa tu conexión y vuelve a intentarlo.")}
      </p>
      {apiError?.details.length ? (
        <ul>
          {apiError.details.map((d, i) => (
            <li key={i}>
              {d.path}: {d.message}
            </li>
          ))}
        </ul>
      ) : null}
      {status === 401 ? (
        <button className="button" onClick={() => void logout()}>
          Volver a entrar con Google <ArrowRight size={16} />
        </button>
      ) : (
        retry && (
          <button className="button secondary" onClick={retry}>
            <RotateCw size={16} />
            Reintentar
          </button>
        )
      )}
    </div>
  );
}
export function Offline() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      if (ref.current) ref.current.hidden = navigator.onLine;
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div ref={ref} className="offline" hidden role="status">
      <WifiOff size={16} />
      Sin conexión. Las noticias y el chat necesitan internet.
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
