# Project 2 backend implementation plan

Execution: native, sequential TDD in this isolated Project 2 repository. Keep `PROJECT2_BACKEND_HANDOFF.md` and `PROJECT2_ENGINEERING_LOG.md` current after every interface or decision.

## Files and responsibilities

- `src/domain/*`: types, validation, evidence, ranking, interests, retrieval, budget rules.
- `src/services/*`: article, feed, user, chat, image, usage use cases over a repository interface.
- `src/repository/*`: interface, in-memory test adapter, Firestore adapter.
- `src/api/*`: Express transport, token verification, role checks, route schemas, error mapping.
- `src/index.ts`: Firebase Functions v2 entry.
- `scripts/*`: explicitly targeted demo seed and admin claim provisioning.
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`: Project 2 configuration.
- `tests/*`: behavior and security rule tests.

## Tasks

1. **Foundation:** Create package/tooling/config. Test import/build and API error format before writing the server. Verify red then green. Document local commands.
2. **Domain models and validation:** Test draft, source, image, location and event input acceptance/rejection. Implement typed parsers; document fields.
3. **Evidence and publication:** Test single/corroborated/conflicting/developing statuses, human approval and admin-only publish/archive. Implement service and audit records.
4. **Personalization:** Test geographic relevance, recency, interest matching, deterministic ordering, explanation strings, exposure quotas and diversity. Implement ranking and feed service.
5. **User interests:** Test event weights, reading thresholds, caps, decay, UID binding and location update. Implement user service.
6. **Retrieval and mock AI:** Test published-only retrieval, bounded context, citations, uncertainty and empty results. Implement provider interface and mock chat.
7. **Images and cost:** Test stock mock, generated labeling, usage aggregation, budget rejection and remaining allowance. Implement services and admin reporting.
8. **API and Firebase:** Test token verification, role failures, method/body errors and response shapes. Wire Express router and Firestore adapter; add explicit Project 2 aliases/rules/indexes.
9. **Operations and handoff:** Seed varied synthetic stories, admin script, complete endpoint-by-endpoint handoff, README, engineering log. Exercise emulator rules if available.
10. **Final verification and deploy:** Format, lint, typecheck, unit/integration/rules tests, seed smoke, secret and Project 1 checks. Create/use Project 2 Firebase project if authorized by CLI, deploy with `--project project2` only if safe, then smoke test deployed API. Document any external blocker.

## Review focus

- Client cannot alter roles or published news through Firestore rules.
- Authenticated normal user cannot self-promote or publish through API.
- Quotas preserve local/national/international exposure when candidates exist.
- Chat never cites unpublished or unselected records.
- Budget rejects a provider call before usage crosses the configured cap.
