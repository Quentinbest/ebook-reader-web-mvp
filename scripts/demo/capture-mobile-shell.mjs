import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createEpubBuffer } from './epub-fixture.mjs';

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:4178';
const outDir = process.env.OUT_DIR || '/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture';

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();

  try {
    const epub = await createEpubBuffer({
      title: 'Mobile Demo Book',
      author: 'QA Bot',
      identifier: 'urn:uuid:mobile-demo-book',
      chapters: [
        { title: 'Chapter 1', paragraph: 'Mobile shell verification.' },
        { title: 'Chapter 2', paragraph: 'Second chapter for mobile notes and TOC review.' }
      ]
    });

    await page.goto(`${baseUrl}/library`);
    await page.getByTestId('library-book-grid').waitFor().catch(() => {});
    await page.screenshot({ path: path.join(outDir, 'mobile-library-final.png'), fullPage: true });

    await page.locator('input[type="file"]').setInputFiles({
      name: 'mobile-demo.epub',
      mimeType: 'application/epub+zip',
      buffer: epub
    });
    await page.waitForURL(/\/reader\//, { timeout: 30000 });
    await page.getByTestId('reader-toolbar').waitFor({ timeout: 15000 });
    await page.screenshot({ path: path.join(outDir, 'mobile-reader-final.png'), fullPage: true });

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
