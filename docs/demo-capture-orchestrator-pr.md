# Demo Capture Orchestrator PR Notes

## Suggested PR title

`feat(demo): add all-in-one capture runner`

## Summary

This branch adds a single orchestrated demo-capture entry point for the repo-level capture workflow.

Relative to `main`, it does not introduce new product behavior. It builds on the already merged demo capture scripts and adds one command that:
- verifies the app preview is reachable
- reuses or starts the frozen design server
- runs the mobile shell capture
- runs the mobile pane capture
- runs the desktop visual capture

## What changed

### New runner
- added `/Users/quentin/workspace/ebook-reader/scripts/demo/capture-all.mjs`
- added `npm run demo:capture:all`

### Supporting docs
- updated `/Users/quentin/workspace/ebook-reader/docs/demo-capture-plan.md`
- added `/Users/quentin/workspace/ebook-reader/docs/demo-capture-run.md`

## Validation

Validated locally with:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:capture:all
```

Observed result:
- the command completed successfully
- mobile and desktop final artifacts were written under `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture`
- the runner correctly reused the already running design server (`startedDesignServer: false`)

## Scope guardrails

This PR does not:
- change product UI
- change storage or data contracts
- change reader behavior
- add new committed artifacts under `output/`

## Merge notes

Do not add these local-only directories to the PR:
- `/Users/quentin/workspace/ebook-reader/.codex/`
- `/Users/quentin/workspace/ebook-reader/.playwright-cli/`
- `/Users/quentin/workspace/ebook-reader/openspec/`
- `/Users/quentin/workspace/ebook-reader/output/`

This PR is safe to merge once CI is green because it only improves capture workflow ergonomics and repeatability.
