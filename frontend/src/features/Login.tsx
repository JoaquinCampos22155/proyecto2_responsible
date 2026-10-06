import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, MapPin } from "lucide-react";
import { useAuth, firebaseReady, emulator } from "../auth/AuthProvider";
import { Brand } from "../components/Layout";
export function Login() {
  const { user, signIn, loading, error, demoSignIn } = useAuth();
  const location = useLocation();
  if (user)
    return (
      <Navigate
        to={(location.state as { from?: string } | null)?.from ?? "/"}
        replace
      />
    );
  return (
    <div className="login-page">
      <header className="container login-header">
        <Brand />
        <Link className="text-link" to="/preview">
          Explorar la edición de muestra <ArrowUpRight size={15} />
        </Link>
      </header>
      <main className="container login-main">
        <div className="login-copy">
          <h1>
            Noticias de tu región.
            <br />
            Contexto del mundo.
            <br />
            <em>En una sola portada.</em>
          </h1>
          <p className="login-deck">
            Lee noticias locales e internacionales, consulta sus fuentes y
            pregunta sobre los temas de la edición.
          </p>
          <button
            className="button google-button"
            disabled={loading || !firebaseReady}
            onClick={() => void signIn()}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c2-1.8 3-4.5 3-7.6Z"
              />
              <path
                fill="currentColor"
                opacity=".65"
                d="M12 22c2.8 0 5.1-.9 6.8-2.5l-3.3-2.6c-.9.6-2 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.8v2.7A10 10 0 0 0 12 22Zm-5.8-8.4a6 6 0 0 1 0-3.2V7.7H2.8a10 10 0 0 0 0 8.6l3.4-2.7ZM12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9.2 5.7l3.4 2.7C7 7.9 9.3 6.1 12 6.1Z"
              />
            </svg>
            {loading ? "Conectando…" : "Continuar con Google"}
            <ArrowRight size={18} />
          </button>
          <button
            className="redirect-link"
            disabled={loading || !firebaseReady}
            onClick={() => void signIn(true)}
          >
            Entrar en esta pestaña
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {!firebaseReady && (
            <p role="alert">
              Falta la configuración local de Firebase. Consulta el handoff.
            </p>
          )}
          {emulator && demoSignIn && (
            <button
              className="button secondary"
              disabled={loading}
              onClick={() => void demoSignIn()}
            >
              Entrar como editor de prueba local
            </button>
          )}
          <p className="privacy-note">
            Tú eliges una ubicación simulada. No solicitamos GPS.
            <br />
            Las conversaciones duran solo esta sesión.
          </p>
          <div className="login-proof">
            <span>
              <BookOpen size={17} />
              Fuentes accesibles
            </span>
            <span>
              <MapPin size={17} />
              Contexto local y global
            </span>
          </div>
        </div>
        <div className="login-visual">
          <img
            src="/antigua.webp"
            alt="Vista ilustrativa de Antigua Guatemala y el volcán de Agua"
          />
          <div className="visual-caption">
            <h2>
              Empieza con las
              <br />
              noticias de Guatemala.
            </h2>
            <Link to="/preview">
              Abre nuestra edición de muestra <ArrowRight size={18} />
            </Link>
          </div>
          <p className="photo-credit">
            Fotografía ilustrativa · Jonathandpg4 · Dominio público ·{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Volcan_Agua-Antigua_Guatemala.jpg"
              target="_blank"
              rel="noreferrer"
            >
              Wikimedia Commons
            </a>
          </p>
        </div>
      </main>
      <footer className="container login-footer">
        <span>Un proyecto universitario de Responsible AI.</span>
        <Link to="/about">
          Cómo funciona <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
