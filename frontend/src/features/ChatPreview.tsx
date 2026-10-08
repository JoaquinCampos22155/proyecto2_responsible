import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, BookOpen, Sparkles } from "lucide-react";

type DemoMessage = { author: "reader" | "assistant"; text: string };

export function ChatPreview({
  onKeyboardChange,
}: {
  onKeyboardChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (timer.current !== undefined) window.clearTimeout(timer.current);
    },
    [],
  );

  function send(event: FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (question.length < 3 || thinking) return;

    setMessages((previous) => [...previous, { author: "reader", text: question }]);
    setDraft("");
    setThinking(true);
    input.current?.blur();
    onKeyboardChange(false);

    timer.current = window.setTimeout(() => {
      setMessages((previous) => [
        ...previous,
        {
          author: "assistant",
          text: "Esta es una respuesta de muestra. En el chat conectado, la respuesta se apoyará en los reportes disponibles y mostrará sus fuentes.",
        },
      ]);
      setThinking(false);
    }, 900);
  }

  return (
    <div className="chat-preview-demo">
      <div className="chat-preview-scroll" aria-live="polite">
        {!messages.length && (
          <div className="chat-preview-welcome">
            <span className="chat-preview-context">
              <BookOpen size={15} aria-hidden="true" />
              Conversación sobre esta edición
            </span>
            <p>
              Pregunta por una noticia y explora el contexto mientras sigues
              leyendo.
            </p>
            <button
              className="chat-preview-suggestion"
              type="button"
              onClick={() => setDraft("¿Qué dice el reporte principal?")}
            >
              ¿Qué dice el reporte principal?
              <ArrowUp size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        {messages.map((message, index) => (
          <p
            className={`chat-preview-message ${message.author}`}
            key={`${message.author}-${index}`}
          >
            {message.text}
          </p>
        ))}
        {thinking && (
          <p className="chat-preview-thinking" role="status">
            <Sparkles size={15} aria-hidden="true" />
            Revisando el reporte y sus fuentes…
            <span className="chat-thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </p>
        )}
      </div>
      <p className="chat-preview-demo-note">
        Vista de prueba: las respuestas son de muestra; no se envían a Firebase.
      </p>
      <form className="chat-preview-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="preview-chat-question">
          Escribe una pregunta sobre las noticias
        </label>
        <textarea
          ref={input}
          id="preview-chat-question"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => onKeyboardChange(true)}
          onBlur={() => onKeyboardChange(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Pregunta sobre las noticias"
          rows={2}
          minLength={3}
          maxLength={1000}
          enterKeyHint="send"
          disabled={thinking}
        />
        <button
          type="submit"
          aria-label="Enviar pregunta"
          disabled={draft.trim().length < 3 || thinking}
        >
          <ArrowUp size={19} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

export function SimulatedKeyboard() {
  return (
    <div className="chat-preview-keyboard" aria-hidden="true">
      <div className="chat-preview-keyboard-tools">
        <span>¿Qué</span>
        <span>dice</span>
        <span>sobre</span>
      </div>
      <div className="chat-preview-key-row">
        {"QWERTYUIOP".split("").map((key) => (
          <span key={key}>{key}</span>
        ))}
      </div>
      <div className="chat-preview-key-row inset">
        {"ASDFGHJKL".split("").map((key) => (
          <span key={key}>{key}</span>
        ))}
      </div>
      <div className="chat-preview-key-row">
        <span className="special">⇧</span>
        {"ZXCVBNM".split("").map((key) => (
          <span key={key}>{key}</span>
        ))}
        <span className="special">⌫</span>
      </div>
      <div className="chat-preview-key-row bottom-row">
        <span className="special">123</span>
        <span className="space">Español</span>
        <span className="send-key">Enviar</span>
      </div>
      <span className="chat-preview-home-indicator" />
    </div>
  );
}
