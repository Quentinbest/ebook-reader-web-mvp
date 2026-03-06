# Demo Capture Acceptance Template

## Scope

Use this template to record a single accepted demo-capture run for desktop and mobile evidence.

Reference branch:
- `codex/demo-capture-prep`

Reference PR:
- `#3`

## Required automated checks

Require green status for:

```bash
cd /Users/quentin/workspace/ebook-reader
npm test
npm run test:e2e:smoke
npm run demo:capture:mobile-shell
npm run demo:capture:mobile-panes
```

For desktop visual comparison, also require:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:serve:design
npm run demo:capture:desktop-visual
```

## Acceptance record

Acceptance date:
- `YYYY-MM-DD HH:MM TZ`

Validated branch / commit:
- branch: `...`
- head: `...`

Local preview baseline:
- `http://127.0.0.1:4178`

Frozen design baseline:
- `http://127.0.0.1:4174/03-final-screens.html`

## Evidence

### Commands executed
- [ ] `npm test`
- [ ] `npm run test:e2e:smoke`
- [ ] `npm run demo:capture:mobile-shell`
- [ ] `npm run demo:capture:mobile-panes`
- [ ] `npm run demo:serve:design`
- [ ] `npm run demo:capture:desktop-visual`

### Expected local artifacts
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-library-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-toc-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-settings-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-annotations-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-notes-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-library-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-reader-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-reader-toc-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-library-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-reader-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-toc-final.png`
- [ ] `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-capture-report.md`

## Manual review checklist

### Desktop
- [ ] Library screenshot shows a real imported shelf, not empty state
- [ ] Reader screenshot shows loaded reading content and toolbar
- [ ] TOC screenshot shows the pane in its settled state
- [ ] Design reference screenshots match the intended frozen design frames

### Mobile
- [ ] Library screenshot shows the mobile shell, not a squeezed desktop state
- [ ] Reader screenshot shows the mobile reader shell in a settled state
- [ ] TOC / Settings / Annotations captures all show the correct bottom sheet state
- [ ] Notes screenshot shows locator rail plus editable note content

### Sanity
- [ ] No screenshot was taken during a loading or transition state
- [ ] Output stayed inside `/Users/quentin/workspace/ebook-reader/output/`
- [ ] No capture artifacts were added to Git

## Result

Result:
- [ ] Accepted
- [ ] Rejected

Notes:
- ...

## Merge checklist

- [ ] PR summary copied from `/Users/quentin/workspace/ebook-reader/docs/demo-capture-pr.md`
- [ ] CI is green for the PR head
- [ ] Acceptance evidence was regenerated on the current branch head
- [ ] Helper directories remain excluded from Git
- [ ] PR is ready to merge
