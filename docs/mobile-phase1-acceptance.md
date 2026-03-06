# Mobile Phase 1 Acceptance And Merge Checklist

## Release scope

Mobile phase 1 is considered complete when the app behaves coherently on small screens and the remaining gaps are limited to low-risk polish.

Reference branch:

- `codex/mobile-shell-first-slice`

Latest branch head at the time of this document:

- `07e7aaf` `test(e2e): stabilize mobile phase ci checks`

## Required automated checks

Run and require green status for:

```bash
npm run build
npm test
npm run test:e2e:smoke
node /Users/quentin/workspace/ebook-reader/output/playwright/mobile_shell_smoke.mjs
```

Expected coverage from the current suite:
- Library search still works
- EPUB import/read/annotate/notes flow still works
- EPUB TOC relative navigation still works
- EPUB iframe page-turn behavior still works
- PDF page-turn behavior still works
- mobile shell smoke captures Library and Reader states

## Final acceptance record

Acceptance was re-run on `2026-03-06 22:26:40 CST` against the local preview at:

- `http://127.0.0.1:4178`

Evidence used for sign-off:

- local automated checks:
  - `npm run build`
  - `npm test`
  - `npm run test:e2e:smoke`
  - `node /Users/quentin/workspace/ebook-reader/output/playwright/mobile_shell_smoke.mjs`
- local mobile visual artifacts:
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-library.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-reader.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-notes.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/report.md`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-toc.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-settings.png`
  - `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-annotations.png`

Result:

- Mobile phase 1 is accepted locally.
- Remaining gaps are polish-only.
- PR `#2` was merged: `feat(mobile): ship mobile-first shell and reading workspace refinement`
- GitHub Actions for the final PR head `07e7aaf` are green:
  - `push` `test-and-build`: success
  - `pull_request` `test-and-build`: success
- Merge commit on `main`: `6d581df`

## Manual acceptance checklist

### Library
- [x] Mobile Library no longer inherits the desktop sidebar layout directly.
- [x] Mobile Library presents a coherent top shell and 2-column shelf.
- [x] Search remains usable on the same route.
- [x] Import remains usable in mobile Library.

### Reader
- [x] Mobile Reader hides redundant desktop sidebar chrome.
- [x] Toolbar remains usable on small screens.
- [x] Reader utility panes open as coherent bottom sheets.
- [x] Pane density is acceptable for TOC, Settings, and Annotations.

### Notes
- [x] Mobile Notes no longer feels like a squeezed desktop layout.
- [x] Locator navigation remains available on small screens.
- [x] Editing and deletion flows still work.
- [x] Return-to-reader locator path still works.

### Regression safety
- [x] EPUB import/read/annotate/notes flow remains green.
- [x] EPUB TOC relative navigation remains green.
- [x] PDF page-turn flow remains green.

## Visual sign-off

Use the latest local mobile artifacts:

- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-library.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-reader.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-notes.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/report.md`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-toc.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-settings.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-annotations.png`

Current sign-off status:
- `Library`: accepted, residual gap is light tone polish only
- `Reader`: accepted, residual gap is low-risk pane/tone polish only
- `Notes`: accepted, residual gap is minimal cosmetic polish only

## Known residual items

These are not merge blockers for mobile phase 1:
- tiny mobile typography and spacing differences remain in the shell
- mobile reader base screenshot still depends on content-loading timing and is not a perfect visual artifact by itself
- additional mobile screenshot automation could be improved if this becomes a repeated review path

## Merge checklist

- [x] Confirm branch target is `main`
- [x] Copy summary from `/Users/quentin/workspace/ebook-reader/docs/mobile-phase1-pr.md`
- [x] Confirm CI is green for the PR head
- [x] Confirm local smoke is green
- [x] Confirm helper directories are excluded from Git
- [x] Merge without flattening useful milestone history unless repository policy requires it

## Post-merge recommendation

After merge, the highest-value next steps are:
1. sync local cleanup and branch cleanup after merge
2. capture final demo artifacts for both desktop and mobile
3. return to focused `epubjs` integration debt only if logs or edge cases block release confidence
