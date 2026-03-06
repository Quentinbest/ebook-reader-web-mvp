import { expect, test } from "@playwright/test";
import JSZip from "jszip";

async function createEpubBuffer({
  title = "Smoke Book",
  identifier = "urn:uuid:smoke-book",
  chapterTitle = "冒烟章节",
  paragraph = "这是用于端到端测试的 EPUB 内容。"
}: {
  title?: string;
  identifier?: string;
  chapterTitle?: string;
  paragraph?: string;
} = {}): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${identifier}</dc:identifier>
    <dc:title>${title}</dc:title>
    <dc:creator>QA Bot</dc:creator>
    <meta property="dcterms:modified">2026-02-16T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`
  );

  zip.file(
    "OEBPS/nav.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head><title>Navigation</title></head>
  <body>
    <nav epub:type="toc" id="toc">
      <ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol>
    </nav>
  </body>
</html>`
  );

  zip.file(
    "OEBPS/chapter1.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>${chapterTitle}</title></head>
  <body>
    <h1>${chapterTitle}</h1>
    <p>${paragraph}</p>
  </body>
</html>`
  );

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

test.describe("E2E smoke", () => {
  test("can import epub, read, annotate, and review notes", async ({ page }) => {
    const epubBuffer = await createEpubBuffer();

    await page.goto("/library");
    await expect(page.getByRole("heading", { name: "书架" })).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "smoke.epub",
      mimeType: "application/epub+zip",
      buffer: epubBuffer
    });

    await expect(page).toHaveURL(/\/reader\//);
    await expect(page.getByTestId("reader-toolbar")).toBeVisible();

    await page.getByTestId("reader-action-toc").click();
    await expect(page.getByRole("heading", { name: "目录" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chapter 1" })).toBeVisible();
    await page.getByRole("button", { name: "Chapter 1" }).click();

    await page.getByTestId("reader-action-annotations").click();
    await page.getByLabel("引文").fill("冒烟批注引文");
    await page.getByLabel("备注").first().fill("冒烟备注");
    await page.getByRole("button", { name: "新增批注" }).click();
    await expect(page.locator(".annotation-list li")).toHaveCount(1);
    await expect(page.locator(".annotation-list li p")).toHaveText("冒烟批注引文");

    await page.reload();
    await page.getByTestId("reader-action-annotations").click();
    await expect(page.locator(".annotation-list li")).toHaveCount(1);
    await expect(page.locator(".annotation-list li p")).toHaveText("冒烟批注引文");
    await page.getByRole("link", { name: "打开批注页" }).click();

    await expect(page).toHaveURL(/\/notes\//);
    await expect(page.getByText("冒烟批注引文")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "备注" }).first()).toHaveValue("冒烟备注");
  });

  test("desktop library search filters imported books", async ({ page }) => {
    const whaleBook = await createEpubBuffer({
      title: "Whale Atlas",
      identifier: "urn:uuid:whale-atlas",
      chapterTitle: "Whale Chapter",
      paragraph: "A reading sample about a whale."
    });
    const mountainBook = await createEpubBuffer({
      title: "Mountain Atlas",
      identifier: "urn:uuid:mountain-atlas",
      chapterTitle: "Mountain Chapter",
      paragraph: "A reading sample about a mountain."
    });

    await page.goto("/library");
    await page.locator('input[type="file"]').setInputFiles([
      {
        name: "whale.epub",
        mimeType: "application/epub+zip",
        buffer: whaleBook
      },
      {
        name: "mountain.epub",
        mimeType: "application/epub+zip",
        buffer: mountainBook
      }
    ]);

    await expect(page).toHaveURL(/\/reader\//);
    await page.getByTestId("reader-action-back").click();
    await expect(page).toHaveURL(/\/library/);

    const searchInput = page.getByTestId("library-search-input");
    await searchInput.fill("whale");

    await expect(page.getByText("Whale Atlas")).toBeVisible();
    await expect(page.getByText("Mountain Atlas")).toHaveCount(0);
    await expect(page.getByTestId("library-book-grid").locator("[data-testid='book-card']")).toHaveCount(1);
  });

  test("shows error for unsupported file format", async ({ page }) => {
    await page.goto("/library");

    await page.locator('input[type="file"]').setInputFiles({
      name: "bad.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an ebook", "utf8")
    });

    await expect(page.getByText("仅支持 EPUB 或 PDF 文件。")).toBeVisible();
  });
});
