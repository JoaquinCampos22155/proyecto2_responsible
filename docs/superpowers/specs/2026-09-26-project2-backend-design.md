# Project 2 backend design

## Goal and boundaries

Build a TypeScript Firebase backend for a classroom Responsible AI news application. A PWA and an admin portal share one HTTPS JSON API. This repository is Project 2 only; the separate Firebase project `proyecto1responsibleai` and its repository are read-only. Development must work with mock AI and image providers and no paid API credentials.

## Chosen approach

Use one Firebase Functions v2 HTTPS function with an Express router. Firebase ID tokens authenticate callers; custom claim `admin: true` authorizes editorial actions. Firestore is private to the API: client SDK rules deny direct writes and allow only narrowly scoped reads, so validation and audit behavior cannot be bypassed. Pure domain functions implement ranking, interests, evidence status, retrieval, and budgeting. A repository interface allows in-memory unit tests and a Firestore adapter in production. All times use ISO UTC strings in API responses and Firestore timestamps as strings for simplicity in this course project.

Compared with callable functions, a versioned REST API is easier to specify and consume from both frontends. Compared with many separately deployed functions, one router shares authorization and error handling while keeping domain modules independent.

## Core flows

1. Google Sign-In occurs in the frontend. It sends `Authorization: Bearer <Firebase ID token>` to `/v1/*`. The API verifies the token with Admin SDK and derives `uid` from it. The first profile request creates a minimal user record.
2. Admin creates a draft, edits fields, adds source records, requests evidence assessment, sets image metadata, then publishes. Publish requires an admin claim, a source, valid article fields, and a human review record. Publication and archive append audit entries.
3. Feed loads published articles, scores location, recency, interests and human editorial priority, then uses scope quotas and topic diversity to preserve coverage. The response includes concise human-readable explanation reasons.
4. Events update capped and decayed topic interest weights. Location is a selected country and optional region, with no GPS.
5. Chat retrieves a bounded set of published article excerpts and sources. A deterministic mock provider returns a grounded answer and structured citations. Real providers remain disabled until a later integration. An AI budget service records usage and checks the configured USD cap before provider calls.
6. Image lookup uses a provider interface and mock stock result. Generated image metadata is supported; paid generation is disabled. Provenance and AI labels are mandatory where relevant.

## Data and security

Collections: `users/{uid}`, `news/{id}`, `userEvents/{id}`, `audit/{id}`, `apiUsage/{id}`. News embeds source records and optional image metadata, which keeps story provenance atomic. Admin custom claims are provisioned only by a local operator script using Admin SDK and an explicit Project 2 project ID. The API is the sole writer; Firestore client rules deny writes. Published news may be read by signed-in users; drafts and audit/usage records are admin-only. Users may read only their own profile and events. Server-side Admin SDK bypasses rules, so all API routes enforce role and input checks separately.

## Error handling and operations

All errors use `{error:{code,message,details?}}` and suitable HTTP status codes. Validation rejects unknown or malformed fields. Logging records route, status, error code and request correlation ID without tokens, question text, or private data. CORS uses an explicit origin list. Emulator setup, seed, admin provisioning and deploy commands require explicit Project 2 targets. If Firebase creation or deployment is blocked, local implementation remains complete and docs state the exact blocker.

## Verification

Strict TDD for each behavior: fail first, minimum implementation, green, refactor. Unit and API tests cover ranking guardrails, evidence, events, auth/roles, publication, retrieval, mock providers, budget, input validation, and error contract. Firestore rules tests run in the emulator where available. Final checks include lint, typecheck, tests, seed workflow, secret scan, Project 1 diff/target check, and handoff completeness.
