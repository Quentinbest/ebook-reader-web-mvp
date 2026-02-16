import { expect, test } from "@playwright/test";
import JSZip from "jszip";

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
  <body>
    <nav epub:type="toc" id="toc"><ol>
      <li><a href="ch1.xhtml">Chapter A</a></li>
      <li><a href="ch2.xhtml">Chapter B</a></li>
    </ol></nav>
  </body>
</html>`
  );
  zip.file("OPS/text/ch1.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter A</h1></body></html>`);
  zip.file("OPS/text/ch2.xhtml", `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter B</h1></body></html>`);
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
  await expect(page.frameLocator("iframe").getByRole("heading", { name: "Chapter B" })).toBeVisible();
});
