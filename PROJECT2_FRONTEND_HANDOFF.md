# Project 2 frontend handoff — Perspectiva

## Status

Frontend implemented and verified locally. Vite dev server runs on http://localhost:5173 against the deployed Project 2 API. A public read-only sample edition at /preview is generated from backend seed data, explicitly fictional and without tracking/personalization. The community submission flow and admin moderation queue are implemented locally; no production deployment has been requested.

## Stack and boundary

React 19, TypeScript, Vite 7, Tailwind 4, React Router 7, TanStack Query 5, Firebase Web SDK 12, lucide icons, self-hosted DM Sans and Newsreader, Vitest 3 and Testing Library. Frontend lives in frontend/; backend source/contracts remain authoritative. One verified transport compatibility extension is documented below. Admin bundles load lazily.

## Local commands

For local development, start the demo emulators from the repository root as described in README, then from frontend/ copy .env.example to .env.local; it uses dummy Firebase values, the demo project and local emulator/API URLs. Run npm ci, npm run dev (strict port 5173), npm run lint, npm run typecheck, npm test and npm run build. npm run preview serves the production bundle on 4173. Use a separate ignored file only when intentionally testing Project 2, and verify the target before starting the app. Course policy keeps even the public Firebase Web API key in ignored local configuration. Never place Gemini, Pexels, service-account or billing credentials in browser configuration.

## Routes

/login: Google sign-in; /: backend feed with the session-only grounded chat sidebar open (initial authenticated screen); /feed: backend-ordered feed; /news/:id: article and provenance; /location: simulated region; /profile: signed-in account grid backed by that account's submissions; /profile/new: authenticated sourced-report form; /about: product transparency; /preview and /preview/news/:id: public fictional sample snapshot; /preview/profile/new: visual-only composer preview; /admin/news: editorial CMS; /admin/submissions: community moderation with date/country filters, approval and permanent deletion; /admin/news/new and /admin/news/:id: editorial CMS; /admin/audit: history; /admin/usage: actual estimated cost report. Reader and submission require authentication; editorial navigation checks custom claims and handles API 403.

## Configuration and authentication

Project ID allowlist contains only proyecto2responsibleai and demo-project2-responsible. Auth uses Google popup and an explicit redirect alternative for mobile/PWA. onIdTokenChanged initializes state, reads the admin claim and clears cached data when the user changes. Same-user token refresh preserves active queries, and late claim promises cannot restore a signed-out session. Central typed client retrieves a token for every API call, refreshes once after 401, parses structured backend validation details and stops retrying forbidden writes. Sign-out clears server state. Production base: https://us-central1-proyecto2responsibleai.cloudfunctions.net/api. Local origin 5173 is already authorized. Custom production origins need Firebase Auth and backend CORS configuration.

## API and server state

src/api/client.ts maps exactly to backend /v1 routes; no direct Firestore writes, no frontend ranking. src/api/queries.ts defines shared query keys. Location PUT updates profile and immediately invalidates feed. Admin changes invalidate the article, list, reader feed and audit. Evidence states describe source origins, never truth verdicts. Chat cites at most three stored reports, exposes original sources and assistance/uncertainty. No transcript persistence.

## Design

Original Perspectiva identity derived from supplied magazine screenshots: cool white paper, navy ink, restrained red, varied lead/secondary/compact stories, readable serif body, fine rules and minimal containers. Missing news images remain text-led. Decorative welcome photograph is explicitly illustrative, public domain by Jonathandpg4, from Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Volcan_Agua-Antigua_Guatemala.jpg. Preserve source attribution. Photographs supplied by the backend retain attribution, license, source link and generated/altered/stock labels.

## PWA

Manifest: standalone, Spanish, theme/background, 192/512 icons and maskable icon. Workbox precaches app assets; API responses and auth tokens are not cached by the service worker. The app shows network status and recovery screens; offline.html is available. Service-worker updates ask before replacing an active editing session. Production installability must be checked from the built bundle, not Vite development.

## Emulator setup

Root: build backend, start Firebase auth/firestore/functions/storage for demo-project2-responsible; seed using FIREBASE_PROJECT_ID=demo-project2-responsible FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed. Frontend configuration uses VITE_USE_EMULATORS=true, the demo project, Storage bucket, Auth at 9099, Storage at 9199 and API at 5001. The new composer requires VITE_FIREBASE_STORAGE_BUCKET; backend cleanup uses FIREBASE_STORAGE_BUCKET. Use --mode qa only with ignored .env.qa.local. Because the function binds GEMINI_API_KEY, mock emulator runs use an ignored .secret.local with an unused placeholder value (GEMINI_API_KEY=local-unused). Never copy a real key into browser configuration. Local QA on 5174 requires CORS_ORIGINS to include http://localhost:5174 in the ignored demo env. A DEV-only emulator account shortcut is unavailable in production builds. Real admin access requires operator-provisioned Firebase custom claim and token refresh.

## Deployment

Build frontend/, then from frontend/ run ../node_modules/.bin/firebase deploy --config firebase.json --project proyecto2responsibleai --only hosting when deployment is requested. This separate Hosting config does not redeploy Functions. Never use an untargeted deploy or Project 1.

## Verification, audit, limitations

Frontend lint, TypeScript and production build pass. 25 unit/component tests pass; 3 additional integration tests pass against real Auth/Functions/Firestore emulators. Backend regression: 64 tests. Production API health is HTTP 200 after the compatibility deployment. An existing real Google session in regular Chrome loaded all 12 production articles through the deployed API. A fresh sign-in attempt in the in-app browser returned auth/network-request-failed; this is not evidence of a completed fresh OAuth flow.

Actual browser emulator flows verified: grounded chat and citations, no-evidence answer, region → feed, reading interests, backend-enforced non-admin 403, editorial create/edit/add source/assess/image search/select/remove/preview/human-review publish/archive, history and budget. Component tests verify expired token refresh, API validation, budget error and image disclosures. Browser responsive checks cover 56 populated-surface cases (8 surfaces × 320/375/390/430/768/1280/1920), with effective viewport validation and no horizontal overflow. The lazy editorial captures were explicitly recaptured after their populated headings appeared. Synthetic secondary-image fixture confirms both AI labels and attribution remain visible outside the image crop, with a 44px attribution target.

Built-bundle browser inspection found the manifest and confirmed the service-worker offline-ready log. A subsequent build triggered the update prompt; Actualizar loaded the corrected version. After stopping preview4173, reloading /preview still rendered the cached app and fictional sample edition. Manifest/icons and generated SW exist. API responses and tokens are deliberately excluded from offline caching; opening cached app assets does not mean offline news can be fetched. Actual phone Google sign-in, installation, standalone launch and share behavior remain physical-device tests.

Impeccable detector ran once and returned []; independent review requested six focused fixes, applied in one batch and all scored resolved on valid recaptures (ship, scoped 17/20): disclosure clipping, placeholder contrast, contextual prompts, metadata placement, attribution targets, and persisted direction contract. Verdict details: docs/qa/impeccable-audit.md. The initial raster provenance scan covered four files; the current scan covers 40 rasters with zero missing origins/prompts.

Production Gemini chat is active via a Secret Manager binding. Pexels stock search remains a mock. All 12 production demo articles now have real, distinct built-in image_gen illustrations in an isolated Project 2 Cloud Storage bucket, with URL metadata in Firestore and visible generated/illustrative labels. No native packaging was built.

### Verified transport mismatch (2026-10-03)

The handoff specifies JSON null for image removal. An actual Auth → Functions emulator → Firestore integration failed on PUT .../image with body `null`: Firebase's outer strict JSON parser rejects the primitive before createApp executes (non-JSON 400). Express unit tests alone do not cover this transport boundary. Implemented correction: accept the exact additional envelope `{image:null}` on the existing image route, retain raw null compatibility for direct Express consumers, and the frontend now uses the envelope. Article/ImageRecord schema and ranking/providers stay unchanged. Regression and real-emulator tests verify it. Deployed successfully on 2026-10-03 with `firebase deploy --project proyecto2responsibleai --only functions:api`; no Hosting or Project 1 deployment occurred.

## Remaining for a phone demo / production release

1. Deploy the supplied separate frontend Hosting configuration when requested; authorize that exact HTTPS origin in Firebase Auth and API CORS.
2. Verify a fresh Google login and token → API → feed on a physical iPhone and Android, then install and reopen the PWA, test updates and sharing.
3. Provision the intended production editor's custom admin claim with the existing backend operator workflow, then refresh its token. No production user was promoted during frontend QA.
4. Pexels remains optional; activate it only if stock search is needed, using a server secret. Gemini is already enabled. Browser code receives neither key.
5. Replace clearly fictional Spanish DEMO reports with reviewed real content for the final presentation if needed.

## Process lifecycle

Only the requested development service on localhost:5173 is intentionally retained. QA5174, built preview4173 and demo Firebase emulators are temporary and are stopped after final verification. The user's regular Chrome session is preserved.

## Generated demo media and motion update

User-authorized import: 12 distinct illustrations; 36 WebP files (480/800/1200px, quality 78), 2,382,392 bytes total, largest file 186,274 bytes. Original prompts and optimized variants are recorded in `docs/qa/demo-image-prompts.json`; local reproducible assets live in `frontend/public/demo-news`. `docs/qa/demo-media-verification.json` records read-back verification of all 12 Firestore news images and all 36 unauthenticated public WebP objects.

Bucket: `proyecto2responsibleai-demo-media`, US-CENTRAL1, object versioning enabled. Each synthetic demo asset is publicly readable, immutable and revision-named. Firestore `news/{demo-id}.image` stores URL/provenance/AI flags; `demoImageAssets/{demo-id}` stores three variant URLs, dimensions, byte counts and generation prompt. Import audit entries record the operator workflow. No credentials or image blobs are in browser code or Firestore. Chat/stock APIs were not changed or enabled by this one-time media import. Generated assets are not included in the backend's $20 Gemini token estimate.

`gsap` and `@gsap/react` provide scoped route entrances, photo hover response, button press feedback and sidebar staging. Contexts/listeners/observers revert on route changes or unmount; reduced-motion disables animation. All decorative eyebrows were removed. Apple and The Verge references from awesome-design-md informed restrained chrome, image-led spacing and editorial hierarchy; Perspectiva retains its original palette and typography.

Desktop chat occupies 400px alongside the feed. Below 1200px it becomes a modal overlay with background inertness, scroll containment, Escape, focus containment and focus restoration. The composer stays visible while conversation content scrolls. Closing/reopening and reader route navigation preserve the in-memory conversation; a reload or leaving the reader layout clears it. Mobile article links close the overlay to expose the requested article.

Reproducible media tools: `scripts/media/optimize-demo.py` (Pillow), `scripts/media/publish-demo-images.cjs` (existing Firebase operator credentials, fixed Project 2 only). Re-running the original news seed resets these demo images to its placeholder metadata; retain the generated manifest and reapply approved image metadata when reseeding. Do not run the publisher speculatively: it performs uploads and a preconditioned atomic Firestore commit.

## Spanish edition and scanning correction — 2026-10-03

The feed offers sticky section links (featured, interests when available, selected country, international and other regions), a topic filter, and photographic lead stories in every section with compact evidence footers. The first three stories retain server order; the remaining partition preserves order inside each group without duplicating articles. Country relevance shows the selected country name. Climate/weather aliases share one Clima filter. All twelve production demo titles, summaries, bodies and source display names are Spanish; the operator patched only content fields and preserved images, human review and publication timestamps. Never reseed production to translate content.

The chat clear action is directly below Conversar. Its input is the last element, pinned to the bottom and centered with Send; conversation scroll is independent. No extra explore-all link is shown in the sidebar. General Spanish news questions use the deterministic personalized feed as context; specific topic questions use accent-normalized words and Spanish aliases, capped at three published articles. Unknown topics still produce an honest no-evidence response. Weather content is a fictional academic exercise, not a real forecast.

Gemini is active in deployed Project 2 API (AI_PROVIDER=gemini; GEMINI_API_KEY version 1 bound from Secret Manager). Health returned 200. The existing real Google reader session displayed a response to “que noticias hay” labeled Resumen asistido por IA with three source-backed citations. Firestore recorded gemini-3.5-flash-lite, 246 input tokens and 49 output tokens. Exact reported questions were also exercised through the local full Auth→API→Firestore flow; a direct real Gemini weather call returned a Spanish grounded answer. See docs/qa/production-gemini-verification.json. A CLI OAuth token cannot substitute for a Web Google OAuth token (audience rejected); no auth bypass was added.

New responsive evidence: .impeccable/review/redesign-responsive.json records feed and chat at 320, 390, 480, 768, 1024, 1199, 1200, 1280 and 1440px. No horizontal overflow; send/input vertical centers agree and composer remains inside the viewport. Old audit screenshots and counts are historical and do not certify this correction.

The independent correction review found no material UI issues; its sole stale documentation finding was fixed and scored resolved. Final disposition: ship (scoped persistence fix, following a full surface review). Current report: docs/qa/impeccable-redesign-audit.md.

Final lifecycle verification: emulator and QA Vite processes exited, ports 5174/8080/9099/5001/4400/9150 released. Only requested localhost5173 remains (npm4088 → Vite4114 → esbuild4119), owned by this development task for continued user preview. All three were idle during final check. The regular user Chrome session was preserved.

## Compact edition and citations — 2026-10-03

Latest user-requested presentation: compact 28px Noticias header, combined section/filter toolbar, full-column supporting photographs, and an independent large lead for each nonempty section. Incoming backend order and twelve unique records are preserved. Shared newsTitle removes the [DEMO] prefix only from displayed titles (including citations, sharing and admin lists); stored records and factual content are unchanged. The feed keeps one small illustrative-edition note, while AI image labels and credit links remain on article detail rather than every card.

ChatSources replaces the large report list with up to three circular image links and an initially closed native Fuentes disclosure. It opens with Enter and preserves article/original source links. Evidence and provider labels remain compact, without duplicated explanatory copy. The composer, clearing behavior and sidebar focus handling are unchanged.

Verification for this revision: 25 frontend unit/component tests pass, lint/typecheck/build pass. Eight browser widths (320,390,620,768,920,1024,1280,1440) have no overflow, twelve headlines, four section leads and no legacy image-credit nodes. Evidence: .impeccable/review/compact-responsive.json and compact-desktop/mobile/guatemala.jpg. compact-chat-sources.jpg is an isolated fixture rendering the actual ChatSources component, explicitly labeled sample content; it verifies the 44px source row and loaded thumbnails, not a fresh production Gemini request. Temporary fixture entry files were removed after inspection. Prior backend/emulator/production AI checks remain historical evidence; no backend redeploy was needed. Requested localhost5173 remains running.

## Varied section hierarchy — 2026-10-03

The accepted refinement replaces repeated subsection covers with semantic compositions. Destacadas keeps the photographic overlay cover. Country reporting uses a plain photographic feature with adjacent dispatches; a single country report splits image and text on wide screens. Internacional uses a full-width image/ink-text band with a row of supporting photographs beneath. Otras regiones uses a Newsreader feature beside a compact illustrated list containing all supporting reports. Interests use a softer feature and condensed rail. Each section's first returned report remains its lead; incoming order and uniqueness are unchanged. No new importance score, labels or factual claims were added.

Containers below 620px stack the country/world feature; regional dispatches retain their illustrated list. The first browser pass found a real 768px overflow: the inherited secondary two-column grid squeezed the regional list. A one-column regional rail corrected it. Final eight-width browser checks preserve twelve headlines without overflow (varied-responsive.json). Desktop/mobile evidence is varied-desktop.jpg, varied-regions.jpg and varied-mobile.jpg in .impeccable/review. Temporary browsers/processes were not started; requested5173 is retained.

## Reading onward and persistent conversation — 2026-10-03

Each reader article now ends with Sigue leyendo: up to three other published records from the current edition, preferring shared topics and preserving incoming order inside each group. The current article, drafts, archives and duplicate IDs are excluded. A permanent Ver la portada link also works when there are no candidate reports. Links reuse the actual reader route and its article_open/read tracking. Public preview uses the same component with its synthetic dataset and /preview links; embedded editorial previews omit this section.

Conversar was removed from desktop and mobile navigation. Desktop reader and public-preview layouts open the 400px companion by default, including direct article URLs. Contraer conversación changes it into a 56px rail; Expandir conversación restores it. Collapse and the in-memory conversation persist across reader navigation. Mobile starts with a 48px corner control to preserve reading; expanding retains the focus-protected overlay, Escape and return-focus behavior. Public preview shows an explicit Google sign-in invitation rather than making unauthenticated chat requests or fabricating AI answers. The article reading grid now responds to its available container width when chat is open.

Verification: 27 unit/component tests pass; lint and production build pass. New regressions cover exclusion of unpublished/duplicate/current candidates, real related-article navigation, direct-route default desktop opening, removal of the navbar chat action and collapse persistence. Browser inspection followed library→school through a related link with the panel collapsed, then restored it. Mobile Escape restored the launcher focus and page scroll. Eight collapsed article widths and three expanded desktop widths have no horizontal overflow, with three related reports throughout. Evidence is article-responsive.json, article-open-responsive.json, article-related-sidebar.jpg and article-related-mobile.jpg under .impeccable/review. No production deployment or new AI invocation was required. Requested localhost5173 remains running.
