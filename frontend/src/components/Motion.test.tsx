import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Link, Routes, Route } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { MotionSurface } from "./Motion";
it("cleans up animated route contexts under StrictMode without a recursive context crash", async () => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("no-preference"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  const view = render(
    <StrictMode>
      <MemoryRouter>
        <MotionSurface>
          <Link to="/article">Abrir noticia</Link>
          <Routes>
            <Route
              path="/"
              element={<h1 className="page-heading">Noticias</h1>}
            />
            <Route
              path="/article"
              element={<h1 className="article-header">El contexto</h1>}
            />
          </Routes>
        </MotionSurface>
      </MemoryRouter>
    </StrictMode>,
  );
  await userEvent.click(screen.getByRole("link", { name: "Abrir noticia" }));
  expect(
    screen.getByRole("heading", { name: "El contexto" }),
  ).toBeInTheDocument();
  expect(() => view.unmount()).not.toThrow();
});
