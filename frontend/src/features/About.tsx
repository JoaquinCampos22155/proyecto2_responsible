import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { evidence } from "../utils/presentation";
import { Brand } from "../components/Layout";
export function About() {
  return (
    <main className="container about-page">
      <Brand />
      <Link className="text-link" to="/">
        <ArrowLeft size={16} />
        Volver
      </Link>
      <h1>Cómo funciona Perspectiva</h1>
      <p className="article-deck">
        Perspectiva es un proyecto universitario de Responsible AI. La
        tecnología ayuda a dar contexto; las fuentes sostienen el reporte y las
        personas deciden qué publicar.
      </p>
      <h2>Por qué aparece una noticia</h2>
      <p>
        El backend ordena los reportes por la ubicación simulada, la actividad
        de lectura, la actualidad y la prioridad elegida por un editor. Reserva
        espacio para noticias locales, nacionales e internacionales cuando están
        disponibles. El ranking no usa un modelo de lenguaje.
      </p>
      <h2>La evidencia tiene matices</h2>
      <dl>
        {Object.values(evidence).map((state) => (
          <div key={state.label}>
            <dt>{state.label}</dt>
            <dd>{state.description}</dd>
          </div>
        ))}
      </dl>
      <h2>La IA y las imágenes</h2>
      <p>
        El chat usa como máximo tres noticias almacenadas y muestra sus fuentes.
        Un resumen asistido no constituye evidencia independiente. Las imágenes
        de stock son ilustrativas; las generadas o alteradas con IA se
        identifican visiblemente.
      </p>
      <h2>Tus datos, en contexto</h2>
      <p>
        La ubicación se elige manualmente, sin GPS. El backend registra
        impresiones, aperturas, tiempo agregado de lectura, acciones de
        compartir e interacciones con temas para ajustar intereses. Las
        conversaciones se mantienen solo en memoria y se borran al terminar la
        sesión.
      </p>
      <h2>Contenido de demostración</h2>
      <p>
        Los reportes cuyo título empieza por [DEMO] son ficticios, creados para
        una demostración académica. No describen hechos reales. En producción,
        el chat y la búsqueda de fotografías siguen en modo de demostración.
        Cada noticia de muestra tiene una ilustración generada con IA; no es una
        fotografía del supuesto evento.
      </p>
    </main>
  );
}
