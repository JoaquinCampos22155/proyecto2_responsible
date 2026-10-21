# Open-article conversation — 2026-10-20

## Behavior and trust boundaries

The authenticated chat previously sent only a question and cited-report history. Opening an article did not contextualize the next question. It now sends the optional `currentArticleId` from `/news/:id`. The server reloads evidence from its safe published corpus; the browser cannot submit article text, prompt instructions or roles through this field. Old clients remain compatible.

An implicit first request such as “¿De qué trata?”, “¿Puedes resumirla?” or “Dame un resumen” uses the open article. If the reader names another subject, retrieval searches all published reports. Follow-ups then use the latest cited reports; “esta noticia” explicitly refers back to the open article. A conversational question that names a matching different subject (for example a question about solar energy while weather is open) starts a new retrieval. Edition metadata, news briefings and missing-topic abstentions retain their existing paths. Retrieved evidence still has a maximum of three reports.

The transcript remains visible during navigation, while request history is scoped to the navigation entry. Each request captures its original route key, so an in-flight response arriving after navigation cannot seed the new article's conversation history. Clearing removes conversation history while retaining the open article as reading context. A compact reference identifies the open report. Public `/preview` remains simulated.

## Verification

Regression tests were observed failing before implementation for absent current-article context, request serialization, API field validation and route-history isolation. Additional failing cases covered conversational Spanish variants and a why-question naming another subject.

Final `npm run test:presentation` passed:

- Backend/API: **145 tests**.
- Frontend: **43 tests** after integrating the concurrent main update.
- Browser presentation: **12 passed**, with platform/environment-specific skips.
- Installable manifest and offline installation page: **1 passed**.
- Emulator Firestore/Storage rules and adapter: **12 passed**.
- Emulator authenticated API smoke: **2 passed**.
- Frontend typed client against emulators: **3 passed**.
- Connected mobile chat: **2 passed**, Chromium and WebKit; navigates from a cited report, submits the new open ID without old history, switches to library news and continues that subject. Desktop skips this mobile-only case.
- Dedicated AI scope and conversation suite: **84 passed** (a subset of the backend suite).
- Lint, type checks and production build passed.

Draft, archived, nonexistent and instruction-bearing current records are excluded. Invalid IDs/types and supplied article content are rejected or cannot enter evidence. Code, pseudocode and role/secret extraction attempts with an open report remain rejected before provider invocation. Existing generated-output screening, exact evidence quotes, server-owned citations and budget tracking are retained. These tests do not prove immunity to every possible prompt injection or perfect semantic grounding.

## Real Gemini evaluation

The expanded evaluation used the real production provider credential with an isolated seeded corpus, not a signed-in production browser session. The first round passed 26/27 strict generated-answer cases: one valid simplifying paraphrase triggered the conservative extractive fallback. Its citation stayed on the correct report; it was not a safety bypass. The prompt now asks the model to preserve central source terms when simplifying, without loosening output validation.

The final round passed **27/27**, including open-article first questions, switching to another subject, following that subject, returning to the open article and news-only restrictions. Evidence is retained in `chat-open-article-live-eval-2026-10-20.json` and the `round1` report. The rounds made 15 Gemini calls each, with total estimated token cost **$0.0114786**. All 30 measured usage records were imported into Project 2 `apiUsage` using deterministic document IDs; the commit was acknowledged at `2026-10-21T04:00:56.591324Z`. No credentials were written to these artifacts.

Temporary browser servers and emulator processes were managed by the test runners; no development service is intentionally retained.

## Concurrent main integration

During final deployment, `origin/main` advanced to `441cc1a`, incorporating the rolling 30-day globe edition from `8ff4d5a`. It was merged without conflicts into this work, preserving the new globe/API range contract. The complete presentation gate, formatting check and 84-case dedicated AI suite were repeated successfully against the combined tree. Real Gemini evaluation remains applicable because that main update did not change chat selection or generation. The initial deployment was followed by a full Functions/Hosting deployment from the combined tree so the older globe behavior is not left in production.

Final verification at `2026-10-21T04:06:19.017Z` confirmed Functions revision `api-00011-faq`, ACTIVE state, health HTTP 200, unauthenticated chat HTTP 401 and Hosting HTTP 200. The released assets contain both open-article context and the 30-day globe. See `chat-open-article-production-2026-10-20.json`. This establishes deployment/authentication and released asset presence; the signed-in browser interaction was tested against emulators, and generation against the real Gemini API with an isolated corpus. No signed-in production chat run is claimed.
