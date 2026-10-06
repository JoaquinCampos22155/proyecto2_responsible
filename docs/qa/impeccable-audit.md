# Impeccable technical audit

Reviewed 2026-10-03. Scope: `frontend`, existing production CSS, and supplied browser evidence. This independent reviewer made no application changes and launched no browser, server, test runner, or persistent process.

## Implementation integrity verdict

**Pass with required fixes.** The implementation expresses a coherent Spanish editorial product: backend-ordered lead/secondary stories, self-hosted DM Sans and Newsreader, neutral evidence descriptions, simulated geography, source links, and a deliberate human publication step. It does not invent production news or analytics. The existing detector output at `docs/qa/impeccable-detector.json` is `[]`; no second detector pass was run. Static and visual review found issues outside that detector's scope.

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Placeholder contrast is approximately 3.18:1 |
| 2 | Performance | 3/4 | Sensible loading/chunking; runtime performance not independently measured |
| 3 | Responsive design | 3/4 | All 56 supplied overflow checks pass; image attribution target remains small |
| 4 | Theming | 3/4 | Palette tokens consistently drive the intended light theme; a few secondary surface colors remain literal |
| 5 | Implementation integrity | 3/4 | Image metadata clipping and fixed demo chat prompts undermine product promises |
| **Total** | | **15/20** | **Good — address weak dimensions** |

Scores reflect the inspected evidence, not a Lighthouse or full WCAG certification. Dark mode is not a brief requirement and its absence is not a defect.

## Executive summary

Five verified findings: **P0: 0; P1: 2; P2: 3; P3: 0.** Fix image transparency and placeholder contrast before release. Then align suggested questions with live feed content, move article topic metadata beneath headlines to satisfy the loaded craft floor, and enlarge image attribution links. The editorial identity and responsive composition do not require rebuilding.

## Detailed findings

### [P1] Secondary story crop also clips image disclosure and attribution

- **Location:** `frontend/src/styles.css:1011`; `frontend/src/components/common.tsx:95`.
- **Category:** Implementation integrity / accessibility.
- **Evidence:** `.story-secondary .news-image` caps the entire figure at 150px and hides overflow. Its image can occupy 130px. Below that image, the disclosure strip alone needs approximately 33px (12px text, 1.55 line height, 14px vertical padding), followed by the attribution caption. These descendants cannot fit in the remaining 20px. The provided feed captures have no images, so this is a source-verified content-state defect rather than an observed photographed story.
- **Impact:** Readers can miss generated/altered/illustrative image declarations and lose usable photographer/source links. This violates the explicit image transparency requirement.
- **Recommendation:** Apply crop constraints to the image pixels, leaving the label strip and caption in normal flow. Verify a secondary story with AI labels and an attribution link at desktop and mobile widths.
- **Suggested command:** `$impeccable harden`.

### [P1] Placeholder text falls below normal text contrast

- **Location:** `frontend/src/styles.css:711` and `:1430`; generated CSS `frontend/dist/assets/index-BUWlUK3X.css`, Tailwind preflight placeholder rule.
- **Category:** Accessibility.
- **Evidence:** The built stylesheet uses `color-mix(in oklab,currentColor 50%,transparent)` for placeholders and the application has no overriding placeholder color. With ink `#10243a` on white, the resulting 50% foreground composite is approximately RGB(135.5,145.5,156.5), with a calculated contrast of **3.18:1**. The chat screenshot visibly shows the muted placeholder.
- **Impact:** Readers with reduced contrast sensitivity struggle to read prompts and example input content.
- **WCAG:** 1.4.3 Contrast (Minimum), 4.5:1 for normal text.
- **Recommendation:** Set an explicit opaque palette color such as `var(--muted)` for input/textarea placeholders and verify against each field background.
- **Suggested command:** `$impeccable harden`.

### [P2] Suggested chat questions depend on fixed demo story titles

- **Location:** `frontend/src/features/Chat.tsx:44`.
- **Category:** Implementation integrity.
- **Evidence:** “¿Qué pasa cerca de mí?” inserts a Guatemala City cleanup title, and the other suggestions similarly embed fixed seed titles. The reviewed chat screen says “Desde Nueva York,” proving that the displayed selected region can differ from the region encoded in the local suggestion.
- **Impact:** The first interaction sends readers to a different region or a report that may no longer exist after editorial updates. This weakens the location comparison demonstrated in class.
- **Recommendation:** Derive suggestion questions from currently returned feed articles and selected context, retaining backend ranking. Hide or honestly relabel suggestions for unavailable topics instead of inserting assumed seed titles.
- **Suggested command:** `$impeccable clarify`.

### [P2] Topic metadata is repeatedly styled as an eyebrow above a headline

- **Location:** `frontend/src/features/Feed.tsx:52`; `frontend/src/features/Chat.tsx` sidebar `.topic`; `frontend/src/features/Article.tsx` `.article-topics`.
- **Category:** Implementation integrity.
- **Evidence:** Feed, chat desktop sidebar, and article captures show small topic labels above the heading. This is a visual craft-floor finding, not a detector result. The loaded floor explicitly refuses kickers/eyebrows above headings. Topics themselves are useful required metadata.
- **Impact:** The repeated eyebrow treatment fails the agreed Impeccable craft gate, despite the otherwise coherent editorial hierarchy.
- **Recommendation:** Preserve the real topic and geographic information, placing it beneath the headline/deck or in the existing metadata row. Preserve topic interaction behavior on article pages.
- **Suggested command:** `$impeccable polish`.

### [P2] Image attribution link lacks the intended 44px tap target

- **Location:** `frontend/src/styles.css:1050`; `frontend/src/components/common.tsx:103`.
- **Category:** Responsive design / accessibility.
- **Evidence:** Caption links use `inline-flex` and final 12px text with 1.6 line height, without minimum target height or link padding. Caption container padding does not enlarge the link's interactive area. This differs from source-entry links, which correctly get 44px minimum height later in the stylesheet.
- **Impact:** Opening image origin/photographer credit is harder on touch screens, especially for readers with motor impairments.
- **Standard:** The product's 44px control commitment; WCAG 2.5.5 Target Size (Enhanced). This is not asserted as a WCAG AA violation because spacing exceptions were not measured.
- **Recommendation:** Give attribution links a 44px interactive height, allowing wrapping without clipping labels or captions.
- **Suggested command:** `$impeccable adapt`.

## Patterns and systemic issues

The image presentation component correctly generates transparency metadata, but its secondary layout constrains the entire figure. Fixing that layout rule repairs every affected secondary story. Placeholder contrast comes from one unoverridden preflight rule, so a shared explicit token resolves all affected fields. Topic eyebrows occur across three reader surfaces; apply one consistent metadata placement.

## Positive findings

- Semantic landmarks, native controls, explicit input labels, skip link, strong focus outlines, native dialog focus restoration, status announcements, and neutral evidence wording are present.
- Reduced motion disables the page entrance and replaces animated loading with a visible static indicator; chat scrolling respects that preference.
- The parent supplied **56 actual viewport checks** across eight surfaces and seven widths; all recorded document widths fit their viewports. All **21 required JPG captures** were opened and visually inspected; none is blank or mismatched.
- Lead, secondary, and text-led stories preserve backend ordering and establish clear hierarchy. The article body uses Newsreader with a 68ch cap. Missing images remain honestly text-led.
- Non-lead images load lazily; admin routes load through dynamic imports; Firebase and shared dependencies have explicit build chunks. No layout read/write loops, persistent animation hints, or unbounded decorative effects appeared in sampled files.
- The API client obtains fresh Firebase tokens, refreshes once on 401, centralizes error parsing, and omits UID from event payloads. Custom claims gate navigation while backend errors remain authoritative.
- Location changes update profile state and invalidate the feed. Event collection aggregates active reading time, disconnects impression observers, and avoids timer spam/refetch storms.
- Publication requires an explicit human review checkbox and shows sources, evidence state, image origin, and AI assistance before submission. Budget values come from the backend and are described as estimates.
- PWA configuration declares standalone mode, normal and maskable PNG icons, a service worker, and cached application assets; API responses are not indiscriminately cached.

## Limitations and verification provenance

This review used supplied browser screenshots and static implementation evidence. It did not independently repeat the parent's reported 20 unit/component tests, three Firebase emulator integration tests, browser workflows, Google authentication, production feed session, installability, or performance benchmarks. Those reports are supporting context, not reviewer-executed checks. The captures are viewport images, not full pages; below-fold structure was inspected in source. No screenshot demonstrates populated chat citations or real photographed secondary stories. Full keyboard/screen-reader runs, 200% text enlargement, physical iPhone/Android installation, and slow-network timing remain unverified by this reviewer.

No task-owned persistent process was launched by this audit. All read commands completed; no browser or worker was left running. The parent owns its own final process/resource cleanup.

## Recommended actions

1. **[P1] `$impeccable harden`**: Preserve secondary image labels/captions and add opaque readable placeholders.
2. **[P2] `$impeccable clarify`**: Generate honest chat suggestions from current articles/context.
3. **[P2] `$impeccable adapt`**: Enlarge image attribution touch targets and verify their wrapping.
4. **[P2] `$impeccable polish`**: Move topic metadata beneath headlines, then recheck the affected screens without diluting the lead hierarchy.

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `$impeccable audit` after fixes to see your score improve.

## Post-fix evidence gate — 2026-10-03

**Disposition: recapture.** The replacement `admin-list-390.jpg`, `admin-list-1280.jpg`, `admin-editor-390.jpg`, `admin-editor-1280.jpg`, `budget-390.jpg`, and `budget-1280.jpg` all show only the route-level “Abriendo la sección…” loading fallback. They do not document the populated surfaces named by the files. These six required captures must be replaced after the corresponding route and data have settled. Per the finish-review evidence gate, no correction scores or revised health score are issued on this packet. The additional secondary image captures were opened, but their evidence does not repair the missing populated admin captures.

## Final correction verdict — 2026-10-03

The six invalid admin captures have now been replaced at the same paths and independently opened: the list, editor, and budget are populated at both 390 and 1280. The remaining 15 required viewport captures were also reopened and are valid. The two additional secondary-image captures show the declared synthetic fixture and its metadata. The replacement `responsive.json` records 56 checks with actual viewport widths and no document overflow.

1. **Resolved — secondary image disclosure clipping.** Both secondary-image captures visibly retain generated, altered, and illustrative declarations plus attribution below the image. The secondary figure no longer has a maximum height or overflow clipping; only image pixels retain their crop constraints.
2. **Resolved — placeholder contrast.** The chat captures show darker readable prompts. The source explicitly sets input/textarea placeholders to opaque `--muted` (`#566575`), calculated at **5.98:1** against white, exceeding the 4.5:1 requirement.
3. **Resolved — fixed demo chat questions.** Suggestions now derive titles from current backend feed entries and omit unavailable topics. The current New York headline is visible in the chat edition; source generates the local question from that edition rather than the fixed Guatemala cleanup title. The parent additionally reports verifying the filled New York question in the live DOM.
4. **Resolved — topic eyebrows.** Feed, desktop chat sidebar, and article recaptures visibly place topic/scope metadata after their headline/deck. Article topic buttons retain their interaction handler.
5. **Resolved — image attribution touch target.** The secondary-image captures retain attribution in normal flow; its link now explicitly has a 44px minimum height. The parent reports confirming the 44px actual DOM measurement.
6. **Resolved — persisted direction contract.** DESIGN.md now contains THESIS, OWN-WORLD, STORY, FIRST VIEWPORT, FORM, and the corroborated `6c470488` seed provenance, with the supplied references explicitly identified as the code-first quality bar.

**Remaining: clear.** No regression from this correction batch was observed in the reviewed captures. This verdict covers the six scored corrections, not a new full audit. All five originally recorded technical findings are closed; the previous limitations concerning runtime performance, full assistive-technology coverage, physical installation, and enlarged text remain verification limits rather than newly asserted defects.

The scoped updated health score is **17/20 (Good)**: accessibility 3, performance 3, responsive design 4, theming 3, implementation integrity 4. Accessibility remains conservatively scored because a complete WCAG evaluation was not performed; performance and theming were not expanded in this verdict pass. No detector was rerun and no browser/server/test process was launched by the reviewer.

**Disposition: ship — the six scored fixes.**
