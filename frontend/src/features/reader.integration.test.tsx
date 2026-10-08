import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { useState, useRef, useCallback, type ReactNode } from "react";
import seed from "./sample-news.json";
import type { Article, UserProfile } from "../types/domain";
import { ApiError } from "../api/client";
const boundary = vi.hoisted(() => ({
  api: {
    me: vi.fn(),
    feed: vi.fn(),
    globe: vi.fn(),
    news: vi.fn(),
    locations: vi.fn(),
    location: vi.fn(),
    event: vi.fn(),
    chat: vi.fn(),
    adminNews: vi.fn(),
    mySubmissions: vi.fn(),
    submitNews: vi.fn(),
    adminSubmissions: vi.fn(),
    approveSubmission: vi.fn(),
    deleteSubmission: vi.fn(),
  },
  user: null as {
    uid: string;
    displayName: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null,
  admin: true,
}));
vi.mock("../auth/AuthProvider", () => ({
  api: boundary.api,
  emulator: false,
  useAuth: () => ({
    user: boundary.user,
    admin: boundary.admin,
    loading: false,
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}));
import { Feed, FeedContent } from "./Feed";
import { Article as ArticlePage } from "./Article";
import { Chat } from "./Chat";
import { ChatSidebar } from "./ChatSidebar";
import { Location } from "./Location";
import { AdminNews } from "./Admin";
import { EventProvider } from "./EventProvider";
import { newsTitle } from "../utils/presentation";
import { NewsImage } from "../components/common";
import { EditorialNav, Layout } from "../components/Layout";
import { Profile } from "./Profile";
import { SubmissionForm } from "./SubmissionForm";
import { AdminSubmissions } from "./AdminSubmissions";
import { Globe } from "./Globe";
const articles = seed as Article[];
const profile: UserProfile = {
  uid: "reader",
  displayName: "Reader",
  email: "reader@example.test",
  photoURL: null,
  simulatedLocation: { country: "GT", region: "GT-GU" },
  interestWeights: {},
  createdAt: "2026-09-26T12:00:00Z",
  updatedAt: "2026-09-26T12:00:00Z",
};
function mount(children: ReactNode, route = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <EventProvider>{children}</EventProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  vi.resetAllMocks();
  boundary.user = {
    uid: "reader",
    displayName: "Reader",
    email: "reader@example.test",
    photoURL: null,
  };
  boundary.admin = true;
  boundary.api.me.mockResolvedValue(profile);
  boundary.api.feed.mockResolvedValue({
    items: articles.map((article, index) => ({
      article,
      reasons: index === 0 ? ["Relevant to your selected region"] : [],
    })),
    nextCursor: null,
  });
  boundary.api.globe.mockResolvedValue({
    week: { start: "2026-10-04", end: "2026-10-11" },
    countries: {},
    worldStory: null,
  });
  boundary.api.news.mockImplementation(async (id: string) =>
    articles.find((a) => a.id === id),
  );
  boundary.api.event.mockResolvedValue({ profile });
  boundary.api.mySubmissions.mockResolvedValue({ items: [] });
  boundary.api.adminSubmissions.mockResolvedValue({ items: [] });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("max-width") || query.includes(": reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: () => {},
  });
});
describe("reader workflows and disclosures", () => {
  it("opens a country when its clickable map shape is tapped", async () => {
    boundary.user = null;
    boundary.admin = false;
    Object.defineProperty(SVGSVGElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    function LocationProbe() {
      const location = useLocation();
      return <output data-testid="pathname">{location.pathname}</output>;
    }
    mount(
      <>
        <Routes>
          <Route path="/preview/globe" element={<Globe preview />} />
          <Route
            path="/preview/globe/:countryCode"
            element={<p>Noticias del país seleccionado</p>}
          />
        </Routes>
        <LocationProbe />
      </>,
      "/preview/globe",
    );

    const guatemala = screen.getByRole("button", {
      name: /Guatemala.*Abrir noticias/,
    });
    fireEvent.pointerDown(guatemala, {
      pointerId: 1,
      clientX: 60,
      clientY: 80,
    });
    fireEvent.pointerUp(guatemala, {
      pointerId: 1,
      clientX: 60,
      clientY: 80,
    });

    await waitFor(() =>
      expect(screen.getByTestId("pathname")).toHaveTextContent(
        "/preview/globe/gt",
      ),
    );
    expect(screen.getByText("Noticias del país seleccionado")).toBeInTheDocument();
    expect(boundary.api.me).not.toHaveBeenCalled();
    expect(boundary.api.globe).not.toHaveBeenCalled();
  });

  it("shows the sample profile and report form without signing in", async () => {
    boundary.user = null;
    boundary.admin = false;
    mount(
      <>
        <Profile preview />
        <EditorialNav preview countryAvailable globeAvailable />
      </>,
      "/preview/profile",
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /Ana López/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(6);
    expect(
      within(
        screen.getByRole("navigation", { name: "Navegación principal" }),
      ).getByRole("link", { name: "Perfil" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Subir noticia/ })).toHaveAttribute(
      "href",
      "/preview/profile/new",
    );
    await userEvent.click(screen.getByRole("button", { name: /En revisión/ }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("does not present sample submissions as belonging to a signed-in reader", async () => {
    boundary.user = { uid: "reader", displayName: "Reader" };
    boundary.admin = false;
    mount(<Profile />, "/profile");

    expect(
      await screen.findByRole("heading", { level: 1, name: /Reader/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Aún no tienes noticias")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Subir noticia/ })).toHaveAttribute(
      "href",
      "/profile/new",
    );
  });

  it("shows actual user reports and their pending/publication states in the profile grid", async () => {
    const submitted = {
      ...articles[0],
      id: "my-report",
      title: "Mi reporte comunitario",
      status: "pending_review" as const,
      submittedByUid: "reader",
      publishedAt: null,
      originDate: "2026-09-25",
    };
    boundary.api.mySubmissions.mockResolvedValue({ items: [submitted] });
    boundary.user = { uid: "reader", displayName: "Reader" };
    boundary.admin = false;
    mount(<Profile />, "/profile");

    expect(
      await screen.findByText("Mi reporte comunitario"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole("button", { name: /En revisión/ }));
    expect(
      screen.getByRole("heading", { name: "Mi reporte comunitario" }),
    ).toBeInTheDocument();
  });

  it("keeps the unauthenticated report-composer preview local and asks the user to sign in", async () => {
    boundary.user = null;
    boundary.admin = false;
    mount(<SubmissionForm preview />, "/preview/profile/new");

    expect(
      screen.getByRole("heading", { level: 1, name: /Comparte un reporte/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Reporte completo")).toBeRequired();
    expect(screen.getByLabelText("Enlace de la fuente")).toBeRequired();
    await userEvent.type(
      screen.getByLabelText("Titular"),
      "Reporte de prueba comunitaria",
    );
    await userEvent.type(
      screen.getByLabelText("Resumen"),
      "Un resumen suficiente para completar la prueba.",
    );
    await userEvent.type(
      screen.getByLabelText("Reporte completo"),
      "Este es un reporte comunitario con todos los detalles necesarios para la prueba.",
    );
    await userEvent.type(
      screen.getByLabelText("Fecha de origen"),
      "2026-09-25",
    );
    await userEvent.type(
      screen.getByLabelText("Medio u origen"),
      "Medio de prueba",
    );
    await userEvent.type(
      screen.getByLabelText("Título o descripción de la fuente"),
      "Nota de prueba",
    );
    await userEvent.type(
      screen.getByLabelText("Enlace de la fuente"),
      "https://example.com/reporte",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Enviar para revisión/ }),
    );
    expect(
      await screen.findByText(/Esta es una vista de prueba/),
    ).toBeInTheDocument();
    expect(boundary.api.submitNews).not.toHaveBeenCalled();
  });

  it("lets editors review community reports and offers a protected permanent-delete confirmation", async () => {
    const report = {
      ...articles[0],
      id: "community-report",
      title: "Un reporte enviado por la comunidad",
      status: "pending_review" as const,
      submittedByUid: "reader",
      publishedAt: null,
      originDate: "2026-09-25",
    };
    boundary.api.adminSubmissions.mockResolvedValue({ items: [report] });
    boundary.api.deleteSubmission.mockResolvedValue({ deleted: true });
    mount(<AdminSubmissions />, "/admin/submissions");

    expect(
      await screen.findByText("Un reporte enviado por la comunidad"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Eliminar permanentemente/ }),
    );
    expect(
      await screen.findByRole("dialog", { name: "Eliminar este reporte" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Sí, eliminar permanentemente/ }),
    );
    expect(boundary.api.deleteSubmission).toHaveBeenCalledWith(
      "community-report",
    );
  });

  it("offers only other published articles and opens a related report through its real reader route", async () => {
    const draft = {
      ...articles[2],
      id: "private-draft",
      status: "draft",
      title: "Borrador privado",
    };
    boundary.api.feed.mockResolvedValue({
      items: [draft, articles[1], ...articles, articles[2]].map((article) => ({
        article,
        reasons: [],
      })),
      nextCursor: null,
    });
    mount(
      <Routes>
        <Route path="/news/:id" element={<ArticlePage />} />
      </Routes>,
      `/news/${articles[1].id}`,
    );
    const related = await screen.findByRole("region", {
      name: "Sigue leyendo",
    });
    await waitFor(() =>
      expect(
        within(related).getAllByRole("heading", { level: 3 }),
      ).toHaveLength(3),
    );
    expect(
      within(related).queryByText("Borrador privado"),
    ).not.toBeInTheDocument();
    expect(
      within(related).queryByRole("link", {
        name: newsTitle(articles[1].title),
      }),
    ).not.toBeInTheDocument();
    const target = within(related).getByRole("link", {
      name: newsTitle(articles[2].title),
    });
    await userEvent.click(target);
    await screen.findByRole("heading", {
      level: 1,
      name: newsTitle(articles[2].title),
    });
    expect(boundary.api.news).toHaveBeenCalledWith(articles[2].id);
  });

  it("opens the desktop companion by default and preserves collapse across reader navigation without a navbar chat action", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("min-width") || query.includes(": reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    mount(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/feed" element={<Feed />} />
          <Route path="/news/:id" element={<ArticlePage />} />
        </Route>
      </Routes>,
      `/news/${articles[1].id}`,
    );
    await screen.findByRole("heading", {
      level: 1,
      name: newsTitle(articles[1].title),
    });
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(
      within(
        screen.getByRole("navigation", { name: "Navegación principal" }),
      ).queryByRole("button", { name: "Conversar" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Contraer conversación" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const expand = screen.getByRole("button", {
      name: "Expandir conversación",
    });
    await userEvent.click(
      within(
        screen.getByRole("navigation", { name: "Navegación principal" }),
      ).getByRole("link", { name: "Noticias." }),
    );
    await screen.findByRole("heading", { level: 1, name: /Noticias/ });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(expand);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("offers named sections without duplicating stories and merges both climate topics in one filter", async () => {
    mount(
      <FeedContent
        items={articles.map((article) => ({ article, reasons: [] }))}
        interests={["education"]}
      />,
    );
    const guatemala = screen.getByRole("region", { name: "En Guatemala" });
    expect(guatemala.querySelector(".news-story-lead")).toBeTruthy();
    expect(guatemala.querySelectorAll(".news-story-lead")).toHaveLength(1);
    expect(
      screen.queryByText("Imagen generada con IA"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Crédito de imagen")).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .every((h) => !h.textContent?.includes("[DEMO]")),
    ).toBe(true);
    expect(
      screen.getByRole("region", { name: "Internacional" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Según tus intereses" }),
    ).toBeInTheDocument();
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(new Set(titles).size).toBe(articles.length);
    expect(titles).toHaveLength(articles.length);
    const select = screen.getByRole("combobox", { name: "Filtrar por tema" });
    expect(
      within(select).getAllByRole("option", { name: "Clima" }),
    ).toHaveLength(1);
    await userEvent.selectOptions(select, "weather");
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual(
      articles
        .filter((a) => a.topics.some((t) => ["weather", "climate"].includes(t)))
        .map((a) => newsTitle(a.title)),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Quitar filtro" }),
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(
      articles.length,
    );
  });

  it("keeps server order, presents ranking reasons and opens the full provenance view", async () => {
    mount(
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/news/:id" element={<ArticlePage />} />
      </Routes>,
    );
    await screen.findByRole("heading", { name: newsTitle(articles[0].title) });
    const headlines = screen.getAllByRole("heading", { level: 3 });
    expect(headlines[0]).toHaveTextContent(newsTitle(articles[0].title));
    expect(screen.getByText("Cerca de tu región")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("link", {
        name: newsTitle(articles[0].title),
      }),
    );
    await screen.findByRole("heading", { name: "Fuentes y procedencia" });
    expect(
      screen.getByRole("link", { name: articles[0].sources[0].name }),
    ).toHaveAttribute("href", articles[0].sources[0].url);
    await waitFor(() =>
      expect(boundary.api.event).toHaveBeenCalledWith({
        type: "article_open",
        articleId: articles[0].id,
      }),
    );
  });
  it("updates the cached profile and refetches the feed after choosing New York", async () => {
    boundary.api.locations.mockResolvedValue({
      locations: [{ label: "New York", country: "US", region: "US-NY" }],
    });
    boundary.api.location.mockResolvedValue({
      ...profile,
      simulatedLocation: { country: "US", region: "US-NY" },
    });
    const client = mount(<Location />);
    client.setQueryData(["feed"], { items: [] });
    await userEvent.click(
      await screen.findByRole("button", { name: /Nueva York/ }),
    );
    await screen.findByText(/Ahora lees desde/);
    expect(client.getQueryData(["me"])).toMatchObject({
      simulatedLocation: { country: "US", region: "US-NY" },
    });
    expect(client.getQueryState(["feed"])?.isInvalidated).toBe(true);
    expect(boundary.api.location.mock.calls[0][0]).toEqual({
      country: "US",
      region: "US-NY",
    });
  });
  it("renders the actual answer with citations, uncertainty and source access", async () => {
    boundary.api.chat.mockResolvedValue({
      answer: "A summary grounded in stored reports.",
      citations: [
        {
          articleId: articles[0].id,
          title: articles[0].title,
          sources: [
            {
              name: "Original report",
              publisher: "Demo Desk",
              url: "https://example.com/source",
            },
          ],
        },
      ],
      uncertainty: "conflicting_sources",
      providerMode: "mock",
    });
    mount(<Chat />);
    await userEvent.type(
      screen.getByLabelText("Tu pregunta sobre las noticias"),
      "river cleanup",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar pregunta" }),
    );
    await screen.findByText("A summary grounded in stored reports.");
    expect(screen.getByText("Respuesta de demostración")).toBeInTheDocument();
    expect(screen.getByText("Versiones en conflicto")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: `Abrir noticia: ${newsTitle(articles[0].title)}`,
      }),
    ).toHaveAttribute("href", `/news/${articles[0].id}`);
    expect(
      screen.getByText("Fuentes", { exact: true }).closest("details"),
    ).not.toHaveAttribute("open");
    expect(
      screen.queryByText("Reportes usados en esta respuesta"),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("Fuentes", { exact: true }));
    expect(
      screen.getByRole("link", { name: "Demo Desk · Original report" }),
    ).toHaveAttribute("href", "https://example.com/source");
    await userEvent.click(
      screen.getByRole("button", { name: "Limpiar conversación" }),
    );
    expect(
      screen.queryByText("A summary grounded in stored reports."),
    ).not.toBeInTheDocument();
  });
  it("suggests the current local report after the reader changes region", async () => {
    const garden = articles.find(
      (article) => article.id === "demo-new-york-garden",
    )!;
    boundary.api.me.mockResolvedValue({
      ...profile,
      simulatedLocation: { country: "US", region: "US-NY" },
    });
    boundary.api.feed.mockResolvedValue({
      items: [{ article: garden, reasons: [] }],
      nextCursor: null,
    });
    mount(<Chat />);
    await userEvent.click(
      await screen.findByRole("button", { name: "¿Qué pasa cerca de mí?" }),
    );
    expect(screen.getByLabelText("Tu pregunta sobre las noticias")).toHaveValue(
      `Explícame el reporte ${newsTitle(garden.title)}`,
    );
    expect(
      screen.queryByRole("button", { name: "Cuéntame sobre educación" }),
    ).not.toBeInTheDocument();
  });
  it("gives a recovery path for an exhausted chat budget without inventing an answer", async () => {
    boundary.api.chat.mockRejectedValue(
      new ApiError(429, "BUDGET_EXCEEDED", "Budget exhausted"),
    );
    mount(<Chat />);
    await userEvent.type(
      screen.getByLabelText("Tu pregunta sobre las noticias"),
      "river cleanup",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Enviar pregunta" }),
    );
    await screen.findByRole("heading", {
      name: "El presupuesto de IA no está disponible",
    });
    expect(
      screen.queryByText("Resumen asistido por IA"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Puedes seguir leyendo/)).toBeInTheDocument();
  });
  it("honors an authoritative backend 403 even when navigation has an admin claim", async () => {
    boundary.api.adminNews.mockRejectedValue(
      new ApiError(403, "FORBIDDEN", "Admin required"),
    );
    mount(<AdminNews />);
    await screen.findByRole("heading", { name: "No tienes acceso editorial" });
    expect(
      screen.queryByRole("link", { name: "Crear noticia" }),
    ).not.toBeInTheDocument();
  });
  it("keeps generated and altered image disclosures visible with attribution", () => {
    mount(
      <NewsImage
        image={{
          url: "https://example.com/image.jpg",
          provider: "editorial",
          originalUrl: "https://example.com/image.jpg",
          license: "Demo license",
          attribution: "Demo Photographer",
          generatedByAI: true,
          alteredByAI: true,
          retrievedAt: "2026-09-26T12:00:00Z",
        }}
        title="Synthetic story"
      />,
    );
    expect(screen.getByText("Imagen generada con IA")).toBeVisible();
    expect(screen.getByText("Imagen alterada con IA")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Demo Photographer" }),
    ).toHaveAttribute("href", "https://example.com/image.jpg");
  });
});

function SidebarHarness() {
  const [open, setOpen] = useState(false);
  const background = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <div ref={background} data-testid="reader-background">
        <button onClick={() => setOpen(true)}>Abrir conversación</button>
        <p>Contenido del feed</p>
      </div>
      <ChatSidebar
        open={open}
        onClose={close}
        onOpen={() => setOpen(true)}
      />
    </>
  );
}
describe("chat sidebar lifecycle", () => {
  it("keeps the reader available behind the horizontal drawer and hides the keyboard on send", async () => {
    boundary.api.chat.mockResolvedValue({
      answer: "Respuesta con contexto conservado.",
      citations: [],
      uncertainty: "unverified",
      providerMode: "mock",
    });
    const user = userEvent.setup();
    mount(<SidebarHarness />);
    const opener = screen.getByRole("button", { name: "Abrir conversación" });
    await user.click(opener);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(screen.getByTestId("reader-background")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
    const close = screen.getByRole("button", {
      name: "Contraer conversación",
    });
    expect(opener).toHaveFocus();
    await user.type(
      screen.getByLabelText("Tu pregunta sobre las noticias"),
      "river cleanup",
    );
    expect(document.querySelector(".chat-layer")).toHaveClass(
      "is-keyboard-open",
    );
    await user.click(screen.getByRole("button", { name: "Enviar pregunta" }));
    expect(document.querySelector(".chat-layer")).not.toHaveClass(
      "is-keyboard-open",
    );
    await screen.findByText("Respuesta con contexto conservado.");
    await user.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("reader-background")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
    await user.click(opener);
    expect(
      screen.getByText("Respuesta con contexto conservado."),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("allows desktop readers to keep using the feed while the sidebar is open", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes(": reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));
    mount(<SidebarHarness />);
    const opener = screen.getByRole("button", { name: "Abrir conversación" });
    await userEvent.click(opener);
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(screen.getByTestId("reader-background").inert).not.toBe(true);
    expect(document.body.style.overflow).toBe("");
    expect(opener).toHaveFocus();
  });

  it("previews the mobile keyboard and local sample response without login or API calls", async () => {
    boundary.user = null;
    boundary.admin = false;
    function PreviewSidebarHarness() {
      const [open, setOpen] = useState(false);
      const background = useRef<HTMLDivElement>(null);
      const close = useCallback(() => setOpen(false), []);
      return (
        <>
          <div ref={background} data-testid="preview-background">
            <p>Una noticia sigue visible detrás del chat.</p>
          </div>
          <ChatSidebar
            open={open}
            onClose={close}
            onOpen={() => setOpen(true)}
            preview
            previewItems={articles.map((article) => ({ article, reasons: [] }))}
          />
        </>
      );
    }
    const user = userEvent.setup();
    mount(<PreviewSidebarHarness />);
    await user.click(screen.getByRole("button", { name: "Expandir conversación" }));

    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(screen.getByTestId("preview-background")).not.toHaveAttribute("inert");
    expect(screen.getByText(/no se envían a Firebase/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: newsTitle(articles[0].title),
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Siguiente noticia" }));
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: newsTitle(articles[1].title),
      }),
    ).toBeInTheDocument();
    const input = screen.getByLabelText("Escribe una pregunta sobre las noticias");
    await user.type(input, "¿Qué confirma la noticia?");
    expect(document.querySelector(".chat-layer")).toHaveClass(
      "is-keyboard-open",
    );
    await user.keyboard("{Enter}");
    expect(
      screen.getByText("¿Qué confirma la noticia?"),
    ).toBeInTheDocument();
    expect(document.querySelector(".chat-layer")).not.toHaveClass(
      "is-keyboard-open",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Revisando el reporte");
    expect(
      await screen.findByText(/Esta es una respuesta de muestra/, {}, { timeout: 2000 }),
    ).toBeInTheDocument();
    expect(boundary.api.chat).not.toHaveBeenCalled();
  });
});
