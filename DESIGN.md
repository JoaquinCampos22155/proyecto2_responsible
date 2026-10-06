---
name: Perspectiva
description: An editorial reading desk with sources and uncertainty in view.
colors:
  ink: "#10243a"
  muted: "#566575"
  paper: "#f5f7fa"
  white: "#fff"
  line: "#dbe1e7"
  red: "#b93729"
  soft: "#eaf0f5"
  blue: "#214b73"
  ink-secondary: "#d5dfe9"
typography:
  display:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(44px, 5.2vw, 68px)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "clamp(32px, 4vw, 48px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontWeight: 400
    lineHeight: 1.55
  reading:
    fontFamily: "Newsreader, serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.8
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  provenance:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
  story-title:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "23px"
    fontWeight: 800
    lineHeight: 1.24
    letterSpacing: "-0.025em"
  story-metadata:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "11px"
rounded:
  field: "5px"
  control: "6px"
  selection: "8px"
  surface: "12px"
spacing:
  compact: "8px"
  group: "12px"
  row: "16px"
  section: "24px"
  spread: "30px"
  chapter: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "12px 21px"
  button-primary-hover:
    backgroundColor: "{colors.blue}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 21px"
  button-secondary-hover:
    backgroundColor: "{colors.soft}"
  field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  news-story:
    textColor: "{colors.ink}"
  news-story-photo:
    backgroundColor: "{colors.soft}"
    rounded: "{rounded.control}"
  news-story-title-hover:
    textColor: "{colors.blue}"
  chat-sidebar:
    backgroundColor: "{colors.white}"
    width: "400px"
  chat-sidebar-modal:
    backgroundColor: "{colors.white}"
    width: "420px"
  topic-action:
    backgroundColor: "transparent"
    textColor: "{colors.red}"
    padding: "8px 0"
---

# Design System: Perspectiva

## Overview

**Creative North Star: "The Editorial Reading Desk"**

Cool paper, navy ink, fine rules and an original three-stroke masthead frame a Spanish editorial product. Headlines carry the hierarchy; Newsreader gives extended reading a quieter cadence. Interfaces remain direct and compact, with generous space between conversations, reports and editorial tasks.

The identity makes evidence visible through source links, descriptive uncertainty and disclosed imagery. The typography and layout support reading without adding truth scores or synthetic authority. Product commitments come from PRODUCT.md; the recorded implementation is `frontend/`, primarily `src/styles.css`, the shared components and reader/editor surfaces.

**Key Characteristics:**

- Navy ink and cool paper with restrained vermilion.
- Self-hosted DM Sans hierarchy and Newsreader article prose.
- Aligned editorial groups, backend-ordered stories and fine dividing rules.
- Attributed imagery with disclosure outside cropped pixels.
- Visible focus and responsive reader/editor controls.

### Preserved direction contract

### THESIS

An editorial reading desk for understanding news through its sources. The large headline and the conversation lead readers into the same stored reports; evidence and uncertainty remain visible without turning them into truth scores.

### OWN-WORLD

Cool paper (#f5f7fa), white surfaces, navy ink (#10243a), restrained vermilion, fine rules, DM Sans headlines and Newsreader article text. An original three-stroke masthead gives the edition its identity. Ground truth controls imagery: all twelve fictional demo reports use distinct AI-generated illustrations with visible disclosures; missing images leave text-led stories; mock assets remain visibly illustrative and real assets retain source and AI disclosures. The welcome photograph is credited public-domain illustration, never event evidence.

### STORY

Google sign-in opens a news edition with conversation alongside it. Readers ask about the current edition, follow citations into articles, inspect original sources, open their ordered feed, and change a simulated region. Editorial users create a draft, attach sources, assess evidence, choose an attributed image, preview the reader view, confirm human review and publish. History and API usage support that workflow.

### FIRST VIEWPORT

The initial authenticated desktop view pairs the backend feed with a 400px chat sidebar. Featured news align a large lead with two secondary stories; subsequent stories form aligned groups for interests, selected country, international reporting and other regions. Within each group the backend order is preserved, and no article is repeated across groups. Each section has its own large photographic lead, with the headline over its lower image area; mobile keeps this same hierarchy. Section links and a topic filter support scanning. The sidebar places “Limpiar conversación” immediately below “Conversar”; only conversation content scrolls, while the caution note and textarea/send row remain pinned below. Below 1200px, chat protects focus in a modal overlay. Metadata and disclosures follow content rather than appearing as eyebrows. Login retains the explicitly illustrative Antigua photograph.

### FORM

Direction seed `6c470488` · Read mode · assigned index 5. Reader max-width 1240px, body measure approximately 68ch, self-hosted type, flat editorial surfaces and minimal containers. Strong asymmetry identifies lead versus secondary reporting while preserving backend order. Admin uses semantic labels and a linear, state-aware workflow; unsaved changes protect the editor. Focus remains visible, dialogs manage focus, network/error/empty states give a next action, and reduced motion preserves content. The shipped palette is light; no dark theme is advertised.

### Direction provenance and quality bar

The direction seed ran before interface code: key `6c470488`, mode `Read`, assigned index 5. The user's explicitly supplied editorial references set the visual direction and code-first execution; there is no approved generated composition. These references supply hierarchy, typographic density and editorial rhythm, not product facts or borrowed branding:

- /var/folders/zb/2jhfc6nd3fngdf8nnhhlg_hm0000gn/T/codex-clipboard-05d9ecb1-8ed6-4449-a77e-29a0deec68f7.png
- /var/folders/zb/2jhfc6nd3fngdf8nnhhlg_hm0000gn/T/codex-clipboard-7985cf6c-b1cb-4342-a31f-5aa3bcaef008.png

PRODUCT.md records product truth. The original editorial references are the quality bar; `.impeccable/review/` contains browser evidence. `docs/qa/impeccable-audit.md` records the independent review and its focused correction verdict.

This is a scan-mode merge of the existing direction contract after implementation, not a new world choice. The frontmatter records reusable values in the final stylesheet cascade; the extension sidecar is `.impeccable/design.json`. The five blocks above retain the committed surface direction, while the following sections record reusable visual rules.

The original six-fix review at `docs/qa/impeccable-audit.md` reported 17/20 and a scoped ship disposition before these later user corrections. Its 56 responsive checks are historical evidence, not a new verdict for the refreshed feed, images, chat and motion. This documentation pass inspected current source and launched no browser or application process. The parent reports 25 frontend unit/component tests, three emulator integrations and 64 backend tests; these are reported checks, not documenter-executed verification. Physical-phone installation/sign-in, a full assistive-technology evaluation and runtime performance remain unverified here. The parent subsequently verified Gemini deployment and an existing Google reader session: a generated answer with three citations and a measured production token record (docs/qa/production-gemini-verification.json). This documenter pass itself performed no deployment verification.

The user explicitly requested twelve optimized demo illustrations, no eyebrows, premium GSAP interactions and persistent chat. Apple and The Verge were selected through Awesome Design as supporting references for restrained chrome, tactile feedback, image density and editorial pacing. Perspectiva retains the original supplied-reference identity, navy/red/cool-paper palette, typography and masthead. PRODUCT.md records twelve distinct fictional illustrations stored in Project 2 Cloud Storage, with 480/800/1200px WebP variants and Firestore metadata. They illustrate synthetic Spanish reports and do not constitute photographed event evidence. Stock search remains a mock adapter.

## Colors

The palette reads as cool paper and strong navy printing ink. Frontmatter values are normative; the descriptions below explain their roles.

### Primary

- **Navy Ink** (`ink`): headings, primary controls, masthead strokes and strong section rules.
- **Editorial Vermilion** (`red`): masthead punctuation, the final masthead stroke, topic links, required indicators and active navigation rules. It is a selective accent, not a large background.

### Secondary

- **Source Blue** (`blue`): primary button hover, keyboard focus, relevance descriptions and success messages.

### Neutral

- **Cool Paper** (`paper`): the page canvas.
- **White Sheet** (`white`): header, fields, controls and image-backed lead surface.
- **Muted Slate** (`muted`): secondary copy, provenance and opaque input placeholders.
- **Fine Rule** (`line`): dividers and field/secondary-control boundaries.
- **Soft Paper** (`soft`): selected geography, question messages and contextual surfaces.
- **Ink Secondary** (`ink-secondary`): supporting text on navy note and API-usage surfaces.

**The Surface Contrast Rule.** Use the supporting text assigned to its surface: muted slate on light paper and ink secondary on navy. Placeholders use opaque muted slate.

## Typography

**Display Font:** DM Sans, with sans-serif fallback. **Body Font:** DM Sans for interface copy; Newsreader, with serif fallback, for article prose. Both are self-hosted through the installed font packages. There is no separate mono face.

DM Sans establishes a compact, heavy headline voice. Newsreader appears in long-form article paragraphs and a light serif phrase in the welcome headline. The active compact chat invitation uses DM Sans. Headings balance their text rather than relying on manually shortened factual copy.

### Hierarchy

- **Display:** the frontmatter display role records the welcome headline at (44–68px), line-height (1.03), weight (800) and tracking (-0.04em). Compact chat uses a (25px, line-height 1.2) invitation beneath the (19px) “Conversar” heading.
- **Headline:** shared page headings use the headline role; article headlines use (34–54px), then (36px) on mobile and (31px) at the narrow breakpoint.
- **Title:** section headings use (25px, tracking -0.025em). The shared story-title role is (23px, weight 800, line-height 1.24); lead stories use (28–38px, line-height 1.12), reducing to (25px) in the narrowest containers, secondary (21px) and grid stories (22px). Container queries specialize these values for the available feed width.
- **Body:** ordinary interface copy uses the body role with surface-specific sizes, mostly (13–16px). Story summaries use (14px, line-height 1.6). Article prose uses the reading role at a maximum measure of (68ch); mobile is (20px, line-height 1.75), then (19px) at the narrow breakpoint. Chat answers use (17px, line-height 1.55).
- **Label:** field labels and navigation use the label role. Article evidence/source metadata use the provenance role; scoped feed metadata, evidence/relevance footers use story-metadata (11px); image credits remain on article detail. Topic and answer status text use sentence case, normal tracking and weight (500).
  **The Headline First Rule.** Put topic and geographic metadata beneath the headline or deck. Keep the headline's scale and weight responsible for hierarchy.

## Layout

The default reader container caps at (1160px) with (32px) horizontal margins. Above (1450px) it caps at (1240px) with (50px) margins. At or below (1000px), margins are (24px); at or below (760px), (18px); at or below (430px), (16px). The responsive thresholds in the sidecar mirror these exact queries rather than a framework's default breakpoint names.

The open desktop chat reserves (400px) on the right at viewport widths of (1200px) or more. It is a nonmodal companion; the reader remains accessible. At (1199px) or below it becomes a (420px) modal panel, bounded by viewport width, with background inertness, contained focus, Escape/close actions and focus restoration. At (600px) or below it fills the viewport and uses (100dvh).

Feed layout responds to its own available width, so reserving chat space also recomposes the edition. Every section uses its first returned story as a large photographic lead. Wide sections use (1.35fr / 1fr), (24px) separation and two natural-height secondary stories; each secondary image spans its column at ratio (3.2). The lead uses a contrast overlay for white text and at least (420px) image height. Single-story sections use a full-width lead. At feed-container width (920px) or less, the lead spans the width with at least (400px) height, then two secondary columns follow. At (620px) or less, lead minimum height becomes (360px), summaries hide, and secondary image ratio becomes (1.4), or (1.9) for a single secondary. Additional stories retain a supporting grid. Metadata stays beneath headlines; evidence remains in compact normal-flow footers.

The Noticias heading is (28px), with compact (12px) top padding and (8px) bottom margin. Section navigation and the topic filter share one sticky toolbar on wide screens; small containers wrap them into two rows. The global sample note replaces repeated [DEMO] prefixes in displayed titles. Article bodies and stored provenance preserve the synthetic nature of the content.

The edition section links scroll horizontally within their own rail. The topic filter canonicalizes both climate and weather to the displayed clima choice. After the first three featured items, up to three matching interests are selected; remaining items are divided into selected-country, international and other-region groups without duplication. Group membership changes presentation, not backend ranking. Within each group, incoming order remains intact. Country explanations use the selected country's actual name, such as Guatemala, rather than generic relevance wording.

The article reading layout retains a flexible prose column and (265px) source rail with (70px) separation. Article header measure caps at (800px), inside a (1020px) article layout. At the (760px) viewport threshold, article/source/editor workspaces stack, desktop navigation becomes persistent mobile destinations, and editor fields change from two columns to one. Tabs and actions wrap; footer space accounts for the mobile rail.
The reusable rhythm moves from compact (8–16px) internal groups to (24–30px) section spacing and (40px) chapter spacing. Large editorial column gaps remain distinct from control padding. Source links, image attribution links and principal controls provide at least (44px) targets; do not infer that every compact ancillary control has been measured to that size.

**The Ordered Asymmetry Rule.** Establish lead, secondary and supporting prominence with scale and space. Preserve returned order within each displayed group and include each article only once.

## Elevation & Depth

Most editorial surfaces are flat. Navy/white/soft-paper changes and fine rules carry grouping. Account and modal surfaces use localized soft shadows; the compact sidebar composer has no shadow. The desktop chat uses a fine left rule, while its modal version gains an offset shadow and backdrop.

### Shadow Vocabulary

- **Account menu:** (`0 10px 35px #10243a20`) for the floating account panel.
- **Modal:** (`0 20px 80px #10243a35`) with (`#10243a80`) backdrop for protected focus.
- **Modal chat:** (`-20px 0 70px #10243a25`) with (`#10243a65`) backdrop below the desktop-companion threshold.

GSAP owns route reveal, story photographic hover, button press and sidebar opening. Route headings enter from (14px) offset over (0.45s, power3.out); featured stories enter from (16px) over (0.45s), staggered (0.07s), starting (0.1s) after the heading. Mouse-only photographic hover scales to (1.025) over (0.65s, power2.out), returning over (0.5s). Button press scales to (0.97) over (0.1s, power2.out), returning over (0.22s, power3.out). Sidebar opening begins from (32px) horizontal offset over (0.4s), staging its heading, suggestions and composer from (8px) over (0.35s), with (0.06s) stagger and (0.1s) overlap. Completion clears authored transforms/opacity where specified.

`gsap.matchMedia` runs these sequences only under no-preference motion. `useGSAP` uses scoped contexts and reverts on route/open changes; cleanup removes pointer listeners, disconnects the mutation observer and reverts media. The old CSS page entrance is disabled by the final cascade. The loading bar retains its (1.2s ease-in-out) sweep and becomes static under reduced motion; scrolling also respects that preference.
**The Editorial Flatness Rule.** Keep story and source surfaces flat; use the recorded overlay elevation only when a surface actually floats or protects focus.

## Shapes

The masthead's skewed three strokes are the signature geometry. Its stepped heights and single red stroke repeat in the header/footer identity; this mark is not a general illustration style.

Controls are gently squared with the control radius; fields use the field radius; geography options use the selection radius; account overlays and dialogs use the surface radius. Scoped feed stories are open editorial groups with gently squared (6px) image frames rather than rounded filled cards. Fine one-pixel borders define secondary controls, fields and editorial separators. The avatar is circular. Smaller note/composer/message rounding exists in the implementation; it does not establish the default radius for new content cards.

Image pixels crop inside dedicated overflow-hidden frames with `object-fit: cover`. Photographic section leads use a contrast overlay for their lower headline area. Secondary images span the column, with responsive ratios recorded in Layout. Article images retain their (1.5) frame and disclosure/credit beneath the crop. Never constrain combined article image-and-provenance height to enforce a crop.

## Components

### Buttons

Direct and compact. Primary buttons use navy ink and white text, the control radius, (12px 21px) padding and minimum height (46px). Hover uses source blue. Secondary buttons use a transparent surface and fine-rule border; hover uses soft paper. Small variants retain the minimum height with (10px 14px) padding and (12px) text. Disabled buttons use (0.5) opacity and a not-allowed cursor. Shared focus is a (3px) source-blue outline with (4px) offset.

### Topic actions

Actual topic metadata, not decorative eyebrows or invented tags. Article topic controls use vermilion, a fine bottom rule, (8px 0) padding and minimum height (44px). They sit after the deck and preserve the topic interaction. Reader topic text remains sentence case beneath headlines; there is no generic filled-pill vocabulary.

### Cards / Containers

Scoped feed stories remain open editorial groups. Each section's first item is a photographic lead with larger white type over a darkened lower image area. Supporting stories use full-column photographs and natural-height text/metadata/evidence groups. The feed omits repeated image credits and AI labels; these remain available on article detail. Selected geography options retain navy borders and soft-paper fill.

### Inputs / Fields

White, fine-rule borders, field radius, (11px 13px) padding and minimum height (46px). Labels are explicit and sit above fields; helper text follows. Textareas resize vertically in forms. Opaque muted placeholders remain readable on the field background. Required and error text use vermilion; success uses source blue. Focus uses the shared outline.

### Navigation

Desktop text navigation uses (13px, weight 600) labels and a (2px) red active underline. Conversation controls belong to the sidebar header and collapsed rail, not navigation. Mobile destinations use stroked SVG icons plus labels, a red active rule, and at least (47px) link height. Admin navigation wraps; its active destination uses vermilion and bold text. No glyph or emoji substitutes belong to the icon system.

### Conversation sidebar and composer

“Conversar” heads the panel; the (44px) clear action sits immediately beneath it. A separate flexible scrolling area contains the invitation, current-feed suggestions, messages, citations, pending status and recoverable errors. The note follows this area and sits above the composer; both remain pinned within the panel. The compact container uses (24px) horizontal insets, reducing to (20px) on narrow screens.

The bordered white composer uses (8px) padding/gap, no shadow, and safe-area-aware bottom margin of at least (16px). Its textarea is (56px) high with (22px) line-height and (14px) type; the (44px) send control is centered beside it. Suggestions come from the current returned edition. Closing preserves mounted session state; clear resets messages, pending error state and draft text when enabled. Conversation remains session-only and is not advertised as saved history.

Chat citations use one (44px) row with up to three circular image links and a native expandable Fuentes control. The circles have (38px) images inside (44px) links, with accessible clean article titles. Missing images use a file icon. Expanding Fuentes exposes article and original source links; the disclosure is keyboard operable. Answer status and evidence share a compact row; redundant explanatory evidence paragraphs are omitted.

### Image and source provenance

Feed stories show compact evidence/context footers. Image AI labels and credit links are omitted from cards by the accepted user request and remain on article detail; the synthetic edition is identified once in the feed header. Article images retain a transparent disclosure line and caption beneath their crop. Source entries use fine upper rules, wrapping URLs and distinct publisher/detail lines. Missing image records render no image; mock assets render an explicitly simulated placeholder; failed assets state that the image is unavailable.

The twelve current synthetic stories use distinct generated illustrations from Cloud Storage; metadata resides in Firestore. The shared image renderer selects 480/800/1200px WebP variants for the generated provider, declares dimensions (1200×800), decodes asynchronously, prioritizes the lead and lazily loads non-leads. AI disclosure identifies illustration rather than photographed event evidence. The welcome photograph remains an attributed public-domain illustration.

## Do's and Don'ts

### Do:

- **Do** preserve backend ordering within editorial groups, with no duplicate article across groups.
- **Do** place topic and scope metadata beneath headlines or decks.
- **Do** keep article image disclosure and attribution outside cropped pixels, with 44px attribution targets. Keep feed card chrome compact.
- **Do** use opaque muted placeholders and surface-specific supporting text.
- **Do** retain self-hosted DM Sans, Newsreader article prose, visible focus and reduced-motion behavior.
- **Do** label demo, mock, illustrative and assisted content according to actual provenance.
- **Do** use plain Spanish section/action wording and the selected country name.
- **Do** keep the clear action below Conversar and the caution note above the pinned textarea/send row.
- **Do** scope GSAP motion, respect reduced motion and revert contexts/listeners on lifecycle changes.

### Don't:

- **Don't** introduce a truth-score aesthetic for evidence states.
- **Don't** substitute invented event imagery when the backend has no image.
- **Don't** turn the flat editorial story grid into nested decorative cards.
- **Don't** use decorative pre-heading eyebrows, glyph icons or system display faces as the house style.
- **Don't** advertise a dark theme or verified physical installation/sign-in without corresponding implementation and evidence.


## Accepted density correction — 2026-10-03

The latest user screenshots supersede the earlier layout verdict. New browser evidence is `.impeccable/review/compact-desktop.jpg`, `compact-mobile.jpg`, `compact-guatemala.jpg` and `compact-responsive.json`. Eight actual widths from 320 to 1440px retained twelve headlines and four section leads without horizontal overflow. `compact-chat-sources.jpg` is an explicitly isolated visual fixture of the real ChatSources component, not a production Gemini answer. Its closed source row measured 44px, all three images loaded, and the native disclosure opened with Enter. Current frontend lint, typecheck, build and 25 unit/component tests pass. No fresh backend deployment or production AI call was needed for these presentation corrections.


## Varied section hierarchy — 2026-10-03

The accepted refinement replaces repeated subsection covers with semantic compositions. Destacadas keeps the photographic overlay cover. Country reporting uses a plain photographic feature with adjacent dispatches; a single country report splits image and text on wide screens. Internacional uses a full-width image/ink-text band with a row of supporting photographs beneath. Otras regiones uses a Newsreader feature beside a compact illustrated list containing all supporting reports. Interests use a softer feature and condensed rail. Each section's first returned report remains its lead; incoming order and uniqueness are unchanged. No new importance score, labels or factual claims were added.

Containers below 620px stack the country/world feature; regional dispatches retain their illustrated list. The first browser pass found a real 768px overflow: the inherited secondary two-column grid squeezed the regional list. A one-column regional rail corrected it. Final eight-width browser checks preserve twelve headlines without overflow (varied-responsive.json). Desktop/mobile evidence is varied-desktop.jpg, varied-regions.jpg and varied-mobile.jpg in .impeccable/review. Temporary browsers/processes were not started; requested5173 is retained.


## Reading onward and persistent conversation — 2026-10-03

Each reader article now ends with Sigue leyendo: up to three other published records from the current edition, preferring shared topics and preserving incoming order inside each group. The current article, drafts, archives and duplicate IDs are excluded. A permanent Ver la portada link also works when there are no candidate reports. Links reuse the actual reader route and its article_open/read tracking. Public preview uses the same component with its synthetic dataset and /preview links; embedded editorial previews omit this section.

Conversar was removed from desktop and mobile navigation. Desktop reader and public-preview layouts open the 400px companion by default, including direct article URLs. Contraer conversación changes it into a 56px rail; Expandir conversación restores it. Collapse and the in-memory conversation persist across reader navigation. Mobile starts with a 48px corner control to preserve reading; expanding retains the focus-protected overlay, Escape and return-focus behavior. Public preview shows an explicit Google sign-in invitation rather than making unauthenticated chat requests or fabricating AI answers. The article reading grid now responds to its available container width when chat is open.

Verification: 27 unit/component tests pass; lint and production build pass. New regressions cover exclusion of unpublished/duplicate/current candidates, real related-article navigation, direct-route default desktop opening, removal of the navbar chat action and collapse persistence. Browser inspection followed library→school through a related link with the panel collapsed, then restored it. Mobile Escape restored the launcher focus and page scroll. Eight collapsed article widths and three expanded desktop widths have no horizontal overflow, with three related reports throughout. Evidence is article-responsive.json, article-open-responsive.json, article-related-sidebar.jpg and article-related-mobile.jpg under .impeccable/review. No production deployment or new AI invocation was required. Requested localhost5173 remains running.
