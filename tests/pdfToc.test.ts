import { describe, expect, it, vi } from "vitest";
import { extractPdfToc } from "../src/lib/pdfToc";

describe("extractPdfToc", () => {
  it("returns empty array when outline is missing", async () => {
    const doc = {
      getOutline: vi.fn().mockResolvedValue(null),
      getDestination: vi.fn(),
      getPageIndex: vi.fn()
    };

    await expect(extractPdfToc(doc as any)).resolves.toEqual([]);
  });

  it("maps outline nodes to toc with page locators", async () => {
    const doc = {
      getOutline: vi.fn().mockResolvedValue([
        {
          title: "Chapter 1",
          dest: "dest-1",
          items: [
            {
              title: "",
              dest: [1]
            }
          ]
        },
        {
          title: "External",
          dest: null
        }
      ]),
      getDestination: vi.fn().mockImplementation(async (name: string) => {
        if (name === "dest-1") {
          return [{ num: 77, gen: 0 }, { name: "XYZ" }, 0, 0, 0];
        }
        return null;
      }),
      getPageIndex: vi.fn().mockImplementation(async (ref: any) => {
        if (ref?.num === 77) {
          return 4;
        }
        throw new Error("invalid_ref");
      })
    };

    const toc = await extractPdfToc(doc as any);

    expect(toc).toHaveLength(2);
    expect(toc[0]).toMatchObject({
      title: "Chapter 1",
      href: "pdf:page:5",
      level: 1
    });
    expect(toc[0].children?.[0]).toMatchObject({
      title: "未命名章节",
      href: "pdf:page:2",
      level: 2
    });
    expect(toc[1]).toMatchObject({
      title: "External",
      href: "",
      level: 1
    });
  });
});
