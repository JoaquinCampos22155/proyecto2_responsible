# Per-topic interest decay — 2026-10-21

## Behavior

The personalized feed computes `effectiveWeight = storedWeight * 2 ** (-elapsedDays / 7)` independently for every topic. Eight points become four after seven inactive days and two after fourteen. Geographic matching, news freshness, editorial priority, diversity reservations and the 0.45 interest multiplier remain unchanged. The globe retains its separate editorial ordering.

Profiles persist optional `interestUpdatedAt: Record<string, ISO timestamp>` alongside the existing base weights. A meaningful event decays only its affected topic values, adds the existing event increment, applies the existing maximum of 10 and moves those topics' anchors to the event time. Unrelated base values/anchors are retained, preventing double decay. Impressions, sub-30-second reading events and simulated location changes do not refresh topic clocks. The positive article-open signal remains 0.5 points as before. Ranking itself does not rewrite base weights; no scheduler, embedding model or LLM is used.

Legacy profiles are anchored on first access using their last valid stored profile update date, then creation date, then current time. That first baseline is approximate because historical per-topic timestamps did not exist. The migration preserves preferences and does not advance the general update date. Dates are persisted before unrelated actions could renew their fallback date. Future clocks cannot grow scores; invalid dates use the valid fallback. Raw scores are bounded during ranking.

## Verification

Six initial regression cases failed against the old behavior before implementation. The final decay file has seven cases covering half-lives, event-after-decay arithmetic, saturation cap, independent topic clocks, low-signal activity/location changes, repeated reads, legacy migration, future/invalid dates and avoiding double decay. An additional Firestore integration case reloads a legacy profile through a new API/repository instance, updates another topic, checks persisted anchors and confirms recent interests outrank an inactive one.

The first complete presentation run also caught a regression introduced by the existing active-carousel change on main: opening a weather article in mobile chat sent the first feed card's library ID. The carousel now starts on the route article, loading it separately if outside the feed, and retains user-selected card behavior. Desktop context does not inherit a stale mobile selection. The existing strict mobile request assertion was retained; a new component regression was observed failing before the fix and passing afterward.

Final gates passed:

- **159 backend/API tests**, including seven new decay cases.
- **46 frontend cases**.
- **12 presentation browser cases** and **1 installation/offline PWA case**.
- **14 Firestore/Storage rules and adapter cases**, **2 authenticated smoke cases**, **3 typed-client integration cases**.
- **5 connected browser cases** across desktop Chromium, mobile Chromium and mobile WebKit, with platform-specific skips.
- **84 AI scope/conversation cases**, included in the backend total.
- Lint, type checks, production build and format check.

Source baseline includes the existing `51f1ddc` active-news and `617082a` Pexels changes on main. Automated mutations use only the isolated `demo-project2-responsible` emulator project. No bulk production profile rewrite, extra model/provider request or billing change is required. Deployment is limited to Project 2; release proof is recorded separately. Temporary browser servers and emulator groups are shut down by their runners.

Functions and Hosting deployments completed for Project 2. Read-back at `2026-10-21T22:31:22.610Z` confirmed revision `api-00013-hit`, ACTIVE state, health HTTP 200 and unauthenticated profile HTTP 401. Released entry assets match the verified local build byte-for-byte. See `interest-decay-production-2026-10-21.json`. The seven-day behavior was verified with controlled-clock unit/API and Firestore emulator tests; this is not a claim that a production user session was artificially aged or rewritten.
