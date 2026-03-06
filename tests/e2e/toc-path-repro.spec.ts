import { expect, test } from "@playwright/test";
import JSZip from "jszip";

function xhtmlDocument(title: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>${title}</title></head>
  <body>
    ${body}
  </body>
</html>`;
}

async function createNestedNavEpub(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );
  zip.file(
    "OPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">id</dc:identifier>
    <dc:title>Nested Nav</dc:title>
  </metadata>
  <manifest>
    <item id="nav" href="text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`
  );
  zip.file(
    "OPS/text/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Navigation</title></head>
  <body>
    <nav epub:type="toc" id="toc"><ol>
      <li><a href="ch1.xhtml">Chapter A</a></li>
      <li><a href="ch2.xhtml">Chapter B</a></li>
    </ol></nav>
  </body>
</html>`
  );
  zip.file("OPS/text/ch1.xhtml", xhtmlDocument("Chapter A", "<h1>Chapter A</h1>"));
  zip.file("OPS/text/ch2.xhtml", xhtmlDocument("Chapter B", "<h1>Chapter B</h1>"));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function createSingleImageCoverEpub(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );
  zip.file(
    "OPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="id">id-cover</dc:identifier>
    <dc:title>Cover Ratio</dc:title>
  </metadata>
  <manifest>
    <item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="img" href="images/cover.svg" media-type="image/svg+xml"/>
  </manifest>
  <spine>
    <itemref idref="cover"/>
  </spine>
</package>`
  );
  zip.file(
    "OPS/text/cover.xhtml",
    xhtmlDocument("Cover Ratio", '<img src="../images/cover.svg" alt="cover" width="600" height="900"/>')
  );
  zip.file(
    "OPS/images/cover.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
      <rect width="600" height="900" fill="#e5e5e5"/>
      <rect x="60" y="120" width="480" height="120" fill="#1f2937"/>
      <text x="300" y="200" text-anchor="middle" font-size="52" fill="#f8fafc" font-family="Arial">COVER</text>
    </svg>`
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

test("toc jump works when nav href is relative to nav file", async ({ page }) => {
  await page.goto("/library");
  const epub = await createNestedNavEpub();

  await page.locator('input[type="file"]').setInputFiles({
    name: "nested-nav.epub",
    mimeType: "application/epub+zip",
    buffer: epub
  });

  await expect(page).toHaveURL(/\/reader\//);
  await page.getByRole("button", { name: "目录" }).click();
  await page.getByRole("button", { name: "Chapter B" }).click();
  await expect(page.getByText("无法跳转到该章节")).toHaveCount(0);
  await expect
    .poll(async () => {
      const frameHandle = await page.locator(".epub-container iframe").first().elementHandle();
      const frame = await frameHandle?.contentFrame();
      if (!frame) {
        return "";
      }
      return (await frame.locator("h1").first().textContent().catch(() => ""))?.trim() ?? "";
    })
    .toBe("Chapter B");
});

test("epub supports page turning by wheel and arrow keys inside iframe", async ({ page }) => {
  await page.goto("/library");
  const epub = await createNestedNavEpub();

  await page.locator('input[type="file"]').setInputFiles({
    name: "nested-nav-page-turn.epub",
    mimeType: "application/epub+zip",
    buffer: epub
  });

  await expect(page).toHaveURL(/\/reader\//);
  const frame = page.frameLocator("iframe");

  await expect(frame.getByRole("heading", { name: "Chapter A" })).toBeVisible();

  const iframeElement = page.locator(".epub-container iframe").first();
  await iframeElement.hover();
  await page.mouse.wheel(0, 1200);
  await expect(frame.getByRole("heading", { name: "Chapter B" })).toBeVisible();

  await page.waitForTimeout(260);
  await frame.locator("body").click();
  await page.keyboard.press("ArrowUp");
  await expect(frame.getByRole("heading", { name: "Chapter A" })).toBeVisible();

  await page.waitForTimeout(260);
  await frame.locator("body").click();
  await page.keyboard.press("ArrowDown");
  await expect(frame.getByRole("heading", { name: "Chapter B" })).toBeVisible();
});

test("single-image epub cover keeps original aspect ratio", async ({ page }) => {
  await page.goto("/library");
  const epub = await createSingleImageCoverEpub();

  await page.locator('input[type="file"]').setInputFiles({
    name: "cover-ratio.epub",
    mimeType: "application/epub+zip",
    buffer: epub
  });

  await expect(page).toHaveURL(/\/reader\//);

  const frameHandle = await page.locator(".epub-container iframe").first().elementHandle();
  expect(frameHandle).not.toBeNull();
  const frame = await frameHandle!.contentFrame();
  expect(frame).not.toBeNull();

  await frame!.waitForFunction(() => {
    const img = document.querySelector("img") as HTMLImageElement | null;
    return Boolean(img && img.complete && img.getBoundingClientRect().width > 0);
  });

  const metrics = await frame!.evaluate(() => {
    const img = document.querySelector("img") as HTMLImageElement | null;
    if (!img) {
      return null;
    }
    const rect = img.getBoundingClientRect();
    const displayedRatio = rect.width / Math.max(1, rect.height);
    const naturalRatio = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 600 / 900;
    return { displayedRatio, naturalRatio };
  });

  expect(metrics).not.toBeNull();
  const ratioDelta = Math.abs(metrics!.displayedRatio - metrics!.naturalRatio);
  expect(ratioDelta).toBeLessThan(0.06);
});
