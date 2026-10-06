import { useEffect, useRef, useState, type RefObject } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Chat } from "./Chat";
gsap.registerPlugin(useGSAP);
export function ChatSidebar({
  open,
  onClose,
  onOpen,
  background,
  preview = false,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  background: RefObject<HTMLDivElement | null>;
  preview?: boolean;
}) {
  const { pathname } = useLocation();
  const lastPath = useRef(pathname);
  const panel = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 1199px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1199px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (mobile && lastPath.current !== pathname) onClose();
    lastPath.current = pathname;
  }, [pathname, mobile, onClose]);
  const previousFocus = useRef<HTMLElement | null>(null);
  useGSAP(
    () => {
      if (!open) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from(panel.current, {
            x: 32,
            opacity: 0,
            duration: 0.4,
            clearProps: "transform,opacity",
          })
          .from(
            ".chat-heading,.suggestions,.chat-composer",
            {
              y: 8,
              opacity: 0,
              duration: 0.35,
              stagger: 0.06,
              clearProps: "transform,opacity",
            },
            "<.1",
          );
      });
      return () => media.revert();
    },
    { scope: panel, dependencies: [open], revertOnUpdate: true },
  );
  useEffect(() => {
    if (!open) return;
    const element = panel.current;
    if (!element?.contains(document.activeElement))
      previousFocus.current = document.activeElement as HTMLElement;
    const page = background.current;
    const oldInert = page?.inert ?? false;
    if (page && mobile) page.inert = true;
    const oldOverflow = document.body.style.overflow;
    if (mobile) {
      document.body.style.overflow = "hidden";
      element?.querySelector<HTMLButtonElement>(".chat-close")?.focus();
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (
        event.key !== "Tab" ||
        !window.matchMedia("(max-width: 1199px)").matches
      )
        return;
      const focusables = Array.from(
        element?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled),textarea:not(:disabled)",
        ) ?? [],
      ).filter((el) => el.getClientRects().length);
      const first = focusables[0],
        last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      if (page) page.inert = oldInert;
      if (mobile) document.body.style.overflow = oldOverflow;
      if (
        element?.closest(".chat-layer")?.getAttribute("aria-hidden") !== "true"
      )
        return;
      const previous = previousFocus.current;
      const trigger = Array.from(
        document.querySelectorAll<HTMLElement>(
          'button[aria-controls="news-chat"]',
        ),
      ).find((el) => el.getClientRects().length > 0);
      const target =
        previous &&
        previous !== document.body &&
        previous.getClientRects().length > 0
          ? previous
          : (trigger ?? previous);
      target?.focus();
    };
  }, [open, mobile, onClose, background]);
  return (
    <>
      {!open && (
        <div className="chat-rail">
          <button
            className="chat-expand"
            aria-label="Expandir conversación"
            aria-controls="news-chat"
            aria-expanded={false}
            onClick={onOpen}
          >
            <PanelRightOpen className="desktop-chat-icon" size={21} />
            <MessageSquare className="mobile-chat-icon" size={21} />
            <span className="chat-rail-label">Conversar</span>
          </button>
        </div>
      )}
      <div
        className={`chat-layer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        {open && (
          <button
            className="chat-backdrop"
            aria-hidden="true"
            tabIndex={-1}
            aria-label="Cerrar conversación"
            onClick={onClose}
          />
        )}
        <div
          ref={panel}
          id="news-chat"
          className="chat-panel"
          role="dialog"
          aria-modal={mobile && open ? true : undefined}
          aria-label="Conversar sobre las noticias"
          tabIndex={-1}
          inert={!open}
        >
          <div className="chat-panel-header">
            <h2>Conversar</h2>
            <button
              className="icon-button chat-close"
              aria-label="Contraer conversación"
              title="Contraer conversación"
              onClick={onClose}
            >
              <PanelRightClose size={20} />
            </button>
          </div>
          {preview ? (
            <div className="chat-preview">
              <h2>Pregunta sobre las noticias</h2>
              <p>
                Entra con tu cuenta para consultar los reportes y seguir sus
                fuentes mientras lees.
              </p>
              <Link className="button" to="/login">
                Entrar con Google <ArrowRight size={16} />
              </Link>
              <p className="chat-preview-note">
                La edición de muestra permite explorar las noticias sin iniciar
                sesión.
              </p>
            </div>
          ) : (
            <Chat compact />
          )}
        </div>
      </div>
    </>
  );
}
