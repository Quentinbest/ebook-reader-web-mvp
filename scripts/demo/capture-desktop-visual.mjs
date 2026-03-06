import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createEpubBuffer, reviewBooks } from './epub-fixture.mjs';

const appUrl = process.env.APP_URL || 'http://127.0.0.1:4178';
const designUrl = process.env.DESIGN_URL || 'http://127.0.0.1:4174/03-final-screens.html';
const outDir = process.env.OUT_DIR || '/Users/quentin/workspace/ebook-reader/output/playwright/demo-capture';
const fixedLastModified = 1709702400000;

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function captureDesign(page, frameId, outName) {
  await page.goto(designUrl, { waitUntil: 'domcontentloaded' });
  const card = page.locator('.screen-card', { has: page.locator('.screen-name', { hasText: frameId }) }).first();
  await card.waitFor({ timeout: 15000 });
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: path.join(outDir, outName) });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  try {
    const files = await Promise.all(
      reviewBooks().map(async (book, index) => ({
        name: `${book.title}.epub`,
        mimeType: 'application/epub+zip',
        buffer: await createEpubBuffer({
          ...book,
          identifier: `urn:uuid:${index}-${slugify(book.title)}`
        }),
        lastModified: fixedLastModified
      }))
    );

    await page.goto(`${appUrl}/library`, { waitUntil: 'networkidle' });
    await page.locator('input[type="file"]').setInputFiles(files);
    await Promise.race([
      page.waitForURL(/\/reader\//, { timeout: 60000 }),
      page.getByTestId('reader-toolbar').waitFor({ timeout: 60000 })
    ]);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, 'desktop-reader-final.png'), fullPage: true });

    await page.getByTestId('reader-action-toc').click();
    await page.getByTestId('reader-utility-pane').waitFor({ timeout: 10000 });
    await page.screenshot({ path: path.join(outDir, 'desktop-reader-toc-final.png'), fullPage: true });

    await page.getByTestId('reader-action-back').click();
    await page.waitForURL(/\/library/, { timeout: 15000 });
    await page.getByTestId('book-card').first().waitFor({ timeout: 15000 });
    await page.screenshot({ path: path.join(outDir, 'desktop-library-final.png'), fullPage: true });

    const designPage = await context.newPage();
    await captureDesign(designPage, 'Desktop/LibraryDefault', 'design-library-final.png');
    await captureDesign(designPage, 'Desktop/ReaderPage1', 'design-reader-final.png');
    await captureDesign(designPage, 'DesktopPane/TOC', 'design-toc-final.png');

    const report = `# Demo capture output\n\nGenerated on ${new Date().toISOString()}\n\n## Desktop app\n- desktop-library-final.png\n- desktop-reader-final.png\n- desktop-reader-toc-final.png\n\n## Design references\n- design-library-final.png\n- design-reader-final.png\n- design-toc-final.png\n`;
    await fs.writeFile(path.join(outDir, 'desktop-capture-report.md'), report, 'utf8');

    console.log(JSON.stringify({ ok: true, outDir, designUrl }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
});
