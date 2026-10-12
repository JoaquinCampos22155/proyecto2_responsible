import { expect, test } from "@playwright/test";

test("serves an installable manifest and an offline installation page", async ({
  page,
  request,
  context,
}) => {
  await page.goto("/install");
  await expect(
    page.getByRole("heading", { name: "Las noticias, a un toque." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const manifestURL = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  const manifest = await (await request.get(manifestURL!)).json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "es",
  });
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).ok()).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send(
    "Page.getInstallabilityErrors",
  );
  expect(installabilityErrors).toEqual([]);
  await cdp.detach();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Las noticias, a un toque." }),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      )
    ).flat();
  });
  expect(
    cached.some(
      (url) => url.includes("/v1/") || url.includes("identitytoolkit"),
    ),
  ).toBe(false);
});
