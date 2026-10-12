import { Link } from "react-router-dom";
import { ArrowLeft, Download, Smartphone, Share, Check } from "lucide-react";
import { Brand } from "../components/Layout";
import { useInstall } from "../components/InstallProvider";

export function Install() {
  const { installed, available, pending, message, install } = useInstall();
  return (
    <main className="container install-page">
      <div className="install-top">
        <Brand />
        <Link className="text-link" to="/">
          <ArrowLeft size={16} />
          Volver a las noticias
        </Link>
      </div>
      <section className="install-intro">
        <img src="/icon-192.png" width="80" height="80" alt="" />
        <h1>Las noticias, a un toque.</h1>
        <p>
          Añade Perspectiva a tu pantalla de inicio. Se abre en su propia
          ventana, sin descargarla de una tienda.
        </p>
        {installed ? (
          <p className="install-status" role="status">
            <Check size={20} /> Ya estás usando la aplicación instalada.
          </p>
        ) : available ? (
          <button
            className="button"
            disabled={pending}
            onClick={() => void install()}
          >
            <Download size={18} />
            {pending ? "Abriendo instalación…" : "Instalar Perspectiva"}
          </button>
        ) : (
          <p className="muted">Elige abajo los pasos para tu teléfono.</p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <div className="install-platforms">
        <section aria-labelledby="install-ios">
          <h2 id="install-ios">
            <Smartphone size={22} /> En iPhone o iPad
          </h2>
          <ol>
            <li>
              Abre esta página en <strong>Safari</strong>.
            </li>
            <li>
              Toca <strong>Compartir</strong>{" "}
              <Share size={15} aria-hidden="true" /> en el menú del navegador.
            </li>
            <li>
              Selecciona <strong>Añadir a pantalla de inicio</strong>.
            </li>
            <li>
              Activa <strong>Abrir como app web</strong> si aparece y toca{" "}
              <strong>Añadir</strong>.
            </li>
          </ol>
        </section>
        <section aria-labelledby="install-android">
          <h2 id="install-android">
            <Download size={22} /> En Android
          </h2>
          <ol>
            <li>
              Abre esta página en <strong>Chrome</strong>.
            </li>
            <li>
              Toca <strong>Instalar Perspectiva</strong> si el botón aparece
              arriba.
            </li>
            <li>
              También puedes abrir el menú <strong>⋮</strong> y elegir{" "}
              <strong>Añadir a pantalla de inicio → Instalar</strong>.
            </li>
            <li>Confirma y abre Perspectiva desde su nuevo icono.</li>
          </ol>
        </section>
      </div>
      <section className="install-details">
        <h2>Lista para volver a abrir</h2>
        <p>
          La interfaz se guarda para abrir incluso sin conexión. Para iniciar
          sesión, cargar noticias recientes, enviar aportes y conversar
          necesitas internet.
        </p>
        <p>
          Si abres el enlace dentro de WhatsApp, Instagram u otra aplicación,
          usa su opción de abrir en Safari o Chrome.
        </p>
        <Link className="text-link" to="/login">
          Iniciar sesión{" "}
          <ArrowLeft size={16} style={{ transform: "rotate(180deg)" }} />
        </Link>
      </section>
    </main>
  );
}
