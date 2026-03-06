# Desktop Phase 1 Acceptance And Merge Checklist

## Release scope

Desktop phase 1 is considered complete when the app behaves as a desktop-first reader and the remaining design gaps are only tone-level polish.

Reference branch:

- `codex/toc-panel-and-epub-jump-fix`

Latest branch head at the time of this document:

- `5c92425` `test(epub): use valid xhtml fixtures`

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

## Manual acceptance checklist

### Library
- [ ] Desktop layout shows persistent left sidebar and top toolbar.
- [ ] Shelf renders as a 4-column, cover-first bookshelf.
- [ ] Search filters books on the same route.
- [ ] Import action works from the compact desktop trigger.
- [ ] At-rest book tiles do not show heavy management chrome.

### Reader
- [ ] Opening a book routes to `/reader/:bookId`.
- [ ] Toolbar stays visible on desktop.
- [ ] Left/right page controls still work.
- [ ] Reader remains visually calmer than earlier iterations.

### TOC / Search / Settings / Annotations
- [ ] TOC opens in the right-side utility pane.
- [ ] TOC chapter jump works for EPUB.
- [ ] Search opens in the right-side utility pane.
- [ ] Settings opens in the right-side utility pane.
- [ ] Annotation pane still supports create/delete/locate flows.

### Notes
- [ ] `/notes/:bookId` keeps working.
- [ ] Existing notes can be edited and deleted.
- [ ] Locator-based return path to reading context still works.

### Theme behavior
- [ ] Library remains light.
- [ ] Reader theme changes remain scoped to the reader experience.
- [ ] `light / dark / sepia` still function.

## Visual sign-off

Use the latest local comparison artifacts:

- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/report.md`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-library.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader-toc.png`

Current sign-off status:
- `Library`: acceptable, residual gap is light polish only
- `Reader`: acceptable, residual gap is maintenance-level polish only
- `TOC`: acceptable, residual gap is optional cosmetic polish only

## Known residual items

These are not merge blockers for desktop phase 1:
- sidebar support copy can still be softened slightly
- tiny typography/spacing differences remain in the library shell
- further TOC tone polish is possible

## Merge checklist

- [ ] Confirm branch target is `main`
- [ ] Copy summary from `/Users/quentin/workspace/ebook-reader/docs/desktop-phase1-pr.md`
- [ ] Confirm CI is green
- [ ] Confirm local smoke is green
- [ ] Confirm helper directories are excluded from Git
- [ ] Merge without squashing away useful milestone history unless repository policy requires squash

## Post-merge recommendation

After merge, the highest-value next steps are:
1. mobile design-system unification
2. focused `epubjs` integration debt cleanup
3. release-note and demo capture prep
