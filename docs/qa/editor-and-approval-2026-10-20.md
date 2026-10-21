# Editorial corrections, illustration and presentation checks — 2026-10-20

The editor screenshot showed a published report. Both the form and service intentionally allow editing only drafts, but there was no action to return a published report to draft. A confirmed “Editar como borrador” action now performs the admin-only `POST /v1/admin/news/:id/reopen` transition. It clears review/evidence state, hides the report from public reads, preserves its sources/image/original date and records an audit event. Saving remains draft-only. Republishing requires the existing human review UI and retains the original publication date. Archived reports can also return to draft. The unsupported archive action is no longer shown for drafts.

Editorial cache invalidation now includes the globe and community queues. Regression tests cover state/permission validation, correction persistence, date/source/image retention and human review. Browser tests exercise publication → draft → correction → publication in desktop Chromium, mobile Chromium and mobile WebKit. Temporary test failures were fixed in the fixtures: the connected editor uses the configured localhost origin, and its modal locator distinguishes the editorial dialog from the desktop chat dialog.

A separate Firestore integration test records interests, creates a new API/repository instance with the same reader identity, and creates a subsequent matching news item. It verifies saved weights remain in the database and boost that new item relative to unrelated news. Another reader remains independent. Existing learning caps, reading/share signals, location and diversity rules are unchanged.

The user-linked published community report `fa322af5-deb1-4564-8662-76be04092be0` had a null image. Stock search existed only as a manual editor step. Approval and editorial publication now invoke the configured image service for missing images. Short deterministic queries choose neutral topical illustrations; a supplied image is never replaced. Provider errors leave the previous publication/review state intact for retry; a successful empty result can still publish without an image. Successful stock searches record zero-dollar usage, and full attribution/license/source metadata is retained. No image-generation model was added.

That existing production report was repaired using the real Pexels provider and the same query selection. It now has a photograph of the US Capitol by Ivan Dražić, marked as an illustrative stock image through the existing Pexels presentation rules. The reachable asset returned HTTP 200 and `image/jpeg`; read-back confirmed the stored image and published status. An optimistic update-time precondition protected concurrent edits, and image/audit/zero-dollar usage were committed together. Evidence: `approval-pexels-repair-2026-10-20.json`. The photo is not presented as documenting an arrest.

Final `npm run test:presentation`, format check and dedicated AI suite passed:

- **152 backend/API tests**.
- **44 frontend tests**.
- **12 presentation browser cases**, plus one PWA installation/offline case.
- **13 Firestore/Storage rules and adapter cases**, including durable future-interest ranking and automatic illustration metadata.
- **2 authenticated API smoke cases** and **3 typed-client integration cases**.
- **5 connected browser cases**: three editorial workflows and two mobile chat workflows; platform-specific cases are skipped outside their intended environment.
- **84 AI conversation/scope cases** (included in the backend count).
- Lint, type checks and production build.

Gemini prompt/generation code was unchanged; no additional real Gemini requests were needed. One real Pexels search repaired the user-linked article. Automated mutation tests used only the isolated `demo-project2-responsible` emulator project. Production verification is limited to the separately recorded provider/image repair and deployment checks; a signed-in production editorial run is not claimed. Temporary servers, emulators and helper processes are cleaned up after the checks.

Functions and Hosting deployed successfully only to Project 2. Verification at `2026-10-21T04:28:09.173Z` confirmed revision `api-00012-cip`, ACTIVE state, `IMAGE_PROVIDER=pexels`, health HTTP 200, unauthenticated reopen HTTP 401 and the released editor confirmation controls. See `editor-approval-production-2026-10-20.json`. No development server or emulator is retained.
