import { useEffect, useState, useCallback, useRef } from "react";
import { NavLink, Link, Outlet, useLocation, Navigate } from "react-router-dom";
import {
  Newspaper,
  MapPin,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Download,
} from "lucide-react";
import { useAuth, emulator } from "../auth/AuthProvider";
import { useMe } from "../api/queries";
import { locationLabel } from "../utils/presentation";
import { EventProvider } from "../features/EventProvider";
import { ChatSidebar } from "../features/ChatSidebar";
import { Offline, Loading } from "./common";
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Perspectiva, inicio">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        perspectiva<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
type InstallEvent = Event & { prompt: () => Promise<void> };
export function Layout() {
  const { user, admin, logout } = useAuth();
  const [menu, setMenu] = useState(false),
    [install, setInstall] = useState<InstallEvent | null>(null);
  const profile = useMe();
  const path = useLocation().pathname;
  const [chatOpen, setChatOpen] = useState(
    () => window.matchMedia("(min-width: 1200px)").matches,
  );
  const background = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setChatOpen(false), []);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return (
    <EventProvider>
      <div
        ref={background}
        className={`reader-shell ${chatOpen ? "chat-open" : "chat-collapsed"}`}
      >
        <a className="skip-link" href="#main-content">
          Ir al contenido
        </a>
        <Offline />
        {emulator && (
          <div className="demo-strip">
            Entorno local · Noticias ficticias · Proveedores de demostración
          </div>
        )}
        <div className="edition-bar">
          <div className="container">
            <span>Noticias y fuentes</span>
            <span>
              {new Intl.DateTimeFormat("es-GT", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </span>
          </div>
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Brand />
            <nav aria-label="Principal" className="desktop-nav">
              <NavLink to="/feed">La portada</NavLink>
              <NavLink to="/location">Mi región</NavLink>
              {admin && (
                <NavLink to="/admin/news">
                  Redacción <ArrowUpRight size={13} />
                </NavLink>
              )}
            </nav>
            <div className="header-actions">
              <Link to="/location" className="location-link">
                <MapPin size={15} />
                <span>{locationLabel(profile.data?.simulatedLocation)}</span>
              </Link>
              <button
                className="avatar"
                aria-label="Abrir opciones de cuenta"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                {user?.displayName?.slice(0, 1) ?? "P"}
              </button>
              <button
                className="icon-button mobile-menu"
                aria-label={menu ? "Cerrar menú" : "Abrir menú"}
                onClick={() => setMenu(!menu)}
              >
                {menu ? <X /> : <Menu />}
              </button>
            </div>
          </div>
          {menu && (
            <div className="account-menu">
              <p>{user?.displayName ?? "Tu cuenta"}</p>
              <small>{user?.email}</small>
              {admin && <Link to="/admin/news">Ir a la redacción</Link>}
              {install && (
                <button
                  onClick={async () => {
                    await install.prompt();
                    setInstall(null);
                  }}
                >
                  <Download size={16} />
                  Instalar Perspectiva
                </button>
              )}
              <button onClick={() => void logout()}>
                <LogOut size={16} />
                Cerrar sesión
              </button>
            </div>
          )}
        </header>
        <main id="main-content" className="container main-content">
          <Outlet />
        </main>
        <footer className="site-footer container">
          <Brand />
          <p>Noticias con contexto. Fuentes a la vista.</p>
          <Link to="/about">
            Cómo funciona Perspectiva <ArrowUpRight size={14} />
          </Link>
        </footer>
        <nav className="mobile-nav" aria-label="Navegación móvil">
          <NavLink to="/feed">
            <Newspaper size={21} />
            Portada
          </NavLink>
          <NavLink to="/location">
            <MapPin size={21} />
            Mi región
          </NavLink>
        </nav>
      </div>
      <ChatSidebar
        open={chatOpen}
        onClose={closeChat}
        onOpen={() => setChatOpen(true)}
        background={background}
      />
    </EventProvider>
  );
}
export function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Comprobando tu sesión…" />;
  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Layout />;
}
export function AdminGuard() {
  const { admin, refresh } = useAuth();
  if (!admin)
    return (
      <div className="state">
        <h1>Acceso para editores</h1>
        <p>
          Tu cuenta aún no tiene el permiso editorial. Un operador puede
          asignarlo desde Firebase.
        </p>
        <button className="button secondary" onClick={() => void refresh()}>
          Actualizar permisos
        </button>
        <Link to="/feed" className="text-link">
          Volver a la portada
        </Link>
      </div>
    );
  return (
    <>
      <div className="admin-nav">
        <NavLink to="/admin/news">Noticias</NavLink>
        <NavLink to="/admin/audit">Historial</NavLink>
        <NavLink to="/admin/usage">Uso de API</NavLink>
      </div>
      <Outlet />
    </>
  );
}
