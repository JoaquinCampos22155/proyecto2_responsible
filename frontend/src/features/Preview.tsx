import { Link, useParams } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import sample from "./sample-news.json";
import type { Article } from "../types/domain";
import { Brand } from "../components/Layout";
import { FeedContent } from "./Feed";
import { ArticleContent } from "./Article";
import { Empty } from "../components/common";
import { ChatSidebar } from "./ChatSidebar";
export function Preview() {
  const { id } = useParams();
  const articles = sample as Article[];
  const article = articles.find((a) => a.id === id);
  const [chatOpen, setChatOpen] = useState(
    () => window.matchMedia("(min-width: 1200px)").matches,
  );
  const background = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setChatOpen(false), []);
  return (
    <>
      <div
        ref={background}
        className={`reader-shell ${chatOpen ? "chat-open" : "chat-collapsed"}`}
      >
        <div className="demo-strip">
          Edición de muestra · Noticias ficticias para una demostración
          académica
        </div>
        <header className="site-header">
          <div className="container header-inner">
            <Brand />
            <Link className="button small" to="/login">
              Entrar con Google <ArrowRight size={16} />
            </Link>
          </div>
        </header>
        <main className="container main-content">
          {id ? (
            article ? (
              <ArticleContent article={article} related={articles} preview />
            ) : (
              <Empty title="Noticia no disponible">
                Vuelve a la edición de muestra.
              </Empty>
            )
          ) : (
            <FeedContent
              items={articles.map((article) => ({ article, reasons: [] }))}
              preview
            />
          )}
        </main>
        <footer className="container site-footer">
          <Link className="text-link" to="/login">
            <ArrowLeft size={16} />
            Volver al inicio
          </Link>
          <p>Contenido sintético para demostración académica.</p>
        </footer>
      </div>
      <ChatSidebar
        open={chatOpen}
        onClose={closeChat}
        onOpen={() => setChatOpen(true)}
        background={background}
        preview
      />
    </>
  );
}
