# Demo Capture Orchestrator Acceptance

## Scope

This document records acceptance for the all-in-one capture runner added on top of the existing demo capture workflow.

Reference branch:
- `codex/demo-capture-orchestrator`

## Required checks

Run and require success for:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:capture:all
```

## Acceptance record

Acceptance timestamp:
- `2026-03-06 23:11:57 CST`

Validated branch / head:
- branch: `codex/demo-capture-orchestrator`
- head: `70f2af5`

Execution baseline:
- app preview: `http://127.0.0.1:4178`
- frozen design: `http://127.0.0.1:4174/03-final-screens.html`

Observed result:
- `demo:capture:all` completed successfully
- desktop and mobile artifacts were produced in `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture`
- the runner reused an already running design server during validation

## Acceptance checklist

- [x] One command executes the full desktop + mobile capture sequence
- [x] The runner validates app preview reachability before capture
- [x] The runner starts the frozen design server only when needed
- [x] The runner passes `APP_URL`, `DESIGN_URL`, and `OUT_DIR` through consistently
- [x] No capture artifacts were committed to Git

## Result

Result:
- Accepted

Notes:
- This acceptance covers orchestration only.
- It depends on the previously merged capture scripts and acceptance records already present on `main`.
