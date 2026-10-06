import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, it, expect, vi } from "vitest";
import { useState, useRef, useCallback, type ReactNode } from "react";
import seed from "./sample-news.json";
import type { Article, UserProfile } from "../types/domain";
import { ApiError } from "../api/client";
const boundary = vi.hoisted(() => ({
  api: {
    me: vi.fn(),
    feed: vi.fn(),
    news: vi.fn(),
    locations: vi.fn(),
    location: vi.fn(),
    event: vi.fn(),
    chat: vi.fn(),
    adminNews: vi.fn(),
  },
  user: { uid: "reader", displayName: "Reader", email: "reader@example.test" },
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
import { Layout } from "../components/Layout";
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
  boundary.api.me.mockResolvedValue(profile);
  boundary.api.feed.mockResolvedValue({
    items: articles.map((article, index) => ({
      article,
      reasons: index === 0 ? ["Relevant to your selected region"] : [],
    })),
    nextCursor: null,
  });
  boundary.api.news.mockImplementation(async (id: string) =>
    articles.find((a) => a.id === id),
  );
  boundary.api.event.mockResolvedValue({ profile });
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
      within(screen.getByRole("navigation", { name: "Principal" })).queryByRole(
        "button",
        { name: "Conversar" },
      ),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Contraer conversación" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const expand = screen.getByRole("button", {
      name: "Expandir conversación",
    });
    await userEvent.click(
      within(screen.getByRole("navigation", { name: "Principal" })).getByRole(
        "link",
        { name: "La portada" },
      ),
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
        background={background}
      />
    </>
  );
}
describe("chat sidebar lifecycle", () => {
  it("preserves the answer when reopened and restores mobile focus and background access", async () => {
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
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByTestId("reader-background").inert).toBe(true);
    const close = screen.getByRole("button", {
      name: "Contraer conversación",
    });
    expect(close).toHaveFocus();
    await user.type(
      screen.getByLabelText("Tu pregunta sobre las noticias"),
      "river cleanup",
    );
    await user.click(screen.getByRole("button", { name: "Enviar pregunta" }));
    await screen.findByText("Respuesta con contexto conservado.");
    await user.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByTestId("reader-background").inert).toBe(false);
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
});
