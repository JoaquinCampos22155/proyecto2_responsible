import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { InstallProvider } from "../components/InstallProvider";
import { Install } from "./Install";

function setup() {
  return render(
    <InstallProvider>
      <MemoryRouter>
        <Install />
      </MemoryRouter>
    </InstallProvider>,
  );
}
describe("installation without requiring sign-in", () => {
  it("provides iOS and Android instructions when a native prompt is unavailable", () => {
    setup();
    expect(
      screen.getByRole("heading", { name: "En iPhone o iPad" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "En Android" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Instalar Perspectiva" }),
    ).not.toBeInTheDocument();
  });
  it("waits for a user gesture and does not mark a dismissed prompt as installed", async () => {
    setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      { prompt, userChoice: Promise.resolve({ outcome: "dismissed" }) },
    );
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(prompt).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Instalar Perspectiva" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("más tarde"),
    );
    expect(prompt).toHaveBeenCalledOnce();
    expect(
      screen.queryByText("Ya estás usando la aplicación instalada."),
    ).not.toBeInTheDocument();
  });
  it("recognizes browser confirmation of installation", () => {
    setup();
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(
      screen.getByText("Ya estás usando la aplicación instalada."),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Instalar Perspectiva" }),
    ).not.toBeInTheDocument();
  });
});
