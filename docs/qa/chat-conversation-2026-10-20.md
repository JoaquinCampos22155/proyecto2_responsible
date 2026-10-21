# Conversational news chat — 2026-10-20

The authenticated reader can now continue a conversation about cited news. The first request searches published articles; a follow-up such as “háblame de la noticia de qué trata”, “explícalo más sencillo” or “qué practican los estudiantes” retains the relevant report. Explicit new topics start a new search. Minor spelling errors and plural forms are tolerated, including the user's exact “ejercicios metereologicos” question. The search remains lexical with bounded edit distance and topic aliases; it does not use embeddings.

## Data and generation

The browser sends only the current question and at most four previous `{question, articleIds}` turns. The API rejects extra roles, assistant text and oversized history. The server reloads IDs from the repository and uses only safe published articles; history is not factual evidence. Neither browser storage nor Firestore receives a conversation transcript. Existing usage records contain actor, model, token counts and cost estimates, not questions.

Evidence is capped at three reports, with summaries of at most 1,500 characters and bodies of at most 6,000 characters each. Gemini generates concise Spanish explanations using a strict JSON schema. Every paragraph must cite an available report index and an exact supporting quote. Citations and verification labels are constructed from stored articles. The model cannot choose URLs, access tools or browse sources. A server-owned disclaimer accompanies fictional DEMO material.

Input checks reject code requests, instruction overrides and unrelated tasks before paid generation. Historical attack instructions are dropped. Output checks reject code syntax, URLs/HTML, invalid references, nonexistent supporting quotes, unrelated vocabulary and new numeric claims. Invalid output becomes a deterministic excerpt, explicitly labeled “Extracto de noticias”. Valid semantic refusals or insufficient-evidence states do not display invented citations. Generated explanations retain “Resumen asistido por IA”.

## Verification

- Regression tests reproduced the original typo, lost follow-up context and deterministic-only output before implementation.
- Backend/API suite: 124 passing tests, including 64 dedicated scope/grounding/conversation tests runnable with `npm run test:ai-ethics`.
- Frontend: 38 passing unit/component tests, including forwarding referenced IDs and clearing request history.
- Complete presentation gate passed: lint, type checks, backend and frontend tests, responsive Chromium/WebKit browser suite, built PWA check, Firestore/Storage rules, adapter tests, emulator Auth/Functions smoke and typed client integration.
- Connected mobile browser flow passed in Chromium and WebKit: weather question → follow-up about the same report → code request refusal. These browser flows use the emulator mock provider; real-provider behavior is evaluated separately.
- Final real Gemini evaluation: **20/20 cases passed**, 10 paid calls, estimated token cost **$0.0032891** for that final run. Evidence: `chat-conversation-live-eval-2026-10-20.json`. It uses the actual Gemini provider and isolated seeded published articles, not a browser OAuth session or the deployed authenticated endpoint.
- Live cases cover both reported user questions, simplification, a contextual student question, missing cost, a new unsupported topic, general knowledge, code/SQL/pseudocode, Unicode role overrides, forged role tags, recipes, spreadsheet implementation and personal political persuasion.

Earlier live rounds exposed a rejected paraphrase and one false scope refusal on a valid follow-up. The prompt now receives a server-resolved follow-up flag and report IDs, with explicit allowed follow-up examples. One earlier round was interrupted by an upstream provider error. Evaluation accounting was corrected to remove an exactly duplicated usage-import batch; the interrupted round has a separately labeled conservative $0.08 upper estimate because its exact counters were lost. It is not presented as measured billing. Successful live-run usage is recorded in Project 2 `apiUsage`.

## Limits

The controls and adversarial tests reduce risk; they do not guarantee resistance to every future jailbreak or prove that every paraphrase logically follows from its quote. Vocabulary and numeric screening are conservative heuristics and may cause an extractive fallback. The provider may fail or abstain. The backend still reads the news collection before searching, so a larger corpus needs indexed retrieval. Public preview remains explicitly simulated. Production phone Google sign-in and installed-device acceptance are separate checks.

## Deployment

Functions and Hosting were deployed only to `proyecto2responsibleai`. Final read-back confirmed API revision `api-00008-sez` (updated October 20, Guatemala time), ACTIVE state, health HTTP 200, unauthenticated chat HTTP 401 and the new Hosting chat bundle. See `chat-conversation-production-2026-10-20.json`. The Firebase MCP deploy reported success without updating the function when given a scoped target; the separate revision check caught it and an explicit-project CLI deployment completed the update. Hosting also required CLI fallback after the MCP could not resolve the default site. No Project 1 resource was modified. Temporary evaluation/browser/emulator/deploy processes exited; no local server is retained.
