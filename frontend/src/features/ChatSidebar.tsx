import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { Chat } from "./Chat";
import { ChatPreview, SimulatedKeyboard } from "./ChatPreview";
import { ChatNewsCarousel } from "./ChatNewsCarousel";
import { useFeed } from "../api/queries";
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
  const lastPath = useRef(pathname);
  const panel = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 1199px)").matches,
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [simulatedKeyboard, setSimulatedKeyboard] = useState(
    () => !window.matchMedia("(hover: none) and (pointer: coarse)").matches,
  );
  const [nativeKeyboardBottom, setNativeKeyboardBottom] = useState(0);
  const liveFeed = useFeed(!preview);
  const readingItems = preview ? previewItems : (liveFeed.data?.items ?? []);
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
      setNativeKeyboardBottom(
        Math.max(
          0,
          Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
        ),
      );
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
    "--chat-keyboard-bottom": `${nativeKeyboardBottom}px`,
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
          <ChatNewsCarousel items={readingItems} covered={keyboardOpen} />
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
              onClick={onClose}
            >
              <PanelRightClose size={20} />
            </button>
          </div>
          {preview ? (
            <ChatPreview onKeyboardChange={setKeyboardOpen} />
          ) : (
            <Chat compact onKeyboardChange={setKeyboardOpen} />
          )}
        </div>
        {preview && simulatedKeyboard && mobile && keyboardOpen && (
          <SimulatedKeyboard />
        )}
      </div>
    </>
  );
}
