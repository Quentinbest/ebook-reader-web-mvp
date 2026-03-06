# Demo Capture Run Guide

## Goal

Run the full demo capture flow with one command and produce the expected desktop and mobile artifacts under the local output directory.

## Preconditions

1. Start the local app preview:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run build
npm run preview -- --host 127.0.0.1 --port 4178
```

2. Keep `output/` untracked. Do not commit generated artifacts.

## One-command run

```bash
cd /Users/quentin/workspace/ebook-reader
npm run demo:capture:all
```

Behavior:
- checks that the app preview is reachable at `APP_URL` or `http://127.0.0.1:4178`
- reuses an existing frozen design server if one is already running
- otherwise starts the frozen design server automatically
- runs mobile shell capture
- runs mobile pane capture
- runs desktop visual capture
- writes all final artifacts under `OUT_DIR` or `/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture`

## Environment overrides

```bash
APP_URL=http://127.0.0.1:4178 \
DESIGN_URL=http://127.0.0.1:4174/03-final-screens.html \
OUT_DIR=/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture \
npm run demo:capture:all
```

## Expected outputs

- `desktop-library-final.png`
- `desktop-reader-final.png`
- `desktop-reader-toc-final.png`
- `design-library-final.png`
- `design-reader-final.png`
- `design-toc-final.png`
- `desktop-capture-report.md`
- `mobile-library-final.png`
- `mobile-reader-final.png`
- `mobile-reader-toc-final.png`
- `mobile-reader-settings-final.png`
- `mobile-reader-annotations-final.png`
- `mobile-notes-final.png`

## Failure handling

### App preview is not reachable
Start the preview first:

```bash
cd /Users/quentin/workspace/ebook-reader
npm run preview -- --host 127.0.0.1 --port 4178
```

### Design server is not reachable
No action is required if the frozen design files still exist at `/Users/quentin/workspace/design-reader-figma/desktop-site`; the all-in-one runner will start the design server automatically.

### Capture artifacts look stale
Rerun the command. The scripts overwrite the same final filenames.
