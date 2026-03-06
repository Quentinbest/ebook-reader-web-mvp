# Desktop Phase 1 PR Draft

## Suggested PR title

`feat(desktop): ship desktop-first reader workspace and library redesign`

## Summary

This branch turns the web MVP into a desktop-first reading application aligned with the frozen desktop Figma direction.

The work is not limited to visual polish. Relative to `main`, this branch also includes reader infrastructure, TOC/navigation fixes, page-turn interaction work, EPUB/PDF regression coverage, and CI/Pages workflow updates.

## What changed

### Desktop shell and visual system
- Rebuilt the app shell into a desktop-first layout with persistent left sidebar and top toolbar.
- Added dedicated shell styles and desktop token layering.
- Reduced desktop chrome across Library, Reader, TOC, and Notes through multiple polish passes.

### Library
- Reworked `/library` into a cover-first desktop bookshelf.
- Added local library search on the same route.
- Rebuilt book tiles around cover hierarchy instead of list-style metadata.
- Demoted management UI and support chrome so the shelf remains the primary focus.

### Reader
- Reworked `/reader/:bookId` into a desktop reading workspace with:
  - persistent toolbar
  - centered reading surface
  - right-side utility pane host
  - side page-turn controls
- Unified TOC, Search, Settings, and Annotations into a single pane model.
- Tightened EPUB and PDF desktop reading flows.

### TOC, search, settings, annotations
- Rebuilt TOC presentation and active-state behavior.
- Improved chapter jump handling and relative-nav EPUB coverage.
- Refined search/settings/annotation panes to use one desktop interaction model.

### Notes
- Brought `/notes/:bookId` into the same desktop shell and visual language.
- Tightened locator rail and editing workspace proportions.

### Test and delivery infrastructure
- Added/updated:
  - GitHub Actions CI
  - GitHub Pages deploy workflow
  - PDF page-turn regression coverage
  - EPUB TOC jump regression coverage
  - single-image EPUB cover aspect-ratio regression coverage
- Fixed generated EPUB test fixtures to use valid XHTML, which removed a class of `epubjs` console noise caused by invalid fixture markup.

## Key files

### Shell and shared UI
- `/Users/quentin/workspace/ebook-reader/src/components/AppShell.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/UtilityPaneHost.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/icons/BooksIcons.tsx`
- `/Users/quentin/workspace/ebook-reader/src/styles/shell.css`
- `/Users/quentin/workspace/ebook-reader/src/styles/tokens.css`

### Library
- `/Users/quentin/workspace/ebook-reader/src/pages/LibraryPage.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/BookCard.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/FileDropZone.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/TelemetryNotice.tsx`
- `/Users/quentin/workspace/ebook-reader/src/styles/library.css`

### Reader
- `/Users/quentin/workspace/ebook-reader/src/pages/ReaderPage.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/EpubViewport.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/PdfViewport.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/TocPanel.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/SearchPanel.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/ReaderSettingsPanel.tsx`
- `/Users/quentin/workspace/ebook-reader/src/components/AnnotationPanel.tsx`
- `/Users/quentin/workspace/ebook-reader/src/styles/reader.css`

### Notes
- `/Users/quentin/workspace/ebook-reader/src/pages/NotesPage.tsx`
- `/Users/quentin/workspace/ebook-reader/src/styles/notes.css`

### Infra and tests
- `/Users/quentin/workspace/ebook-reader/.github/workflows/ci.yml`
- `/Users/quentin/workspace/ebook-reader/.github/workflows/deploy-pages.yml`
- `/Users/quentin/workspace/ebook-reader/tests/e2e/smoke.spec.ts`
- `/Users/quentin/workspace/ebook-reader/tests/e2e/pdf-page-turn.spec.ts`
- `/Users/quentin/workspace/ebook-reader/tests/e2e/toc-path-repro.spec.ts`
- `/Users/quentin/workspace/ebook-reader/tests/pdfToc.test.ts`

## Validation

The branch was validated repeatedly during implementation with:

```bash
npm run build
npm test
npm run test:e2e:smoke
```

Latest visual comparison artifacts are kept outside Git in:

- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/report.md`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-library.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/desktop-visual/app-reader-toc.png`

## Risk notes

- This is a broad branch, not a narrow polish-only PR.
- The diff against `main` includes desktop rollout plus reader navigation, test, and CI work.
- IndexedDB schema intent remains stable:
  - no new object stores
  - no renamed stores
  - no version bump introduced as part of this stage
- Core EPUB/PDF engines were not rewritten, but the surrounding orchestration and UI shell changed materially.

## Non-goals

- No mobile redesign in this phase.
- No account/sync/cloud features.
- No new domain model for collections/tags.
- No backend changes.

## Merge notes

- Do not add these untracked local helper directories to the PR:
  - `/Users/quentin/workspace/ebook-reader/.codex/`
  - `/Users/quentin/workspace/ebook-reader/.playwright-cli/`
  - `/Users/quentin/workspace/ebook-reader/openspec/`
  - `/Users/quentin/workspace/ebook-reader/output/`

- If reviewers want a smaller review surface, the correct next step is branch splitting. This branch itself is already prepared as a full feature-line merge candidate.
