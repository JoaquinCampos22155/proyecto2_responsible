# Perspectiva PWA

See [frontend handoff](../PROJECT2_FRONTEND_HANDOFF.md) for configuration, routes, verification and release limitations.

```sh
npm ci
# Fill ignored .env.local using .env.example and Project 2 public Web SDK configuration.
npm run dev # http://localhost:5173
npm run lint
npm run typecheck
npm test
npm run build
```

Production API: Project2 only. No Gemini/Pexels keys belong in browser configuration. The public `/preview` route displays explicitly fictional backend seed content without authentication or telemetry. Reader and editor use the actual centralized API. Editor access requires a server-verified admin claim.
