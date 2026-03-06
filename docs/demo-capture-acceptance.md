# Demo Capture Acceptance Record

## Scope

This document records one completed demo-capture run using the tracked capture workflow added in the demo preparation phase.

Reference branch for the capture tooling:
- `main`

Reference commit used for this acceptance run:
- `a70c088` `Merge pull request #3 from Quentinbest/codex/demo-capture-prep`

## Acceptance run

Acceptance timestamp:
- `2026-03-06 23:11:57 CST`

Local preview baseline:
- `http://127.0.0.1:4178`

Frozen design baseline:
- `http://127.0.0.1:4174/03-final-screens.html`

## Commands executed

The following commands were executed successfully against the current `main` baseline:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:capture:mobile-shell
npm run demo:capture:mobile-panes
npm run demo:capture:desktop-visual
```

The capture run used the tracked scripts and default output target under `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture`.

## Generated artifacts

### Desktop
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-library-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-reader-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-reader-toc-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-library-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-reader-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/design-toc-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/desktop-capture-report.md`

### Mobile
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-library-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-toc-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-settings-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-reader-annotations-final.png`
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/mobile-notes-final.png`

## Acceptance checklist

### Desktop
- [x] Library final capture shows a real imported shelf state
- [x] Reader final capture shows loaded content and toolbar
- [x] TOC final capture shows the settled pane state
- [x] Frozen design references were captured alongside app output

### Mobile
- [x] Library final capture uses the mobile shell baseline
- [x] Reader final capture uses the mobile reader shell baseline
- [x] TOC / Settings / Annotations captures show the intended bottom-sheet states
- [x] Notes final capture shows locator rail and editable note content

### Workflow integrity
- [x] Capture scripts were invoked through tracked npm commands
- [x] Output remained under `/Users/quentin/workspace/ebook-reader/output/`
- [x] No capture artifacts were added to Git
- [x] The run did not require ad hoc local script edits

## Result

Result:
- Accepted

Notes:
- This acceptance covers artifact generation and repeatability of the repo-level capture workflow.
- It does not replace product feature acceptance for desktop phase 1 or mobile phase 1; those remain documented in their respective acceptance files.

## Follow-up

If a future release needs refreshed evidence, the expected flow is:
1. start the local preview at `http://127.0.0.1:4178`
2. start the frozen design server at `http://127.0.0.1:4174`
3. rerun the three tracked capture commands
4. review the output folder without committing artifacts
