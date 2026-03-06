# Desktop Phase 1 Acceptance And Merge Checklist

## Release scope

Desktop phase 1 is considered complete when the app behaves as a desktop-first reader and the remaining design gaps are only tone-level polish.

Reference branch:

- `codex/toc-panel-and-epub-jump-fix`

Latest branch head at the time of this document:

- `b8e3cd5` `docs(release): add desktop phase 1 merge notes`

## Required automated checks

Run and require green status for:

```bash
npm run build
npm test
npm run test:e2e:smoke
```

Expected coverage from the current suite:
- Library desktop search
- EPUB import/read/annotate/notes flow
- EPUB TOC relative navigation
- EPUB iframe page-turn behavior
- PDF page-turn behavior
- single-image EPUB cover aspect ratio

## Final acceptance record

Acceptance was re-run on `2026-03-06 21:16:08 CST` against the local desktop build at:

- `http://127.0.0.1:4178`

Evidence used for final sign-off:

- local automated checks:
  - `npm run build`
  - `npm test`
  - `npm run test:e2e:smoke`
- focused browser acceptance scripts:
  - `/Users/quentin/workspace/ebook-reader/output/playwright/manual_reader_panes_acceptance.mjs`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/manual_notes_acceptance.mjs`
- latest local visual comparison artifacts:
  - `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/report.md`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-library.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader-toc.png`

Result:

- Desktop phase 1 is accepted locally.
- Remaining gaps are polish-only and are not merge blockers.
- GitHub Actions for the current PR head show one passing and one failing `test-and-build` run; merge should wait for that CI state to be cleaned up or re-run to a single green head status.

## Manual acceptance checklist

### Library
- [x] Desktop layout shows persistent left sidebar and top toolbar.
- [x] Shelf renders as a 4-column, cover-first bookshelf.
- [x] Search filters books on the same route.
- [x] Import action works from the compact desktop trigger.
- [x] At-rest book tiles do not show heavy management chrome.

### Reader
- [x] Opening a book routes to `/reader/:bookId`.
- [x] Toolbar stays visible on desktop.
- [x] Left/right page controls still work.
- [x] Reader remains visually calmer than earlier iterations.

### TOC / Search / Settings / Annotations
- [x] TOC opens in the right-side utility pane.
- [x] TOC chapter jump works for EPUB.
- [x] Search opens in the right-side utility pane.
- [x] Settings opens in the right-side utility pane.
- [x] Annotation pane still supports create/delete/locate flows.

### Notes
- [x] `/notes/:bookId` keeps working.
- [x] Existing notes can be edited and deleted.
- [x] Locator-based return path to reading context still works.

### Theme behavior
- [x] Library remains light.
- [x] Reader theme changes remain scoped to the reader experience.
- [x] `light / dark / sepia` still function.

## Visual sign-off

Use the latest local comparison artifacts:

- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/report.md`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-library.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader-toc.png`

Current sign-off status:
- `Library`: accepted, residual gap is light polish only
- `Reader`: accepted, residual gap is maintenance-level polish only
- `TOC`: accepted, residual gap is optional cosmetic polish only

## Known residual items

These are not merge blockers for desktop phase 1:
- sidebar support copy can still be softened slightly
- tiny typography/spacing differences remain in the library shell
- further TOC tone polish is possible

## Merge checklist

- [x] Confirm branch target is `main`
- [x] Copy summary from `/Users/quentin/workspace/ebook-reader/docs/desktop-phase1-pr.md`
- [ ] Confirm CI is green
- [x] Confirm local smoke is green
- [x] Confirm helper directories are excluded from Git
- [ ] Merge without squashing away useful milestone history unless repository policy requires squash

## Post-merge recommendation

After merge, the highest-value next steps are:
1. mobile design-system unification
2. focused `epubjs` integration debt cleanup
3. release-note and demo capture prep
