import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Send,
  BookOpen,
  RotateCcw,
  FileText,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../auth/AuthProvider";
import { useFeed, useMe } from "../api/queries";
import { ErrorState, Evidence, External } from "../components/common";
import { locationLabel, topicLabel, newsTitle } from "../utils/presentation";
import { safeUrl } from "../utils/presentation";
import type { ChatResponse, FeedItem } from "../types/domain";
type Message = { question: string; response: ChatResponse };
export function ChatSources({
  citations,
  edition,
}: {
  citations: ChatResponse["citations"];
  edition: FeedItem[];
}) {
  return (
    <div className="chat-source-row">
      <div className="chat-source-avatars">
        {citations.slice(0, 3).map((citation) => {
          const image = edition.find(
            ({ article }) => article.id === citation.articleId,
          )?.article.image;
          return (
            <Link
              key={citation.articleId}
              className="chat-source-avatar"
              to={`/news/${citation.articleId}`}
              aria-label={`Abrir noticia: ${newsTitle(citation.title)}`}
              title={newsTitle(citation.title)}
            >
              {image && !image.provider.startsWith("mock") ? (
                <img
                  src={safeUrl(
                    image.provider === "openai-imagegen"
                      ? image.url.replace("-1200.webp", "-480.webp")
                      : image.url,
                  )}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <FileText size={16} />
              )}
            </Link>
          );
        })}
      </div>
      <details className="chat-source-details">
        <summary aria-label="Ver fuentes de la respuesta">
          Fuentes <span>{Math.min(citations.length, 3)}</span>
          <ChevronDown size={13} />
        </summary>
        <div className="chat-source-list">
          {citations.slice(0, 3).map((citation) => (
            <div key={citation.articleId}>
              <Link to={`/news/${citation.articleId}`}>
                {newsTitle(citation.title)}
              </Link>
              {citation.sources.map((source, i) => (
                <External key={`${source.url}-${i}`} href={source.url}>
                  {source.publisher} · {source.name}
                </External>
              ))}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
export function Chat({
  compact = false,
  onKeyboardChange,
}: {
  compact?: boolean;
  onKeyboardChange?: (open: boolean) => void;
}) {
  const [question, setQuestion] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [pendingQuestion, setPendingQuestion] = useState("");
  const feed = useFeed(),
    profile = useMe();
  const bottom = useRef<HTMLDivElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const mutation = useMutation({
    mutationFn: api.chat,
    onMutate: (sent) => {
      setPendingQuestion(sent);
      setQuestion("");
    },
    onSuccess: (response, sent) => {
      setMessages((previous) => [...previous, { question: sent, response }]);
      setPendingQuestion("");
    },
    onError: (_error, sent) => {
      setPendingQuestion("");
      setQuestion(sent);
    },
  });
  useEffect(() => {
    if (messages.length)
      bottom.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "nearest",
      });
  }, [messages.length]);
  function submit(event: FormEvent) {
    event.preventDefault();
    const sent = question.trim();
    if (sent.length < 3 || mutation.isPending) return;
    composerInput.current?.blur();
    onKeyboardChange?.(false);
    mutation.mutate(sent);
  }
  const edition = feed.data?.items ?? [];
  const local = edition.find(({ article }) => article.scope === "local");
  const education = edition.find(({ article }) =>
    article.topics.includes("education"),
  );
  const international = edition.find(
    ({ article }) => article.scope === "international",
  );
  const Heading = compact ? "h2" : "h1";
  const suggestions = [
    { label: "¿Qué pasa cerca de mí?", article: local },
    { label: "Cuéntame sobre educación", article: education },
    { label: "Una mirada al mundo", article: international },
  ]
    .filter((prompt) => prompt.article)
    .map((prompt) => ({
      label: prompt.label,
      question: `Explícame el reporte ${newsTitle(prompt.article!.article.title)}`,
    }));
  return (
    <div className={`chat-layout ${compact ? "chat-compact" : ""}`}>
      <section className="chat-main">
        <div className="conversation-tools">
          <button
            className="text-button"
            disabled={
              mutation.isPending || (!messages.length && !question.length)
            }
            onClick={() => {
              setMessages([]);
              setQuestion("");
              mutation.reset();
            }}
          >
            <RotateCcw size={14} />
            Limpiar conversación
          </button>
        </div>
        <div className="chat-scroll">
          {(!compact || !messages.length) && (
            <header className="chat-heading">
              <Heading>Pregunta sobre las noticias</Heading>
              <p>
                Pide un resumen, consulta un tema o descubre qué leer hoy.
                <br className="desktop-only" /> Las respuestas se basan en las
                noticias de esta edición.
              </p>
            </header>
          )}
          {!messages.length && (
            <div className="chat-intro">
              <div className="conversation-line">
                <BookOpen size={20} />
                <span>Pregunta a partir de los reportes disponibles</span>
              </div>
              <div className="suggestions">
                {suggestions.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => setQuestion(prompt.question)}
                  >
                    {prompt.label}
                    <ArrowUpRight size={18} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="conversation" aria-live="polite">
            {messages.map((message, index) => (
              <div className="message-pair" key={index}>
                <div className="question-message">{message.question}</div>
                <div className="answer-message">
                  <p className="answer-text">{message.response.answer}</p>
                  <div className="answer-status">
                    <span className="answer-label">
                      {!message.response.citations.length
                        ? "Sin reportes relacionados"
                        : message.response.providerMode === "mock"
                          ? "Respuesta de demostración"
                          : "Resumen asistido por IA"}
                    </span>
                    {message.response.citations.length > 0 && (
                      <Evidence status={message.response.uncertainty} />
                    )}
                  </div>
                  {message.response.citations.length ? (
                    <ChatSources
                      citations={message.response.citations}
                      edition={edition}
                    />
                  ) : (
                    <p className="no-evidence">
                      Puedes preguntar qué leer hoy o elegir un tema como clima,
                      educación o salud.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {mutation.isPending && pendingQuestion && (
            <div className="question-message">{pendingQuestion}</div>
          )}
          {mutation.isPending && (
            <p className="chat-pending" role="status">
              <LoaderCircle size={16} aria-hidden="true" />
              Consultando los reportes de esta edición…
              <span className="chat-thinking-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
          )}
          {mutation.error && (
            <ErrorState
              error={mutation.error}
              retry={() => mutation.mutate(question)}
            />
          )}
          <div ref={bottom} />
        </div>
        <div className="composer-note">
          <p>
            La IA puede equivocarse. Consulta las fuentes. Esta conversación no
            se guarda.
          </p>
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="question">
            Tu pregunta sobre las noticias
          </label>
          <textarea
            ref={composerInput}
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="¿Qué te gustaría entender hoy?"
            rows={2}
            minLength={3}
            maxLength={1000}
            disabled={mutation.isPending}
            onFocus={() => onKeyboardChange?.(true)}
            onBlur={() => onKeyboardChange?.(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            className="send-button"
            type="submit"
            aria-label="Enviar pregunta"
            disabled={question.trim().length < 3 || mutation.isPending}
          >
            <Send size={20} />
          </button>
        </form>
      </section>
      {!compact && (
        <aside className="chat-sidebar">
          <div className="sidebar-heading">
            <h2>En tu edición</h2>
            <Link aria-label="Abrir la portada" to="/feed">
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <p className="region-context">
            Desde {locationLabel(profile.data?.simulatedLocation)}
          </p>
          {feed.data?.items.slice(0, 3).map((item) => (
            <Link
              key={item.article.id}
              to={`/news/${item.article.id}`}
              className="chat-story"
            >
              <h3>{newsTitle(item.article.title)}</h3>
              <span className="topic">
                {topicLabel(item.article.topics[0])}
              </span>
              <span className="chat-story-footer">
                {item.article.publisher}
                <ArrowUpRight size={14} />
              </span>
            </Link>
          ))}
          {feed.error && (
            <p>
              No pudimos abrir los titulares.{" "}
              <Link to="/feed">Intenta en la portada.</Link>
            </p>
          )}
          <Link className="text-link all-stories" to="/feed">
            Ver toda la portada <ArrowRight size={16} />
          </Link>
          <div className="desk-note">
            <h3>El contexto importa.</h3>
            <p>
              Un resumen ayuda a empezar. Las fuentes te permiten ir más allá.
            </p>
            <Link to="/about">
              Nuestra forma de informar <ArrowUpRight size={14} />
            </Link>
          </div>
        </aside>
      )}
    </div>
  );
}
