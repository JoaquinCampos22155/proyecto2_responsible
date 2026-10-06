import type {
  Article,
  AuditRecord,
  ChatResponse,
  DraftInput,
  EventInput,
  FeedItem,
  ImageRecord,
  LocationInput,
  SourceInput,
  Usage,
  UserProfile,
} from "../types/domain";
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}
type Options = { method?: string; body?: unknown; signal?: AbortSignal };
export function createClient(
  base: string,
  getToken: (refresh: boolean) => Promise<string>,
  fetcher: typeof fetch = fetch,
) {
  async function request<T>(path: string, options: Options = {}): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await getToken(attempt === 1);
      let response: Response;
      try {
        response = await fetcher(`${base.replace(/\/$/, "")}${path}`, {
          method: options.method ?? "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          ...(options.body !== undefined
            ? { body: JSON.stringify(options.body) }
            : {}),
          signal: options.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          throw error;
        throw new ApiError(
          0,
          "NETWORK",
          "No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.",
        );
      }
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiError(
          response.status,
          "INVALID_RESPONSE",
          "El servicio no devolvió una respuesta válida. Inténtalo de nuevo.",
        );
      }
      if (response.ok) return payload as T;
      if (response.status === 401 && attempt === 0) continue;
      const backend = payload as {
        error?: {
          code?: string;
          message?: string;
          details?: { path: string; message: string }[];
        };
      };
      throw new ApiError(
        response.status,
        backend.error?.code ?? "UNKNOWN",
        backend.error?.message ?? "El servicio no está disponible.",
        backend.error?.details ?? [],
      );
    }
    throw new ApiError(401, "UNAUTHENTICATED", "Vuelve a iniciar sesión.");
  }
  const articlePath = (id: string) =>
    `/v1/admin/news/${encodeURIComponent(id)}`;
  return {
    request,
    me: () => request<UserProfile>("/v1/me"),
    feed: () =>
      request<{ items: FeedItem[]; nextCursor: null }>("/v1/feed?limit=50"),
    news: (id: string) =>
      request<Article>(`/v1/news/${encodeURIComponent(id)}`),
    locations: () =>
      request<{ locations: (LocationInput & { label: string })[] }>(
        "/v1/locations",
      ),
    location: (body: LocationInput) =>
      request<UserProfile>("/v1/me/location", { method: "PUT", body }),
    event: ({ type, articleId, durationSeconds, topic }: EventInput) =>
      request<{ profile: UserProfile }>("/v1/events", {
        method: "POST",
        body: {
          type,
          articleId,
          ...(durationSeconds !== undefined ? { durationSeconds } : {}),
          ...(topic ? { topic } : {}),
        },
      }),
    chat: (question: string) =>
      request<ChatResponse>("/v1/chat", { method: "POST", body: { question } }),
    adminNews: () => request<{ items: Article[] }>("/v1/admin/news"),
    adminArticle: (id: string) => request<Article>(articlePath(id)),
    create: (body: DraftInput) =>
      request<Article>("/v1/admin/news", { method: "POST", body }),
    edit: (id: string, body: Partial<DraftInput>) =>
      request<Article>(articlePath(id), { method: "PATCH", body }),
    source: (id: string, body: SourceInput) =>
      request<Article>(`${articlePath(id)}/sources`, { method: "POST", body }),
    assess: (id: string) =>
      request<Article>(`${articlePath(id)}/assess`, { method: "POST" }),
    images: (keywords: string) =>
      request<{ images: ImageRecord[] }>(
        `/v1/admin/images/search?keywords=${encodeURIComponent(keywords)}`,
      ),
    image: (id: string, body: ImageRecord | null) =>
      request<Article>(`${articlePath(id)}/image`, {
        method: "PUT",
        body: body === null ? { image: null } : body,
      }),
    publish: (id: string) =>
      request<Article>(`${articlePath(id)}/publish`, { method: "POST" }),
    archive: (id: string) =>
      request<Article>(`${articlePath(id)}/archive`, { method: "POST" }),
    audit: (id?: string) =>
      request<{ items: AuditRecord[] }>(
        `/v1/admin/audit${id ? `?articleId=${encodeURIComponent(id)}` : ""}`,
      ),
    usage: () => request<Usage>("/v1/admin/usage"),
  };
}
export type Client = ReturnType<typeof createClient>;
