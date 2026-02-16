import { expect, test } from "@playwright/test";

function createPdfBuffer(pageCount = 3): Buffer {
  const lines: string[] = [];
  const offsets: number[] = [];

  const header = "%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n";
  lines.push(header);

  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  for (let i = 0; i < pageCount; i += 1) {
    pageObjectIds.push(3 + i * 2);
    contentObjectIds.push(4 + i * 2);
  }

  const fontObjectId = 3 + pageCount * 2;
  const objectCount = fontObjectId;

  const objects: Array<{ id: number; body: string }> = [];
  objects.push({ id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" });
  objects.push({
    id: 2,
    body: `<< /Type /Pages /Count ${pageCount} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`
  });

  for (let i = 0; i < pageCount; i += 1) {
    const pageId = pageObjectIds[i];
    const contentId = contentObjectIds[i];
    const contentStream = `BT /F1 24 Tf 72 720 Td (Page ${i + 1}) Tj ET`;

    objects.push({
      id: pageId,
      body:
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> >>`
    });
    objects.push({
      id: contentId,
      body: `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`
    });
  }

  objects.push({
    id: fontObjectId,
    body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  });

  for (const object of objects) {
    const current = lines.join("");
    offsets[object.id] = Buffer.byteLength(current, "utf8");
    lines.push(`${object.id} 0 obj\n${object.body}\nendobj\n`);
  }

  const body = lines.join("");
  const xrefOffset = Buffer.byteLength(body, "utf8");

  const xrefLines: string[] = [];
  xrefLines.push(`xref\n0 ${objectCount + 1}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let id = 1; id <= objectCount; id += 1) {
    const offset = String(offsets[id] ?? 0).padStart(10, "0");
    xrefLines.push(`${offset} 00000 n \n`);
  }

  const trailer =
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n` + `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body + xrefLines.join("") + trailer, "utf8");
}

test("pdf supports page turning by wheel and arrow keys", async ({ page }) => {
  await page.goto("/library");
  const pdfBuffer = createPdfBuffer(3);

  await page.locator('input[type="file"]').setInputFiles({
    name: "page-turn.pdf",
    mimeType: "application/pdf",
    buffer: pdfBuffer
  });

  await expect(page).toHaveURL(/\/reader\//);
  await expect(page.getByRole("heading", { name: "阅读器" })).toBeVisible();
  await expect(page.getByText("正在渲染 PDF...")).toHaveCount(0);

  const pageInput = page.getByLabel("页码");
  await expect(pageInput).toHaveValue("1");

  await page.locator(".pdf-frame").hover();
  await page.mouse.wheel(0, 1200);
  await expect
    .poll(async () => Number(await pageInput.inputValue()), {
      timeout: 8_000
    })
    .toBeGreaterThan(1);

  await pageInput.fill("2");
  await expect(page.getByText("正在渲染 PDF...")).toHaveCount(0);
  await page.locator(".pdf-frame").click({ position: { x: 40, y: 40 } });
  await page.waitForTimeout(260);
  await page.keyboard.press("ArrowDown");
  await expect(pageInput).toHaveValue("3");

  await page.waitForTimeout(260);
  await page.keyboard.press("ArrowUp");
  await expect(pageInput).toHaveValue("2");
});
