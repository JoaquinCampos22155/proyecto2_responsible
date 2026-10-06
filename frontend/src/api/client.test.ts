import { describe, expect, it, vi } from "vitest";
import { createClient, ApiError } from "./client";
describe("authenticated API boundary", () => {
  it("refreshes an expired token once and uses the new bearer token", async () => {
    const token = vi
      .fn()
      .mockResolvedValueOnce("old")
      .mockResolvedValueOnce("new");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHENTICATED", message: "expired" },
          }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ uid: "reader" })));
    const client = createClient("https://api.example", token, fetcher);
    expect(await client.request("/v1/me")).toEqual({ uid: "reader" });
    expect(token.mock.calls).toEqual([[false], [true]]);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe("Bearer new");
  });
  it("stops retrying unauthorized requests and preserves error details", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: "UNAUTHENTICATED", message: "Sign in again" },
            }),
            { status: 401 },
          ),
        ),
      );
    await expect(
      createClient("https://api.example", async () => "token", fetcher).request(
        "/v1/me",
      ),
    ).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not retry forbidden writes or hide form validation details", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "INVALID_INPUT",
              message: "Invalid request",
              details: [{ path: "title", message: "too short" }],
            },
          }),
          { status: 400 },
        ),
      );
    try {
      await createClient(
        "https://api.example",
        async () => "token",
        fetcher,
      ).request("/v1/admin/news", { method: "POST", body: { title: "x" } });
      throw Error("unexpected");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).details).toEqual([
        { path: "title", message: "too short" },
      ]);
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("serializes null image removal and never sends a caller UID in events", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response("{}")));
    const client = createClient(
      "https://api.example",
      async () => "token",
      fetcher,
    );
    await client.image("id", null);
    await client.event({
      type: "share",
      articleId: "id",
      uid: "attacker",
    } as never);
    expect(fetcher.mock.calls[0][1].body).toBe('{"image":null}');
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
      type: "share",
      articleId: "id",
    });
  });
});
