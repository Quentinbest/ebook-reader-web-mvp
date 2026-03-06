# Demo Capture Plan

## Goal

Prepare one repeatable capture workflow for stakeholder demos and release evidence across both desktop and mobile surfaces.

This document is the tracked source of truth for the capture flow. Local screenshots, recordings, and one-off helper scripts remain outside Git under `/Users/quentin/workspace/ebook-reader/output/`.

## Scope

This phase covers:
- desktop Library / Reader / TOC capture
- mobile Library / Reader / Notes capture
- pane-specific mobile evidence for TOC / Settings / Annotations
- command sequence and capture ordering
- file naming and review rules

This phase does not cover:
- new product features
- additional visual polish
- automated video export
- committing screenshot artifacts into Git

## Reference Inputs

### Product state
- Desktop phase 1: merged to `main`
- Mobile phase 1: merged to `main`
- Local preview baseline: `http://127.0.0.1:4178`

### Existing evidence sources
- Desktop review artifacts:
  - `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/`
- Mobile review artifacts:
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/`
- Acceptance docs:
  - `/Users/quentin/workspace/ebook-reader/docs/desktop-phase1-acceptance.md`
  - `/Users/quentin/workspace/ebook-reader/docs/mobile-phase1-acceptance.md`

## Capture Goals

A complete demo capture set should prove:
1. Library is coherent on desktop and mobile
2. Reader works on desktop and mobile
3. TOC navigation is demonstrable
4. Search / Settings / Annotations pane model is demonstrable
5. Notes workflow is demonstrable on mobile and desktop if needed
6. Artifacts can be regenerated from a clean local runbook without guessing hidden steps

## Required Environment

### Local app
Run the app preview from the repo root:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run build
npm run preview -- --host 127.0.0.1 --port 4178
```

### Baseline checks
Before capturing, require:

```bash
cd /Users/quentin/workspace/ebook-reader
npm test
npm run test:e2e:smoke
```

If either command is red, do not trust new screenshots.

## Tracked Capture Commands

The repo now includes reusable capture commands:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:serve:design
npm run demo:capture:mobile-shell
npm run demo:capture:mobile-panes
npm run demo:capture:desktop-visual
```

Environment overrides:
- `APP_URL` overrides the local preview URL
- `OUT_DIR` overrides the output folder
- `DESIGN_URL` overrides the frozen design page URL for desktop visual comparison

Example:

```bash
cd /Users/quentin/workspace/ebook-reader
APP_URL=http://127.0.0.1:4178 OUT_DIR=/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture npm run demo:capture:mobile-shell
```

For desktop visual comparison, start the frozen design server in a separate terminal first:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:serve:design
```

## Artifact Storage Rules

Artifacts are intentionally local-only and must stay outside Git.

Primary artifact root:
- `/Users/quentin/workspace/ebook-reader/output/playwright/`

Recommended subfolders:
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/`

Recommended filenames:
- `desktop-library-final.png`
- `desktop-reader-final.png`
- `desktop-reader-toc-final.png`
- `mobile-library-final.png`
- `mobile-reader-final.png`
- `mobile-notes-final.png`
- `mobile-reader-toc-final.png`
- `mobile-reader-settings-final.png`
- `mobile-reader-annotations-final.png`

## Canonical Demo Flow

### Desktop flow
1. Open `/library`
2. Capture Library default shelf
3. Open one imported EPUB
4. Capture Reader default state
5. Open TOC via `reader-action-toc`
6. Capture TOC pane
7. Optionally open Search / Settings / Annotations for supporting screenshots

### Mobile flow
1. Open `/library`
2. Capture Library mobile shell
3. Open one imported EPUB
4. Capture Reader mobile shell
5. Open TOC bottom sheet
6. Capture TOC sheet
7. Open Settings bottom sheet
8. Capture Settings sheet
9. Open Annotations bottom sheet
10. Capture Annotations sheet
11. Navigate to `/notes/:bookId`
12. Capture Notes mobile workspace

## Interaction Targets

Stable selectors already present in the app:
- `library-search-input`
- `library-import-trigger`
- `library-book-grid`
- `book-card`
- `book-card-open`
- `reader-action-back`
- `reader-toolbar`
- `reader-action-toc`
- `reader-action-search`
- `reader-action-settings`
- `reader-action-annotations`
- `reader-page-arrow-left`
- `reader-page-arrow-right`
- `reader-utility-pane`
- `notes-locator-rail`

Use these selectors for browser automation instead of text-only selectors whenever possible.

## Capture Order

Use this order to minimize state drift:
1. Desktop Library
2. Desktop Reader
3. Desktop TOC
4. Mobile Library
5. Mobile Reader
6. Mobile TOC
7. Mobile Settings
8. Mobile Annotations
9. Mobile Notes

Reasoning:
- desktop captures are less sensitive to viewport reset
- mobile pane captures depend on the reader already being open
- notes capture should happen last because it is a route break from the reader workflow

## Viewport Baselines

### Desktop
- width: `1440`
- height: `960`

### Mobile
- width: `393`
- height: `852`

If a tool uses device emulation instead of raw viewport values, keep the visible result equivalent to the mobile shell baseline already used in local review.

## Review Standard

A new capture set is acceptable when:
- the app is on `main` or an explicitly named review branch
- baseline automated checks are green
- library screenshots show real imported books, not empty state by mistake
- reader screenshots show loaded content, not intermediate loading states
- pane screenshots show the intended pane, not transition mid-frames
- notes screenshot shows locator rail plus editable note content

## Failure Modes

### Empty library screenshot captured by mistake
Cause:
- capture started before import or after state reset

Fix:
- wait for `library-book-grid` and at least one `book-card`

### Reader captured before EPUB is ready
Cause:
- screenshot fired before iframe content settled

Fix:
- wait for stable reader content and toolbar visibility

### TOC pane opens but capture shows stale chapter state
Cause:
- capture fired before pane content updated

Fix:
- wait for `reader-utility-pane` plus at least one visible TOC item

### Mobile notes screen looks like desktop squeeze
Cause:
- wrong viewport baseline

Fix:
- re-run with mobile viewport before route transition to `/notes/:bookId`

## Recommended Next Deliverables

After this doc is in place, the next useful tracked deliverables are:
1. a committed demo shot checklist
2. a committed run command guide for the local capture scripts that live under `output/`
3. optional browser automation hardening if demo capture becomes a repeated release step
