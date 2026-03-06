# Demo Walkthrough

## Goal

Use this script when you need a clear product demo for the current ebook reader build without improvising the flow live.

This walkthrough assumes the repo is on a stable `main`-derived build and that demo artifacts have already been generated with:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:capture:all
```

## Demo modes

### 3-minute demo
Use when the audience only needs product shape and confidence.

Flow:
1. Library
2. Reader
3. TOC
4. Mobile Reader
5. Notes

### 5-minute demo
Use when the audience wants both product direction and operating depth.

Flow:
1. Desktop Library
2. Desktop Reader
3. Desktop TOC
4. Desktop capture vs design reference
5. Mobile Library
6. Mobile Reader sheets
7. Mobile Notes

## Preconditions

### Live app
- app preview: `http://127.0.0.1:4178`
- frozen design reference: `http://127.0.0.1:4174/03-final-screens.html`

### Local evidence pack
Artifacts are expected under:
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture`

Primary files:
- `desktop-library-final.png`
- `desktop-reader-final.png`
- `desktop-reader-toc-final.png`
- `mobile-library-final.png`
- `mobile-reader-final.png`
- `mobile-reader-toc-final.png`
- `mobile-reader-settings-final.png`
- `mobile-reader-annotations-final.png`
- `mobile-notes-final.png`

## Demo narrative

### Opening
Say:
- “This build now has one coherent design system across desktop and mobile.”
- “Desktop and mobile are both in the real application, not in a disconnected prototype.”
- “The demo flow shows the same core product loop: library, read, navigate, annotate, and review notes.”

### Segment 1: Desktop Library
Open:
- `http://127.0.0.1:4178/library`

Show:
- cover-first shelf
- local search on the same route
- lower-noise navigation chrome

Say:
- “The library is now cover-led instead of admin-led.”
- “Management actions are still there, but they no longer dominate the surface.”

### Segment 2: Desktop Reader
Open a book from the shelf.

Show:
- persistent desktop toolbar
- centered reading surface
- page arrows
- low-chrome reading workspace

Say:
- “Reader chrome is always available on desktop, but visually secondary.”
- “The reading surface is the primary object now, not the shell.”

### Segment 3: Desktop TOC
Click the TOC action.

Show:
- right-side utility pane
- chapter jump behavior
- settled TOC density

Say:
- “TOC, search, settings, and annotations now share one utility pane model.”
- “That gives us one interaction language instead of multiple ad hoc overlays.”

### Segment 4: Desktop design comparison
Use these artifacts if you need design proof:
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-library-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-library-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-reader-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-reader-final.png`

Say:
- “This is not pixel-perfect theatre. The key point is that the app structure and visual hierarchy now match the approved design direction.”

### Segment 5: Mobile Library
Switch to the mobile artifact or mobile viewport.

Show:
- mobile shell
- 2-column shelf
- lighter mobile brand block

Say:
- “Mobile is not a squeezed desktop layout anymore.”
- “The shell, shelf rhythm, and controls were re-cut for small screens.”

### Segment 6: Mobile Reader sheets
Use these artifacts:
- `mobile-reader-final.png`
- `mobile-reader-toc-final.png`
- `mobile-reader-settings-final.png`
- `mobile-reader-annotations-final.png`

Show:
- reader toolbar on mobile
- bottom-sheet TOC
- bottom-sheet settings
- bottom-sheet annotations

Say:
- “On mobile, the same product actions exist, but the interaction model becomes bottom sheets.”
- “That preserves feature parity without forcing desktop layout rules onto a phone.”

### Segment 7: Notes
Use:
- `mobile-notes-final.png`

Say:
- “Notes remain a full workspace, but now fit the same design system instead of looking like a separate tool.”

## Presenter fallback plan

If the live app stalls, do not improvise.

Fallback order:
1. `desktop-library-final.png`
2. `desktop-reader-final.png`
3. `desktop-reader-toc-final.png`
4. `mobile-library-final.png`
5. `mobile-reader-final.png`
6. `mobile-reader-toc-final.png`
7. `mobile-reader-settings-final.png`
8. `mobile-reader-annotations-final.png`
9. `mobile-notes-final.png`

If design justification is requested, pair each desktop artifact with:
- `design-library-final.png`
- `design-reader-final.png`
- `design-toc-final.png`

## Recommended phrasing

Use these sentences if you need concise positioning:
- “This is now one real product surface across desktop and mobile, not a prototype-only redesign.”
- “The design work was translated into the live app without changing storage contracts or rewriting the reading engines.”
- “The remaining gaps are now polish-level, not structural.”

## Avoid saying
- “This is basically done”
- “This is pixel-perfect”
- “Nothing left to fix”

Those statements are weaker than the actual truth. The stronger and more accurate claim is:
- “The core product loop is stable, shipped into the live app, and aligned enough for review and continued iteration.”

## Regeneration command

If you need fresh artifacts before the demo:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:capture:all
```
