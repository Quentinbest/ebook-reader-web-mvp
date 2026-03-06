# Demo Capture PR Notes

## Suggested PR title

`docs(demo): add capture plan and reusable runbook`

## Summary

This branch turns the ad hoc local demo capture workflow into a tracked, repeatable repo-level runbook.

It does three things:
- records the capture plan and operating checklist in `docs/`
- promotes the reusable browser capture scripts into `scripts/demo/`
- adds explicit npm command entry points for repeatable desktop and mobile capture runs

## What changed

### Docs
- added `/Users/quentin/workspace/ebook-reader/docs/demo-capture-plan.md`
- upgraded `/Users/quentin/workspace/ebook-reader/docs/demo-capture-checklist.md` into a formal acceptance-oriented checklist template
- added `/Users/quentin/workspace/ebook-reader/docs/demo-capture-pr.md`

### Reusable demo scripts
- added `/Users/quentin/workspace/ebook-reader/scripts/demo/epub-fixture.mjs`
- added `/Users/quentin/workspace/ebook-reader/scripts/demo/capture-mobile-shell.mjs`
- added `/Users/quentin/workspace/ebook-reader/scripts/demo/capture-mobile-panes.mjs`
- added `/Users/quentin/workspace/ebook-reader/scripts/demo/capture-desktop-visual.mjs`
- added `/Users/quentin/workspace/ebook-reader/scripts/demo/serve-frozen-design.mjs`

### Package commands
- added `npm run demo:serve:design`
- added `npm run demo:capture:mobile-shell`
- added `npm run demo:capture:mobile-panes`
- added `npm run demo:capture:desktop-visual`

### Stability fixes included in this branch
- capture scripts now use fixed `lastModified` values so repeated imports resolve to stable book ids
- mobile library capture now records the post-import shelf state instead of the pre-import empty/default state
- desktop visual capture no longer relies on an undocumented local design server; the repo now provides `demo:serve:design`
- smoke coverage was tightened to wait on stable library selectors instead of the more fragile `书架` heading assertion

## Validation

Run and require green status for:

```bash
cd /Users/quentin/workspace/ebook-reader
npm test
npm run test:e2e:smoke
npm run demo:capture:mobile-shell
npm run demo:capture:mobile-panes
```

Desktop visual capture additionally requires the frozen design server:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:serve:design
npm run demo:capture:desktop-visual
```

## Artifacts

Artifacts remain intentionally local-only under:
- `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture/`

They are supporting evidence, not tracked release assets.

## Merge notes

Do not add these local-only directories to the PR:
- `/Users/quentin/workspace/ebook-reader/.codex/`
- `/Users/quentin/workspace/ebook-reader/.playwright-cli/`
- `/Users/quentin/workspace/ebook-reader/openspec/`
- `/Users/quentin/workspace/ebook-reader/output/`

This PR is safe to merge once CI is green because it does not alter product behavior or storage contracts. Its effect is operational: reproducible demo capture and review workflow.
