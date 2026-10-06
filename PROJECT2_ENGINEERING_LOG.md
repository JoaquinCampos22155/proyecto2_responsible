# Project 2 engineering log

## 2026-09-26 — Initial assessment

- **Problem/hypothesis:** Project 2 needs a separate backend and Firebase target without changing Project 1.
- **Observed:** This repository was clean and contained only a one-line README. Firebase CLI listed only `proyecto1responsibleai` (project number `487068590350`) before creation.
- **Decision:** Build Project 2 at this repository root with a separate Firebase project. Use one REST API and pure domain modules. Creation of `proyecto2responsibleai` was started with an explicit project ID.
- **Testing/evidence:** Repository and Firebase CLI state were inspected read-only. Behavioral tests pending.

## 2026-09-26 — Domain logic, red/green

- **Hypothesis:** Deterministic ranking and evidence assessment could support explainability without an LLM.
- **Construction:** Pure modules for source evidence, capped interest weights, ranked feed with geographic and editorial priority reservations, bounded lexical retrieval and cost aggregation. Strict Zod input schemas reject unknown fields.

## 2026-09-26 — Editorial and provenance review

- **Finding:** The draft field `significance` sounded like an objective importance judgment, and counting distinct publishers could mistake syndicated copies for independent corroboration. Source categories omitted news, wire, and social.
- **Change:** Renamed the write/read contract to `editorialPriority` and updated feed explanations to identify the human editorial choice. Sources now accept optional `originSource` and `sourceGroup`; supporting records linked by publisher, original source, or syndication group count as one origin. Expanded `sourceType` to seven categories. Unknown syndication still requires human review.
- **Evidence:** Five focused tests first failed on the old behavior. After implementation, `npm run check` passed (41 unit/API tests plus formatting, lint, and types), `npm run test:rules` passed (6 emulator tests), and `FIREBASE_PROJECT_ID=proyecto2responsibleai npm run test:smoke` passed (2 Auth/Functions/Firestore emulator tests). Both emulator commands shut down cleanly.
- **Evidence:** First domain run had 12 expected failures from unimplemented behavior. After implementation, 13 tests passed. A later test exposed a foreign local story occupying the local quota; the quota was restricted to the selected location. Another new test exposed a three-item feed with no scope breadth; reservations now apply at three items. The expanded domain suite passes.

## 2026-09-26 — Services and HTTP API, red/green

- **Hypothesis:** One repository interface would make editorial/user flows testable without Firebase credentials.
- **Construction:** In-memory and Firestore repositories; draft/source/evidence/publish/archive with human review and audit; profile, location, event, chat, image and usage services; one Express JSON API with token/claim middleware.
- **Evidence:** Nine service tests first failed with unimplemented methods, then passed. Seven API tests first received 501, then passed. A new failure test showed a database error being mislabeled 401 after valid auth; middleware now maps it to 500. A test then caught JSON `null` rejected before image clearing, so JSON parsing now accepts the scalar and the service handles it. Current unit/API tests: 37 passing.

## 2026-09-26 — Firestore rules and adapter

- **Hypothesis:** Client access can be least-privilege while the API remains the sole writer.
- **Construction:** Rules permit signed-in readers to get published news and their own profile; claimed admins may read protected records; all client writes are denied. Adapter maps articles, users, events, audit and usage to Firestore.
- **Evidence:** With deny-all rules, allowed-read tests failed as expected. After rules implementation, 4 rules tests and 2 adapter tests passed in the Firestore emulator. An initial parallel run made the adapter tests interfere with rules test data; sequential test execution fixed that test isolation issue. The emulator shut down after `emulators:exec`.

## 2026-09-26 — Firebase project and deployment preparation

- **Problem:** Project 1 must remain untouched while Project 2 gets its own Firebase resources.
- **Construction:** Firebase CLI created project `proyecto2responsibleai` (number `580249070554`) and Web app `1:580249070554:web:404d6d95ac2eb0b7a92ee3`. Aliases have no default. Runtime and scripts reject any project ID except Project 2 and the named demo emulator. Deploy script always uses an explicit Project 2 ID.
- **Observation:** The new project's Cloud Firestore API is disabled; CLI database creation returned HTTP 403. Database, Google provider and Functions deployment remain pending. Google Cloud console displayed an Enable API button together with product terms; no agreement was accepted in the browser. Local emulator remains operational.

## 2026-09-26 — Project 2 production activation

- **Firestore:** Enabled `firestore.googleapis.com` with the authenticated Firebase CLI session, created the `(default)` Standard/Native database in `us-central1` (reported free tier), then deployed the checked-in rules and indexes. A subsequent CLI list confirmed the database and region.
- **Authentication:** Enabled Google Sign-In for the existing Project 2 Web app. A read-only Identity Toolkit check returned `googleEnabled: true`. Authorized domains now include the two Project 2 Firebase domains and `localhost` for local frontend development. The OAuth brand support email is configured in Firebase but intentionally omitted from the repository.
- **Functions:** `npx firebase deploy --only functions --project proyecto2responsibleai --non-interactive` ran the TypeScript build, then stopped while enabling `artifactregistry.googleapis.com`: Firebase requires the Blaze pay-as-you-go plan. No function URL or real-phone test is available yet. The owner must activate Blaze before retrying deployment.

## 2026-09-26 — End-to-end and seed smoke

- **Hypothesis:** The Firebase Auth ID token, Functions entry and Firestore adapter should work together in a real emulator, including the Project 2 guard.
- **Construction:** Added a Functions/Auth/Firestore emulator smoke test and a safe seed script. The smoke test signs into the Auth emulator, requests a profile/feed/chat, and confirms a normal user cannot open admin usage.
- **Evidence:** The first smoke test passed with a previously compiled output. Running it with `FIREBASE_PROJECT_ID=proyecto2responsibleai` exposed that the emulator could load a stale build and use the wrong project namespace. The test command now builds first, and runtime configuration selects the emulator's demo project ID when emulator hosts are present. The repeated 2-test smoke passed, and the emulator shut down. The seed script upserted 12 synthetic stories in the demo emulator and exited cleanly.
- **Dependency review:** Production audit first reported inherited moderate `uuid` advisories through `gaxios`. Firebase Admin and Functions were upgraded to compatible current majors; a narrow `gaxios → uuid` override was added after checking that `gaxios` calls `uuid.v4()`. `npm audit --omit=dev --audit-level=moderate` then reported 0 production vulnerabilities. Development tooling still has moderate advisories without compatible automatic fixes.

## 2026-09-26 — Optional live Gemini and Pexels verification

- **Construction:** Added server-side `AI_PROVIDER=gemini` and `IMAGE_PROVIDER=pexels` modes while retaining mock defaults. Gemini receives at most three published excerpts, returns natural Spanish text, and records returned token counts with estimated cost. Pexels search returns image URLs, photographer credit, license name, and the Pexels photo page. No API key was written to the repository or deployment environment.
- **Live evidence:** The provided Gemini key generated a short response that correctly called the synthetic river story fictional; the final API request returned HTTP 200, one relevant citation, `corroborated`, and 132 input/28 output tokens with an estimated $0.0001096. The provided Pexels key returned HTTP 200 with five stock candidates through the admin image endpoint, including photographer and source page. An earlier retrieval test found unrelated stories in the same citation set; a relative relevance cutoff now excludes those weak matches.
- **Regression found:** The first Auth/Firestore/Functions emulator smoke returned 500 on chat. A focused Firestore adapter test reproduced the exact SDK error: optional `inputTokens` was sent as `undefined`, which Firestore rejects. Chat usage now omits absent token fields. The adapter test then passed, followed by `npm run test:rules` (7 tests), the full emulator smoke (2 tests), and final `npm run check` (48 unit/API tests plus formatting, lint and types).
- **Limits at this stage:** Live provider requests were local API calls with an in-memory repository and test identity. Firebase emulator smoke exercised token verification and Firestore with the mock provider. At the time of this test, deployment awaited Blaze; the later deployment is recorded below. Pexels is stock search, not image generation; stock results must not be portrayed as documentary evidence.

## 2026-09-26 — Blaze activation and first Functions deploy

- **Billing:** The owner linked Project 2 to `Mi cuenta de facturación` (ending `522F8E`). Firebase displayed Blaze for this project. Google Cloud Billing showed a $300 credit remaining on that account, expiring 2026-10-16; the other available account showed no credits. This is a paid account, so credit expiry or uncovered usage can result in charges.
- **Deployment:** `npm run deploy:project2` passed format, lint, TypeScript and 48 unit/API tests. Firestore rules/indexes deployed, and Functions v2 created `api(us-central1)` at `https://us-central1-proyecto2responsibleai.cloudfunctions.net/api`. The command exited 1 only because the Artifact Registry cleanup policy was not yet configured. `firebase functions:artifacts:setpolicy --project proyecto2responsibleai --location us-central1 --days 7 --force` then succeeded. `firebase functions:list` confirms the Node.js 22 HTTPS function.
- **Live smoke:** `GET /health` returned HTTP 200 with `{"status":"ok"}`; `GET /v1/me` without a Firebase ID token returned HTTP 401. The production environment still uses mock AI/image providers and permits the localhost frontend origin. A real Google sign-in/token/feed round trip on a phone remains to be verified.

## 2026-09-26 — Billing recheck, production demo seed, and Google OAuth test

- **Billing:** Google Cloud Billing account `01287F-5177E9-522F8E` lists `proyecto2responsibleai` among linked projects. The same account shows an active $300 Free Trial Upgrade credit at 100% remaining, expiring 2026-10-16. The Firebase email confirms Blaze, but the Cloud Billing project list and credit page establish the account linkage and credit. This is a paid account after the credit expires or for usage the credit does not cover.
- **Seed:** The authenticated Firebase CLI session wrote the existing 12 `demo-*` seed articles to production Firestore with a one-time REST batch commit. A read-back showed 12 news documents, all 12 with `[DEMO]` titles. The temporary seeding helper was deleted after use. Project 1 was not targeted.
- **OAuth and feed:** A temporary browser app initiated Google Sign-In through the Project 2 Web app. Firebase Auth created a user with provider `google.com`. The integrated browser returned from redirect without exposing the result, but desktop Chrome retained the sign-in. Its Firebase ID token received HTTP 200 from `/v1/me` and `/v1/feed`; the profile UID matched the Firebase user, and the feed contained all 12 `demo-*` articles. The first temporary checker incorrectly looked for `me.profile.uid` even though `/v1/me` returns the profile directly; a corrected checker verified UID equality. A phone test remains for the frontend.
- **Hosting and API:** A temporary Firebase Hosting auth test page was deployed, then replaced with a 404-only deployment; both Project 2 Hosting roots now return HTTP 404. The Functions deployment was updated to allow browser origins for localhost and both Project 2 Hosting domains. A live preflight from `https://proyecto2responsibleai.firebaseapp.com` returned HTTP 204 with the matching `Access-Control-Allow-Origin`; `GET /health` returned HTTP 200. Gemini and Pexels remain mock providers in production. The temporary local auth server and source files were removed after testing.
