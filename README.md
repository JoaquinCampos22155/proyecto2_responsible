# Project 2 Responsible AI news backend

TypeScript/Firebase backend for a classroom news app and admin portal. The repo is dedicated to Project 2. The Project 1 Firebase project `proyecto1responsibleai` is separate and must remain untouched.

## Quickstart

```bash
npm ci
cp .env.example .env
npm run check
npm run test:rules
npm run build
npx firebase emulators:start --project demo-project2-responsible --only auth,firestore,functions,storage
```

The checked-in `.env.example` files contain dummy values for local emulators and mock AI/image providers. Keep real project configuration and provider keys in ignored local environment files; never put them in the examples.

Firestore emulator tests need Java 21+. In a second terminal:

```bash
FIREBASE_PROJECT_ID=demo-project2-responsible FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
```

Local API base: `http://127.0.0.1:5001/demo-project2-responsible/us-central1/api`.

## Architecture and commands

One Functions v2 HTTP function serves `/v1` REST routes. The API verifies Firebase ID tokens and custom `admin` claims. Pure domain modules handle ranking, evidence, interests, retrieval and budget; services use a Firestore repository. Chat and stock image search default to offline mocks; optional server-side Gemini and Pexels adapters were tested locally. Firestore client writes are denied; mutations go through the API.

| Command                   | Purpose                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `npm test`                | Unit/API tests                                                                      |
| `npm run test:rules`      | Firestore and Storage security, plus the Firestore adapter tests in local emulators |
| `npm run test:smoke`      | End-to-end Auth, Firestore and Functions emulator test                              |
| `npm run typecheck`       | TypeScript check                                                                    |
| `npm run lint`            | ESLint                                                                              |
| `npm run format:check`    | Prettier check                                                                      |
| `npm run build`           | Compile Functions entry to `lib/`                                                   |
| `npm run deploy:project2` | Check then deploy Functions, Firestore and Storage configuration to Project 2       |

Project 2 Firebase project: `proyecto2responsibleai`. Project 2 Web app ID: `1:580249070554:web:404d6d95ac2eb0b7a92ee3`. Cloud Firestore, Google Sign-In, and the Blaze plan are active. Firestore contains 12 marked fictional demo articles. The Functions v2 API is deployed at `https://us-central1-proyecto2responsibleai.cloudfunctions.net/api`; append `/v1` for authenticated routes. A desktop Chrome test completed Google Sign-In → Firebase ID token → `/v1/me` (200) → `/v1/feed` (200, 12 demo articles). A real phone test remains to be done. Current setup and frontend delivery steps are recorded in the [frontend handoff](PROJECT2_BACKEND_HANDOFF.md).

## Documentation

- [Frontend integration contract](PROJECT2_BACKEND_HANDOFF.md) — exact models, authentication, every API route, examples, demo, Responsible AI UX.
- [Engineering log](PROJECT2_ENGINEERING_LOG.md) — hypothesis, construction, test and correction evidence.
- [Design](docs/superpowers/specs/2026-09-26-project2-backend-design.md) and [implementation plan](docs/superpowers/plans/2026-09-26-project2-backend.md).

No production secret or service account key is committed. The Gemini and Pexels integrations are optional. Project 2 production chat uses Gemini with its key in Secret Manager; stock search still uses a mock. Do not run an untargeted Firebase deploy.
