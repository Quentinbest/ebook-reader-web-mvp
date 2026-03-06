# Demo Capture Checklist

## Before starting
- [ ] Worktree is on the intended review branch or `main`
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run test:e2e:smoke` passes
- [ ] Local preview is running at `http://127.0.0.1:4178`
- [ ] Output directory exists under `/Users/quentin/workspace/ebook-reader/output/playwright/`
- [ ] You are not planning to commit any files inside `/Users/quentin/workspace/ebook-reader/output/`

## Desktop captures
- [ ] Capture `desktop-library-final.png`
  - route: `/library`
  - verify at least one `book-card` is visible
- [ ] Capture `desktop-reader-final.png`
  - open an EPUB from the shelf
  - verify reader content and toolbar are visible
- [ ] Capture `desktop-reader-toc-final.png`
  - open TOC via `reader-action-toc`
  - verify pane content is visible before capture

## Mobile captures
- [ ] Capture `mobile-library-final.png`
  - mobile viewport active
  - route: `/library`
- [ ] Capture `mobile-reader-final.png`
  - open an EPUB from the mobile shelf
- [ ] Capture `mobile-reader-toc-final.png`
  - open TOC bottom sheet
- [ ] Capture `mobile-reader-settings-final.png`
  - open settings bottom sheet
- [ ] Capture `mobile-reader-annotations-final.png`
  - open annotations bottom sheet
- [ ] Capture `mobile-notes-final.png`
  - navigate to `/notes/:bookId`
  - confirm locator rail and editable notes are visible

## Sanity checks
- [ ] No screenshot shows empty state by accident unless the empty state is the explicit subject
- [ ] No screenshot is taken during a loading transition
- [ ] Toolbar and pane captures are in the final settled state
- [ ] Mobile captures use the mobile viewport baseline consistently
- [ ] Desktop captures use the desktop viewport baseline consistently

## After capture
- [ ] Update local review notes if filenames changed
- [ ] Keep artifacts in `/Users/quentin/workspace/ebook-reader/output/`
- [ ] Do not add `output/` to Git
