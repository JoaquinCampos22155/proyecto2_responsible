import { expect, test } from "@playwright/test";

test("el editor conectado corrige una noticia publicada y exige una nueva revisión humana", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.FRONTEND_EMULATOR_TEST !== "1",
    "Requiere Auth, Functions y Firestore locales.",
  );
  const api = "http://127.0.0.1:5001/demo-project2-responsible/us-central1/api";
  const login = await page.request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo",
    {
      data: {
        email: "editor@demo.test",
        password: "local-demo-only",
        returnSecureToken: true,
      },
    },
  );
  const { idToken } = await login.json();
  const headers = { Authorization: `Bearer ${idToken}` };
  const created = await page.request.post(`${api}/v1/admin/news`, {
    headers,
    data: {
      title: `[DEMO] Exposición de cerámica ${testInfo.project.name}`,
      body: "Reporte ficticio de una exposición de cerámica para probar una corrección editorial.",
      canonicalUrl: "https://example.com/editor-regression",
      scope: "national",
      countries: ["GT"],
      regions: [],
      topics: ["culture"],
      editorialPriority: "normal",
    },
  });
  expect(created.status()).toBe(201);
  const { id } = await created.json();
  expect(
    (
      await page.request.post(`${api}/v1/admin/news/${id}/sources`, {
        headers,
        data: {
          name: "Fuente ficticia para prueba",
          publisher: "Mesa de pruebas",
          url: "https://example.com/editor-source",
          sourceType: "report",
          stance: "supports",
        },
      })
    ).ok(),
  ).toBe(true);
  const initial = await page.request.post(
    `${api}/v1/admin/news/${id}/publish`,
    { headers },
  );
  const original = await initial.json();
  await page.goto("http://localhost:5174/login");
  await page
    .getByRole("button", { name: "Entrar como editor de prueba local" })
    .click();
  await expect(page.getByRole("heading", { name: "Noticias." })).toBeVisible();
  await page.goto(`http://localhost:5174/admin/news/${id}`);
  const title = page.getByRole("textbox", { name: "Titular *" });
  await expect(title).toBeDisabled();
  await page.getByRole("button", { name: "Editar como borrador" }).click();
  await expect(
    page.getByRole("dialog", { name: "Volver a borrador para editar" }),
  ).toContainText("dejará de estar disponible");
  await page
    .getByRole("button", { name: "Confirmar edición como borrador" })
    .click();
  await expect(title).toBeEnabled();
  expect(
    (await page.request.get(`${api}/v1/news/${id}`, { headers })).status(),
  ).toBe(404);
  const corrected = `[DEMO] Cerámica: texto corregido ${testInfo.project.name}`;
  await title.fill(corrected);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambio editorial guardado.")).toBeVisible();
  const saved = await page.request.get(`${api}/v1/admin/news/${id}`, {
    headers,
  });
  expect((await saved.json()).title).toBe(corrected);
  await page.getByRole("button", { name: "Revisar y publicar" }).click();
  const confirm = page.getByRole("button", {
    name: "Confirmar publicación humana",
  });
  await expect(confirm).toBeDisabled();
  await page.getByRole("checkbox", { name: /He revisado el texto/ }).check();
  await confirm.click();
  await expect(
    page.getByRole("button", { name: "Editar como borrador" }),
  ).toBeVisible();
  await expect(title).toBeDisabled();
  const visible = await page.request.get(`${api}/v1/news/${id}`, { headers });
  expect(await visible.json()).toMatchObject({
    title: corrected,
    publishedAt: original.publishedAt,
  });
  await page.screenshot({
    path: testInfo.outputPath("editor-correction-published.png"),
    fullPage: true,
  });
  expect(
    (
      await page.request.post(`${api}/v1/admin/news/${id}/archive`, { headers })
    ).ok(),
  ).toBe(true);
});

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

test("navega por noticias, Mi país, globo de 30 días y perfil sin desbordarse", async ({
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
    page.getByRole("heading", {
      name: /Noticia mundial de los últimos 30 días/,
    }),
  ).toBeVisible();
  const guatemala = page.getByRole("button", {
    name: /Guatemala: .*noticias en los últimos 30 días\. Abrir noticias\./,
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
    page.getByRole("heading", {
      name: /Noticia mundial de los últimos 30 días/,
    }),
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

test("el chat respeta el área segura de iOS y aprovecha la pantalla sobre la navegación", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("mobile"),
    "Regresión del diseño móvil instalado.",
  );
  await page.goto("/preview");
  await page.addStyleTag({
    content:
      ":root { --app-safe-top: 44px; --app-safe-bottom: 34px; --editorial-nav-height: 99px; }",
  });
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  const launcher = page.getByRole("button", { name: "Expandir conversación" });
  const navBox = (await nav.boundingBox())!;
  const launcherBox = (await launcher.boundingBox())!;
  expect(launcherBox.y + launcherBox.height).toBeLessThanOrEqual(navBox.y - 8);
  await launcher.click();
  const panel = page.getByRole("dialog", {
    name: "Conversar sobre las noticias",
  });
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.y).toBeLessThan(page.viewportSize()!.height * 0.38);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(navBox.y + 1);
  const composer = page.getByRole("textbox", {
    name: "Escribe una pregunta sobre las noticias",
  });
  const inputBox = (await composer.boundingBox())!;
  expect(inputBox.y + inputBox.height).toBeLessThan(navBox.y);
  expect(
    await composer.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
});

test("el filtro no deja una franja vacía pegada al borde superior en móvil", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("mobile"),
    "Solo cambia el filtro móvil.",
  );
  await page.goto("/preview");
  const toolbar = page.locator(".feed-toolbar");
  const y = (await toolbar.boundingBox())!.y;
  await page.mouse.wheel(0, y + 400);
  await expect
    .poll(async () => (await toolbar.boundingBox())!.y)
    .toBeLessThan(-20);
});

test("el compositor sigue el viewport visible del teclado sin restar dos veces su altura", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("mobile"),
    "Regresión de teclado móvil.",
  );
  await page.goto("/preview");
  await page.addStyleTag({
    content:
      ":root { --app-safe-top: 44px; --app-safe-bottom: 34px; --editorial-nav-height: 99px; }",
  });
  await page.getByRole("button", { name: "Expandir conversación" }).click();
  const input = page.getByRole("textbox", {
    name: "Escribe una pregunta sobre las noticias",
  });
  await input.fill("¿Qué dicen las noticias del clima?");
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      value: 430,
    });
    Object.defineProperty(window.visualViewport!, "offsetTop", {
      configurable: true,
      value: 32,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  const panel = page.getByRole("dialog", {
    name: "Conversar sobre las noticias",
  });
  await expect
    .poll(
      async () =>
        (await panel.boundingBox())!.y + (await panel.boundingBox())!.height,
    )
    .toBeLessThanOrEqual(463);
  const box = (await panel.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThan(380);
  expect(
    (await input.boundingBox())!.y + (await input.boundingBox())!.height,
  ).toBeLessThan(462);
  await expect(page.locator(".chat-news-carousel")).not.toBeVisible();
  await page.getByRole("button", { name: "Contraer conversación" }).click();
  await expect(
    page.getByRole("button", { name: "Expandir conversación" }),
  ).toBeVisible();
});

test("el chat conectado mantiene espacio para mensajes y permite enviar por toque", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.FRONTEND_EMULATOR_TEST !== "1" ||
      !testInfo.project.name.startsWith("mobile"),
    "Requiere los emuladores preparados por el runner.",
  );
  await page.goto("http://localhost:5174/login");
  await page
    .getByRole("button", { name: "Entrar como editor de prueba local" })
    .click();
  await expect(page.getByRole("heading", { name: "Noticias." })).toBeVisible();
  await page.addStyleTag({
    content:
      ":root { --app-safe-top: 44px; --app-safe-bottom: 34px; --editorial-nav-height: 99px; }",
  });
  await page.getByRole("button", { name: "Expandir conversación" }).click();
  expect(
    await page.locator(".chat-scroll").evaluate((el) => el.clientHeight),
  ).toBeGreaterThan(200);
  const input = page.getByRole("textbox", {
    name: "Tu pregunta sobre las noticias",
  });
  expect(
    await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: testInfo.outputPath("ios-chat-open.png") });
  await input.fill("¿Hay noticias del clima?");
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport!, "height", {
      configurable: true,
      value: 430,
    });
    Object.defineProperty(window.visualViewport!, "offsetTop", {
      configurable: true,
      value: 0,
    });
    window.visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect
    .poll(
      async () =>
        (await input.boundingBox())!.y + (await input.boundingBox())!.height,
    )
    .toBeLessThanOrEqual(430);
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(page.locator(".answer-text")).toContainText("meteorológicos");
  await expect(page.locator(".chat-layer")).not.toHaveClass(/is-keyboard-open/);
  await expect(input).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("ios-chat-answer.png") });
  await input.fill("háblame de la noticia de qué trata");
  const followUpRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/v1/chat") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  const body = (await followUpRequest).postDataJSON();
  expect(body.history[0].articleIds).toEqual(["demo-international-weather"]);
  await expect(page.locator(".answer-text")).toHaveCount(2);
  await expect(page.locator(".answer-text").last()).toContainText(
    "meteorológicos",
  );
  await input.fill("hazme código Python para esos datos");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(page.locator(".answer-text")).toHaveCount(3);
  await expect(page.locator(".answer-text").last()).toContainText(
    "Solo puedo ayudarte con las noticias",
  );
  // Client-side navigation keeps the transcript mounted but must reset its
  // reference scope to the newly opened article.
  await page
    .locator('.chat-source-avatar[href="/news/demo-international-weather"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/news\/demo-international-weather$/);
  await page.getByRole("button", { name: "Expandir conversación" }).click();
  await input.fill("¿De qué trata?");
  const openRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/v1/chat") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  expect((await openRequest).postDataJSON()).toEqual({
    question: "¿De qué trata?",
    currentArticleId: "demo-international-weather",
  });
  await expect(page.locator(".answer-text").last()).toContainText(
    "meteorológicos",
  );
  await input.fill("¿Tienes noticias sobre bibliotecas?");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(page.locator(".answer-text").last()).toContainText("biblioteca");
  await input.fill("Explícalo más sencillo");
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
  await expect(page.locator(".answer-text")).toHaveCount(6);
  await expect(page.locator(".answer-text").last()).toContainText("biblioteca");
});
