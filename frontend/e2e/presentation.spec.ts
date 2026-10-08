import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
}

test("mantiene el ancho del contenido en móvil, tablet y escritorio", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("desktop"),
    "La matriz de anchos corre una sola vez por corrida de navegador.",
  );
  const widths = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];

  for (const [index, width] of widths.entries()) {
    await page.setViewportSize({ width, height: 900 });
    if (index === 0) await page.goto("/preview");
    else await page.reload();
    await expect(
      page.getByRole("heading", { name: "Noticias." }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("navega por noticias, Mi país, globo semanal y perfil sin desbordarse", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  await page.route("https://**/*", (route) => route.abort());
  page.on("request", (request) => {
    if (request.url().includes("/v1/")) apiRequests.push(request.url());
  });

  await page.goto("/preview");
  await expect(page.getByRole("heading", { name: "Noticias." })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(nav).toBeVisible();
  await expect(nav.getByRole("link", { name: "Noticias." })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expectNoHorizontalOverflow(page);

  await nav.getByRole("link", { name: "Mi país" }).click();
  await expect(
    page.getByText("Vista de país · ubicación simulada: Guatemala"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lo más importante" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await nav.getByRole("link", { name: "Globo" }).click();
  await expect(
    page.getByRole("heading", { name: "Mapa de noticias." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Noticia mundial de la semana." }),
  ).toBeVisible();
  const guatemala = page.getByRole("button", {
    name: /Guatemala: .*noticias esta semana\. Abrir noticias\./,
  });
  await expect(guatemala).toBeVisible();
  const unavailableCountries = page.locator(
    ".globe-country:not(.has-news):not([data-country-code])",
  );
  await expect(unavailableCountries.first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await guatemala.click();
  await expect(page).toHaveURL(/\/preview\/globe\/gt$/);
  await expect(page.getByRole("heading", { name: "Guatemala." })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Noticias de Guatemala" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Volver al globo" }).click();
  await expect(page).toHaveURL(/\/preview\/globe$/);
  await expect(
    page.getByRole("heading", { name: "Noticia mundial de la semana." }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await nav.getByRole("link", { name: "Perfil" }).click();
  await expect(page.getByRole("heading", { name: /Ana López/ })).toBeVisible();
  await expect(page.getByText("publicados")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Subir noticia/ }).click();
  await expect(
    page.getByRole("heading", { name: /Comparte un reporte/ }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(apiRequests).toEqual([]);
});

test("el chat conserva la lectura y cambia de modo al escribir y enviar", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("mobile"),
    "El carrusel de lectura simultánea es el comportamiento del diseño móvil.",
  );
  const apiRequests: string[] = [];
  await page.route("https://**/*", (route) => route.abort());
  page.on("request", (request) => {
    if (request.url().includes("/v1/")) apiRequests.push(request.url());
  });

  await page.goto("/preview");
  await page.getByRole("button", { name: "Expandir conversación" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Conversar sobre las noticias",
  });
  await expect(dialog).toBeVisible();
  const carousel = page.locator(".chat-news-carousel");
  await expect(carousel).toHaveAttribute(
    "aria-label",
    "Noticias para leer mientras conversas",
  );
  await expect(carousel).toBeVisible();
  await expect(carousel.getByText("1 /", { exact: false })).toBeVisible();
  await carousel.getByRole("button", { name: "Siguiente noticia" }).click();
  await expect(carousel.getByText("2 /", { exact: false })).toBeVisible();

  const input = page.getByRole("textbox", {
    name: "Escribe una pregunta sobre las noticias",
  });
  await input.fill("¿Qué pasó esta semana?");
  await expect(page.locator(".chat-layer")).toHaveClass(/is-keyboard-open/);
  await expect(carousel).toHaveClass(/is-covered/);
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "Revisando el reporte y sus fuentes",
  );
  await expect(page.locator(".chat-layer")).not.toHaveClass(/is-keyboard-open/);
  await expect(carousel).not.toHaveClass(/is-covered/);
  await expect(
    page.getByText("Esta es una respuesta de muestra."),
  ).toBeVisible();
  await expect(carousel).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(apiRequests).toEqual([]);
});
