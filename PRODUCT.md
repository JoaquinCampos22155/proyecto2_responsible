# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, Vite, Tailwind, React Router, TanStack Query, Firebase Web SDK, Vitest and Testing Library, as requested.

## Users

Readers and human editors demonstrating an AI-assisted news PWA for a university Responsible AI course.

## Product Purpose

Make personalized news understandable through simulated geography, source provenance, uncertainty and visible human editorial oversight.

## Operating Context

Project 2 only (`proyecto2responsibleai`); local development and a responsive installable PWA. The backend contract is PROJECT2_BACKEND_HANDOFF.md. Desktop reader routes, including direct articles, open chat as a sidebar by default; it collapses into its own rail. Mobile uses a compact access control and a focus-protected overlay.

## Capabilities and Constraints

Google authentication; deterministic backend ranking; session-only grounded chat; reader, location, article and admin flows. No GPS. No competing frontend ranking. Reader/editor mutations go through the API. The user-authorized operator imported demo illustrations into Project 2 Cloud Storage and saved URL metadata in Firestore. Backend credentials never belong in the frontend. Native work is deferred. User requests no decorative eyebrows, GSAP motion and premium microinteractions with reduced-motion support, and chat as a persistent sidebar.

Latest accepted UX correction: compact Noticias header and filter/navigation toolbar; a leading story in every section expressed through distinct country, international, regional and interest compositions, with larger photographs; no displayed [DEMO] title prefixes or repeated feed image credits; compact circular chat citation links with expandable original sources; aligned scan-friendly story rows and cards; named sections for featured news, interests, selected country, international and other regions; Spanish demo content; plain copy; chat clear action below its heading and a pinned input aligned with send; article links for continued reading and an independent collapsible chat control instead of a navbar action.

## Brand Commitments

Original editorial identity inspired by the two supplied magazine/news references. Spanish UI selected from the user's language; Perspectiva is an implementation choice, not an existing brand claim.

## Evidence on Hand

Backend synthetic news, explicitly marked DEMO. No invented production stories or analytics. Production stock search uses a mock adapter. Gemini chat is active in production; the existing Google reader session displayed an answer with three citations and Firestore recorded measured tokens. All twelve fictional demo news records have distinct generated illustrations, optimized to 480/800/1200px WebP, with AI disclosure on article detail and a compact illustrative-edition note in the feed. Backend DEMO markers remain stored; reader titles omit the prefix.

## Product Principles

- Explain relevance and evidence without declaring truth.
- Keep original sources accessible.
- Make publication a deliberate human action.
- Respect backend ordering and geographic diversity.

## Accessibility & Inclusion

Semantic, keyboard accessible UI; visible focus, neutral evidence labels, readable metadata, mobile widths starting at 320px.
