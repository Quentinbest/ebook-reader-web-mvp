# Mobile Phase 1 PR Draft

## Suggested PR title

`feat(mobile): ship mobile-first shell and reading workspace refinement`

## Summary

This branch completes the first mobile-focused pass after the desktop rollout.

Relative to `main`, the work adapts the existing design system and reader flows for small screens instead of introducing a separate mobile product. The scope covers shell behavior, mobile Library, mobile Reader, mobile Notes, and the density/presentation of reader utility panes.

## What changed

### Mobile shell
- Reworked the shared app shell so small screens no longer inherit desktop layout behavior directly.
- Added a cleaner mobile top structure for Library.
- Removed redundant sidebar chrome from mobile Reader and Notes.

### Library
- Rebuilt mobile `/library` into a compact top section plus 2-column shelf.
- Kept import and search behavior intact while reducing desktop-only support chrome.
- Preserved same-route filtering instead of introducing new mobile routes.

### Reader
- Tightened mobile reader toolbar density.
- Reworked mobile pane presentation into a more consistent bottom-sheet model.
- Reduced spacing and control weight across TOC, Search, Settings, and Annotations on small screens.
- Kept EPUB/PDF reading behavior unchanged.

### Notes
- Reworked mobile `/notes/:bookId` so it reads as a compact workspace rather than a squeezed desktop page.
- Added a mobile summary block when sidebar content is hidden.
- Converted locator navigation into a horizontal strip for small screens.
- Tightened note card spacing and corrected the locator CTA copy to match actual click behavior.

### Visual validation support
- Added and refreshed local mobile verification artifacts and pane screenshots outside Git.
- Wrote a focused mobile visual review note to capture remaining gaps and confirm that further work is polish-only.

## Key files

### Shell and shared layout
- `/Users/quentin/workspace/ebook-reader/src/components/AppShell.tsx`
- `/Users/quentin/workspace/ebook-reader/src/styles/shell.css`

### Library
- `/Users/quentin/workspace/ebook-reader/src/styles/library.css`

### Reader
- `/Users/quentin/workspace/ebook-reader/src/styles/reader.css`

### Notes
- `/Users/quentin/workspace/ebook-reader/src/pages/NotesPage.tsx`
- `/Users/quentin/workspace/ebook-reader/src/styles/notes.css`

## Branch commits in this phase
- `944232e` `refactor(mobile): adapt shell and library for small screens`
- `56add6c` `refactor(mobile): tighten reader mobile layout`
- `9abe6fe` `refactor(mobile): adapt notes workspace for small screens`
- `2477876` `refactor(mobile): tighten reader pane density`
- `c39ba1b` `refactor(mobile): polish shell and toolbar tone`

## Validation

The branch was validated with:

```bash
npm run build
npm test
npm run test:e2e:smoke
node /Users/quentin/workspace/ebook-reader/output/playwright/mobile_shell_smoke.mjs
```

Local mobile visual evidence was also refreshed outside Git:

- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-library.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-reader.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-notes.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/report.md`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-toc.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-settings.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/mobile-visual/reader-annotations.png`

## Risk notes

- This is a UI-orchestration and presentation branch, not a storage/model branch.
- No DB schema changes are introduced.
- No route additions are introduced.
- Core EPUB/PDF rendering logic remains intact; this phase changes shell/layout density around it.

## Non-goals

- No new mobile-only features.
- No backend or sync work.
- No schema or importer changes.
- No attempt to fully re-spec every viewport state against a separate mobile Figma file.

## Merge notes

- Do not add these untracked local helper directories to the PR:
  - `/Users/quentin/workspace/ebook-reader/.codex/`
  - `/Users/quentin/workspace/ebook-reader/.playwright-cli/`
  - `/Users/quentin/workspace/ebook-reader/openspec/`
  - `/Users/quentin/workspace/ebook-reader/output/`

- This phase should be reviewed as a mobile-first adaptation on top of the merged desktop foundation, not as an isolated redesign.
