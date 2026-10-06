import express, {
  type Express,
  type RequestHandler,
  type ErrorRequestHandler,
} from "express";
import { ZodError, z } from "zod";
import { rankFeed } from "../domain/ranking.js";
import type { Repository } from "../repository/repository.js";
import {
  ChatService,
  MockChatProvider,
  type ChatProvider,
} from "../services/chat.js";
import { AppError } from "../services/errors.js";
import {
  ImageService,
  MockStockImageProvider,
  type ImageProvider,
} from "../services/images.js";
import { NewsService } from "../services/news.js";
import { UsageService } from "../services/usage.js";
import { UserService } from "../services/users.js";

export interface Identity {
  uid: string;
  admin: boolean;
  name: string | null;
  email: string | null;
  picture: string | null;
}
export interface AppOptions {
  repo: Repository;
  verifyToken: (token: string) => Promise<Identity>;
  now: () => string;
  budgetUsd: number;
  allowedOrigins: string[];
  chatProvider?: ChatProvider;
  imageProvider?: ImageProvider;
}
export function createApp(options: AppOptions): Express {
  const app = express();
  const news = new NewsService(options.repo, options.now);
  const users = new UserService(options.repo, options.now);
  const usage = new UsageService(options.repo, options.budgetUsd, options.now);
  const chat = new ChatService(
    options.repo,
    options.chatProvider ?? new MockChatProvider(),
    usage,
    options.now,
  );
  const images = new ImageService(
    options.imageProvider ?? new MockStockImageProvider(),
    options.now,
  );
  const identity = (locals: Record<string, unknown>) =>
    locals.identity as Identity;
  const asyncRoute = (handler: RequestHandler): RequestHandler => handler;

  app.disable("x-powered-by");
  app.use(express.json({ limit: "128kb", strict: false }));
  app.use((req, res, next) => {
    const origin = req.header("Origin");
    if (origin) {
      res.vary("Origin");
      if (!options.allowedOrigins.includes(origin))
        return next(
          new AppError("ORIGIN_FORBIDDEN", "Origin is not allowed", 403),
        );
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, OPTIONS",
      );
    }
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use(
    "/v1",
    asyncRoute(async (req, res, next) => {
      const header = req.header("Authorization");
      if (!header?.startsWith("Bearer "))
        return next(
          new AppError("UNAUTHENTICATED", "Firebase ID token required", 401),
        );
      let claims: Identity;
      try {
        claims = await options.verifyToken(header.slice(7));
      } catch {
        return next(
          new AppError("UNAUTHENTICATED", "Invalid Firebase ID token", 401),
        );
      }
      res.locals.identity = claims;
      await users.getOrCreate(claims);
      next();
    }),
  );
  const admin: RequestHandler = (_req, res, next) =>
    identity(res.locals).admin
      ? next()
      : next(new AppError("FORBIDDEN", "Administrator role required", 403));

  app.get(
    "/v1/me",
    asyncRoute(async (_req, res) =>
      res.json(await users.getOrCreate(identity(res.locals))),
    ),
  );
  app.put(
    "/v1/me/location",
    asyncRoute(async (req, res) =>
      res.json(await users.setLocation(identity(res.locals).uid, req.body)),
    ),
  );
  app.get("/v1/locations", (_req, res) =>
    res.json({
      locations: [
        { label: "Guatemala", country: "GT" },
        { label: "Guatemala City", country: "GT", region: "GT-GU" },
        { label: "United States", country: "US" },
        { label: "New York", country: "US", region: "US-NY" },
        { label: "Mexico", country: "MX" },
        { label: "Spain", country: "ES" },
      ],
    }),
  );
  app.post(
    "/v1/events",
    asyncRoute(async (req, res) =>
      res
        .status(201)
        .json(await users.recordEvent(identity(res.locals).uid, req.body)),
    ),
  );
  app.get(
    "/v1/feed",
    asyncRoute(async (req, res) => {
      const limit = z.coerce
        .number()
        .int()
        .min(1)
        .max(50)
        .parse(req.query.limit ?? 20);
      const profile = await users.getOrCreate(identity(res.locals));
      const items = rankFeed(
        await options.repo.listArticles(),
        profile,
        new Date(options.now()),
        limit,
      );
      res.json({ items, nextCursor: null });
    }),
  );
  app.get(
    "/v1/news/:id",
    asyncRoute(async (req, res) =>
      res.json(await news.getPublished(String(req.params.id))),
    ),
  );
  app.post(
    "/v1/chat",
    asyncRoute(async (req, res) => {
      const { question } = z
        .object({ question: z.string().min(3).max(1000) })
        .strict()
        .parse(req.body);
      res.json(await chat.answer(identity(res.locals).uid, question));
    }),
  );

  app.use("/v1/admin", admin);
  app.get(
    "/v1/admin/news",
    asyncRoute(async (_req, res) =>
      res.json({ items: await options.repo.listArticles() }),
    ),
  );
  app.get(
    "/v1/admin/news/:id",
    asyncRoute(async (req, res) => {
      const article = await options.repo.getArticle(String(req.params.id));
      if (!article) throw new AppError("NOT_FOUND", "Article not found", 404);
      res.json(article);
    }),
  );
  app.post(
    "/v1/admin/news",
    asyncRoute(async (req, res) =>
      res
        .status(201)
        .json(await news.createDraft(req.body, identity(res.locals).uid)),
    ),
  );
  app.patch(
    "/v1/admin/news/:id",
    asyncRoute(async (req, res) =>
      res.json(
        await news.editDraft(
          String(req.params.id),
          req.body,
          identity(res.locals).uid,
        ),
      ),
    ),
  );
  app.post(
    "/v1/admin/news/:id/sources",
    asyncRoute(async (req, res) =>
      res.json(
        await news.addSource(
          String(req.params.id),
          req.body,
          identity(res.locals).uid,
        ),
      ),
    ),
  );
  app.post(
    "/v1/admin/news/:id/assess",
    asyncRoute(async (req, res) =>
      res.json(
        await news.assess(String(req.params.id), identity(res.locals).uid),
      ),
    ),
  );
  app.put(
    "/v1/admin/news/:id/image",
    asyncRoute(async (req, res) =>
      res.json(
        await news.setImage(
          String(req.params.id),
          req.body && typeof req.body === "object" && "image" in req.body
            ? z.object({ image: z.null() }).strict().parse(req.body).image
            : req.body,
          identity(res.locals).uid,
        ),
      ),
    ),
  );
  app.post(
    "/v1/admin/news/:id/publish",
    asyncRoute(async (req, res) =>
      res.json(
        await news.publish(String(req.params.id), identity(res.locals).uid),
      ),
    ),
  );
  app.post(
    "/v1/admin/news/:id/archive",
    asyncRoute(async (req, res) =>
      res.json(
        await news.archive(String(req.params.id), identity(res.locals).uid),
      ),
    ),
  );
  app.get(
    "/v1/admin/images/search",
    asyncRoute(async (req, res) => {
      const keywords = z.string().min(2).max(100).parse(req.query.keywords);
      res.json({ images: await images.search(keywords) });
    }),
  );
  app.get(
    "/v1/admin/usage",
    asyncRoute(async (_req, res) => res.json(await usage.report())),
  );
  app.get(
    "/v1/admin/audit",
    asyncRoute(async (req, res) => {
      const articleId = req.query.articleId
        ? z.string().parse(req.query.articleId)
        : null;
      const records = await options.repo.listAudit();
      res.json({
        items: articleId
          ? records.filter((record) => record.articleId === articleId)
          : records,
      });
    }),
  );

  app.use((req, _res, next) =>
    next(
      new AppError(
        "NOT_FOUND",
        `Route ${req.method} ${req.path} not found`,
        404,
      ),
    ),
  );
  const errors: ErrorRequestHandler = (error: unknown, req, res, _next) => {
    void _next;
    const mapped =
      error instanceof AppError
        ? error
        : error instanceof ZodError
          ? new AppError(
              "INVALID_INPUT",
              "Invalid request",
              400,
              error.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            )
          : error instanceof SyntaxError
            ? new AppError("INVALID_JSON", "Malformed JSON", 400)
            : new AppError("INTERNAL", "Internal server error", 500);
    console.error(
      JSON.stringify({
        event: "api_error",
        path: req.path,
        method: req.method,
        status: mapped.status,
        code: mapped.code,
      }),
    );
    res.status(mapped.status).json({
      error: {
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details ? { details: mapped.details } : {}),
      },
    });
  };
  app.use(errors);
  return app;
}
