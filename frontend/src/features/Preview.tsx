import { Link, useLocation, useParams } from "react-router-dom";
import { lazy, useState, useCallback } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import sample from "./sample-news.json";
import type { Article } from "../types/domain";
import { Brand, EditorialNav } from "../components/Layout";
import { FeedContent } from "./Feed";
import { ArticleContent } from "./Article";
import { Empty } from "../components/common";
import { ChatSidebar } from "./ChatSidebar";
import { MyCountry } from "./MyCountry";
import { Profile } from "./Profile";
import { SubmissionForm } from "./SubmissionForm";
const Globe = lazy(() =>
  import("./Globe").then((module) => ({ default: module.Globe })),
);
export function Preview() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const countryPage = pathname === "/preview/my-country";
  const profilePage = pathname === "/preview/profile";
  const submissionPage = pathname === "/preview/profile/new";
  const globePage =
    pathname === "/preview/globe" || pathname.startsWith("/preview/globe/");
  const articles = sample as Article[];
  const previewItems = articles.map((article) => ({ article, reasons: [] }));
  const article = articles.find((a) => a.id === id);
  const [chatOpen, setChatOpen] = useState(
    () => window.matchMedia("(min-width: 1200px)").matches,
  );
  const closeChat = useCallback(() => setChatOpen(false), []);
  return (
    <>
      <div
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
          {globePage ? (
            <Globe preview />
          ) : countryPage ? (
            <MyCountry preview />
          ) : profilePage ? (
            <Profile preview />
          ) : submissionPage ? (
            <SubmissionForm preview />
          ) : id ? (
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
        <EditorialNav preview countryAvailable globeAvailable />
      </div>
      <ChatSidebar
        open={chatOpen}
        onClose={closeChat}
        onOpen={() => setChatOpen(true)}
        preview
        previewItems={previewItems}
      />
    </>
  );
}
