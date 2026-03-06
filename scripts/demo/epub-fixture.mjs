import JSZip from 'jszip';

export function xhtmlDocument(title, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml">\n  <head><title>${title}</title></head>\n  <body>${body}</body>\n</html>`;
}

export async function createEpubBuffer({ title, author, identifier, chapters }) {
  const chapterEntries = chapters.length
    ? chapters
    : [{ title: 'Chapter 1', paragraph: 'Fallback chapter.' }];

  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n  </rootfiles>\n</container>`
  );

  const manifestItems = chapterEntries
    .map(
      (_, index) =>
        `    <item id="chapter${index + 1}" href="chapter${index + 1}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join('\n');
  const spineItems = chapterEntries
    .map((_, index) => `    <itemref idref="chapter${index + 1}"/>`)
    .join('\n');
  const navItems = chapterEntries
    .map(
      (chapter, index) => `        <li><a href="chapter${index + 1}.xhtml">${chapter.title}</a></li>`
    )
    .join('\n');

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">\n  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <dc:identifier id="bookid">${identifier}</dc:identifier>\n    <dc:title>${title}</dc:title>\n    <dc:creator>${author}</dc:creator>\n    <meta property="dcterms:modified">2026-03-06T00:00:00Z</meta>\n  </metadata>\n  <manifest>\n    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n${manifestItems}\n  </manifest>\n  <spine>\n${spineItems}\n  </spine>\n</package>`
  );

  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n  <head><title>Navigation</title></head>\n  <body>\n    <nav epub:type="toc" id="toc">\n      <ol>\n${navItems}\n      </ol>\n    </nav>\n  </body>\n</html>`
  );

  chapterEntries.forEach((chapter, index) => {
    zip.file(
      `OEBPS/chapter${index + 1}.xhtml`,
      xhtmlDocument(
        chapter.title,
        `<h1>${chapter.title}</h1><p>${chapter.paragraph}</p>`
      )
    );
  });

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export function reviewBooks() {
  return [
    {
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      chapters: [{ title: 'Chapter 1', paragraph: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.' }]
    },
    {
      title: 'The Time Machine',
      author: 'H.G. Wells',
      chapters: [{ title: 'The Time Traveller', paragraph: 'The Time Traveller was expounding a recondite matter to us.' }]
    },
    {
      title: 'Dracula',
      author: 'Bram Stoker',
      chapters: [{ title: 'Jonathan Harker Journal', paragraph: 'Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning.' }]
    },
    {
      title: 'Jane Eyre',
      author: 'Charlotte Bronte',
      chapters: [{ title: 'There was no possibility of taking a walk', paragraph: 'There was no possibility of taking a walk that day.' }]
    },
    {
      title: 'Frankenstein',
      author: 'Mary Shelley',
      chapters: [{ title: 'Letter 1', paragraph: 'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise.' }]
    },
    {
      title: 'Moby-Dick',
      author: 'Herman Melville',
      chapters: [
        { title: 'Chapter 1 - Loomings', paragraph: 'Call me Ishmael. Some years ago, having little or no money in my purse, I thought I would sail about a little and see the watery part of the world.' },
        { title: 'Chapter 2 - The Carpet-Bag', paragraph: 'I stuffed a shirt or two into my old carpet-bag, tucked it under my arm, and started for Cape Horn and the Pacific.' },
        { title: 'Chapter 3 - The Spouter-Inn', paragraph: 'Entering that gable-ended Spouter-Inn, you found yourself in a wide, low, straggling entry with old-fashioned wainscots.' }
      ]
    }
  ];
}
