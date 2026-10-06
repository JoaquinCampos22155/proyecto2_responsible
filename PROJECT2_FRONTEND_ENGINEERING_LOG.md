# Frontend engineering log

## 2026-10-03 — Contract and scaffold

Problem: an existing backend needed a responsive editorial PWA. Hypothesis: isolated frontend/ plus typed boundaries protects the existing backend. Implemented: contract-derived API, real Firebase configuration in ignored .env.local, reader/editor routes, public sample snapshot generated from backend seed (no invented production news). Tests: token retry/error boundaries, strict event/image payloads, evidence/image disclosure, aggregated reading events and editorial payload normalization. Observation: a reused Response test fixture consumed its body on retry; corrected the mock to return a fresh Response per HTTP request. Eleven targeted tests pass at this stage.

## 2026-10-03 — Initial visual inspection

Implemented: self-hosted fonts, original editorial identity, local optimized public-domain welcome photograph, neutral evidence labels, text-led layouts for absent images. Observation: in-app browser Google popup returned an auth error; independent emulator and integration verification follows. Production configuration and auth redirect alternative are present; no success claim made for that browser flow yet.

## 2026-10-03 — Transport integration and authentication

Problem: image removal accepted by Express tests failed before routing in the Firebase Functions strict JSON parser. Evidence: actual emulator request body null returned non-JSON400. Documented before changing the contract; added exact {image:null} compatibility envelope, retaining direct Express null support. Verified 49 backend tests and three frontend client → Firebase emulator workflows; deployed only Project2 API. Health200 afterwards.

Problem: an existing authenticated Chrome session remained on loading. Root cause: same-user onIdTokenChanged cleared active Query objects; active observers then stayed pending. A regression test failed before correction. Cache clearing now follows UID changes, not every token event. Added a revision guard for claims resolving after logout. Tests pass and the real Chrome production session loads twelve articles. In-app browser fresh OAuth fails with auth/network-request-failed, so fresh phone login remains unverified.

## 2026-10-03 — Browser, PWA and independent audit

Verified the complete reader/editor workflow with demo Auth/Functions/Firestore and real UI mutations. Published only a clearly fictional emulator article after checked human review, then archived it. Exact client integration tests cover location/feed, meaningful event weights, no-evidence chat, sources, image set/remove, publication/archive/audit/budget. Production AI/image providers are still mocks.

Independent Impeccable review requested focused fixes: unclipped image captions, opaque placeholders, suggestions from the current edition, metadata below headlines, 44px image credits and five-block DESIGN contract. Applied together; mock chat now explicitly identifies its demonstration answer. Near-me prompt correctly selects the New York article in a New York session. Synthetic secondary image fixture verified both generated/altered flags and full attribution without clipping.

Responsive capture correction: opening the PWA tab changed the selected browser tab used by the viewport tool. Discarded that invalid batch and recaptured using the actual selected QA tab, recording effective innerWidth. The lazy admin routes initially captured their Suspense fallback; discarded six captures and replaced them after explicit populated-heading waits. Final 56 checks show no overflow. Production bundle registers its service worker and reports app assets cached. Physical installation and fresh phone OAuth remain pending.

Final frontend gates: lint/typecheck/build pass, 21 unit/component tests pass, three explicit emulator integration tests pass. Raster provenance scan4/0missing. See docs/qa/impeccable-audit.md for the independent correction verdict.

Final independent verdict: all six material fixes resolved, ship at six-fix scope,17/20. Verified controlled PWA update from the earlier build, then shut down preview4173 and reloaded the cached sample edition successfully. This checks an unavailable app origin, not a physical device or live API offline capability.

## 2026-10-03 — user-directed media, sidebar and motion

Generated one distinct illustration for each of the twelve fictional demo articles through the built-in image_gen tool. Converted to 480/800/1200px WebP without semantic edits, preserved prompts in sidecars, and verified all 40 public rasters have provenance. Uploaded 36 immutable objects (2,382,392 bytes) to the isolated versioned Project 2 demo-media bucket; atomically updated the 12 news image records and matching variant/audit metadata. Read back all news records and verified all public objects' type and byte count. Preserved news text, sources, publication review and publishedAt.

Applied Apple/The Verge reference principles through awesome-design-md while retaining the user's visual references and Perspectiva identity. Removed decorative eyebrows throughout reader, login, chat and editorial headings. Installed GSAP/@gsap/react. Desktop chat became a 400px companion; mobile uses an accessible overlay with a pinned composer and independent conversation scroll. Answers survive closing/reopening and reader route navigation.

Observed a real GSAP StrictMode teardown recursion when a root contextSafe callback ran within a child matchMedia context. Corrected callbacks to use the matchMedia context's own safe wrapper and added a regression that mounts, navigates and unmounts with animation enabled. Added sidebar regressions for mobile focus/background restoration, answer preservation and desktop feed access. Verified all 27 tests, including three real emulator client/API integrations, before final review. Physical phone installation/OAuth and final frontend Hosting deployment remain pending.

## 2026-10-03 — scanning, Spanish retrieval and live Gemini correction

Replaced feed composition with named sections, sticky anchors, canonical topic filter and aligned photo/headline/metadata/footer grids. Desktop sections retain all records without duplication; small screens show lead headline before photo. Plain copy replaces conscious-reading/budget headings. Chat clear is immediately under its header; input/send pinned at bottom with equal vertical centers. Removed explore-all sidebar footer.

Translated the 12 synthetic news records in local sample data and production/emulator Firestore, patching content only with production update-time preconditions. Canonical readback confirmed images, human review and publication times unchanged; initial JSON stringify comparison failed on map key order and was replaced with structural equality.

Added Spanish aliases, accent normalization, full-word retrieval and personalized feed context for general recommendations. Backend 64 tests pass; frontend 25 unit/component and 3 real emulator integration tests pass. ESLint, TypeScript and production build pass. StrictMode GSAP lifecycle regression remains covered.

Real Gemini weather call returned a grounded Spanish answer. Created Secret Manager version and bound Project 2 API; AI_PROVIDER=gemini deployed successfully. Health200 and existing authenticated Google reader showed 3 citations; measured production tokens confirm Gemini invocation (proof in docs/qa/production-gemini-verification.json). Secret temporary file removed; no server keys in frontend. Pexels remains mock. Fresh phone OAuth/install and frontend Hosting deployment remain pending.

Independent full correction review found the latest grids, navigation and chat matched the accepted request. One stale Gemini status sentence was corrected and scored resolved; final disposition ship. QA emulators9943/Java10002 and Vite9990/npm9965/esbuild9995 exited gracefully; QA ports released. Requested5173 remains4088/4114/4119 at idle CPU. In-app delivery tab moved to5173/preview and viewport override reset; user's authenticated regular Chrome preserved. Sensitive Gemini staging file and task-owned temporary function/process records removed.


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
