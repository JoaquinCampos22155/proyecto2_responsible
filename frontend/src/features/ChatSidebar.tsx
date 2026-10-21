import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PanelRightClose, PanelRightOpen, MessageSquare } from "lucide-react";
import { useLocation, useMatch } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Chat } from "./Chat";
import { ChatPreview, SimulatedKeyboard } from "./ChatPreview";
import { ChatNewsCarousel } from "./ChatNewsCarousel";
import { keys, useFeed } from "../api/queries";
import { api } from "../auth/AuthProvider";
import type { FeedItem } from "../types/domain";
gsap.registerPlugin(useGSAP);
export function ChatSidebar({
  open,
  onClose,
  onOpen,
  preview = false,
  previewItems = [],
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  preview?: boolean;
  previewItems?: FeedItem[];
}) {
  const { pathname } = useLocation();
  const routeArticleId = useMatch("/news/:id")?.params.id;
  const lastPath = useRef(pathname);
  const panel = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 1199px)").matches,
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [simulatedKeyboard, setSimulatedKeyboard] = useState(
    () => !window.matchMedia("(hover: none) and (pointer: coarse)").matches,
  );
  const [viewportFrame, setViewportFrame] = useState<{
    height: number;
    top: number;
  } | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string>();
  const liveFeed = useFeed(!preview);
  const openedArticle = useQuery({
    queryKey: keys.article(routeArticleId ?? ""),
    queryFn: () => api.news(routeArticleId!),
    enabled: !preview && Boolean(routeArticleId),
  });
  const edition = preview ? previewItems : (liveFeed.data?.items ?? []);
  const openedItem =
    edition.find(({ article }) => article.id === routeArticleId) ??
    (openedArticle.data
      ? { article: openedArticle.data, reasons: [] }
      : undefined);
  const readingItems = openedItem
    ? [
        openedItem,
        ...edition.filter(
          ({ article }) => article.id !== openedItem.article.id,
        ),
      ]
    : edition;
  const activeArticle = readingItems.find(
    ({ article }) => article.id === activeArticleId,
  )?.article;
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1199px)");
    const change = () => setMobile(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(hover: none) and (pointer: coarse)");
    const change = () => setSimulatedKeyboard(!query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardFrame = () => {
      setViewportFrame({ height: viewport.height, top: viewport.offsetTop });
    };
    viewport.addEventListener("resize", updateKeyboardFrame);
    viewport.addEventListener("scroll", updateKeyboardFrame);
    window.addEventListener("resize", updateKeyboardFrame);
    updateKeyboardFrame();
    return () => {
      viewport.removeEventListener("resize", updateKeyboardFrame);
      viewport.removeEventListener("scroll", updateKeyboardFrame);
      window.removeEventListener("resize", updateKeyboardFrame);
    };
  }, []);
  useEffect(() => {
    if (mobile && lastPath.current !== pathname) onClose();
    lastPath.current = pathname;
  }, [pathname, mobile, onClose]);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) {
      setKeyboardOpen(false);
      setActiveArticleId(undefined);
      const previous = previousFocus.current;
      if (previous?.isConnected) previous.focus();
      previousFocus.current = null;
      return;
    }
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active !== document.body &&
      !panel.current?.contains(active)
    )
      previousFocus.current = active;
  }, [open]);
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
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
    };
  }, [open, onClose]);
  const panelStyle = {
    ...(viewportFrame
      ? {
          "--chat-viewport-height": `${viewportFrame.height}px`,
          "--chat-viewport-top": `${viewportFrame.top}px`,
        }
      : {}),
  } as CSSProperties;
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
        className={`chat-layer ${preview ? "chat-layer--preview" : ""} ${open ? "is-open" : ""} ${mobile && keyboardOpen ? "is-keyboard-open" : ""}`}
        data-keyboard-mode={
          preview ? (simulatedKeyboard ? "simulated" : "native") : undefined
        }
        style={panelStyle}
        aria-hidden={!open}
      >
        {open && mobile && (
          <ChatNewsCarousel
            key={pathname}
            items={readingItems}
            covered={keyboardOpen}
            onActiveArticleChange={setActiveArticleId}
          />
        )}
        <div
          ref={panel}
          id="news-chat"
          className="chat-panel"
          role="dialog"
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
              onPointerDown={(event) => {
                if (event.button === 0) event.preventDefault();
              }}
              onClick={onClose}
            >
              <PanelRightClose size={20} />
            </button>
          </div>
          {preview ? (
            <ChatPreview
              activeArticleTitle={activeArticle?.title}
              onKeyboardChange={setKeyboardOpen}
            />
          ) : (
            <Chat
              compact
              activeArticleId={mobile && open ? activeArticleId : undefined}
              onKeyboardChange={setKeyboardOpen}
            />
          )}
        </div>
        {preview && simulatedKeyboard && mobile && keyboardOpen && (
          <SimulatedKeyboard />
        )}
      </div>
    </>
  );
}
