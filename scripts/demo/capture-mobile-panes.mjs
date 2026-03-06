import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createEpubBuffer } from './epub-fixture.mjs';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:4178';
const outDir = process.env.OUT_DIR || '/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture';

async function closeLastCloseButton(page) {
  await page.getByRole('button', { name: '关闭' }).last().click();
}

async function waitForMobilePanel(page) {
  await page.locator('.reader-mobile-panel').waitFor({ timeout: 10000 });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  try {
    const epub = await createEpubBuffer({
      title: 'Mobile Pane Review',
      author: 'QA Bot',
      identifier: 'urn:uuid:mobile-pane-review',
      chapters: [
        { title: 'Chapter 1', paragraph: 'Visual review chapter one content.' },
        { title: 'Chapter 2', paragraph: 'Visual review chapter two content.' }
      ]
    });

    await page.goto(`${baseUrl}/library`);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'mobile-pane-review.epub',
      mimeType: 'application/epub+zip',
      buffer: epub
    });
    await page.waitForURL(/\/reader\//, { timeout: 30000 });
    await page.getByTestId('reader-toolbar').waitFor({ timeout: 15000 });

    await page.getByTestId('reader-action-toc').click();
    await waitForMobilePanel(page);
    await page.screenshot({ path: path.join(outDir, 'mobile-reader-toc-final.png'), fullPage: true });
    await closeLastCloseButton(page);

    await page.getByTestId('reader-action-settings').click();
    await waitForMobilePanel(page);
    await page.screenshot({ path: path.join(outDir, 'mobile-reader-settings-final.png'), fullPage: true });
    await closeLastCloseButton(page);

    await page.getByTestId('reader-action-annotations').click();
    await waitForMobilePanel(page);
    await page.screenshot({ path: path.join(outDir, 'mobile-reader-annotations-final.png'), fullPage: true });

    const notesLink = page.getByRole('link', { name: /批注页/ }).first();
    if (await notesLink.isVisible().catch(() => false)) {
      await notesLink.click();
      await page.waitForURL(/\/notes\//, { timeout: 15000 });
      await page.getByTestId('notes-locator-rail').waitFor({ timeout: 10000 });
      await page.screenshot({ path: path.join(outDir, 'mobile-notes-final.png'), fullPage: true });
    }

    console.log(JSON.stringify({ ok: true, outDir }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
