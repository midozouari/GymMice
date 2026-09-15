// Builds a labeled contact sheet (PNG) and a one-screenshot-per-page PDF
// from the PNGs captured by gymmice-screenshots.mjs. Read-only w.r.t. the app.
import sharp from 'sharp';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve('artifacts/screenshots');

async function main() {
  const manifest = JSON.parse(await fs.readFile(path.join(OUT_DIR, 'manifest.json'), 'utf8'));
  const items = manifest.captured;

  // --- Contact sheet ---
  const THUMB_W = 300;
  const LABEL_H = 46;
  const PAD = 16;
  const COLS = 6;
  const rowsCount = Math.ceil(items.length / COLS);

  const metas = [];
  for (const item of items) {
    const meta = await sharp(item.filePath).metadata();
    const scale = THUMB_W / meta.width;
    metas.push({ ...item, thumbH: Math.round(meta.height * scale) });
  }
  const maxThumbH = Math.max(...metas.map((m) => m.thumbH));
  const cellW = THUMB_W + PAD * 2;
  const cellH = maxThumbH + LABEL_H + PAD * 2;
  const sheetW = cellW * COLS;
  const sheetH = cellH * rowsCount;

  const svgLabels = [];
  const composites = [];
  for (let i = 0; i < metas.length; i++) {
    const m = metas[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * cellW + PAD;
    const y = row * cellH + PAD;
    const thumbBuf = await sharp(m.filePath).resize({ width: THUMB_W }).toBuffer();
    composites.push({ input: thumbBuf, left: x, top: y });
    const label = `${i + 1}. ${m.label}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    svgLabels.push(
      `<text x="${x + THUMB_W / 2}" y="${y + maxThumbH + 26}" font-family="Helvetica, Arial, sans-serif" font-size="15" font-weight="600" fill="#1a1a1a" text-anchor="middle">${label}</text>`
    );
  }

  const labelSvg = `<svg width="${sheetW}" height="${sheetH}" xmlns="http://www.w3.org/2000/svg">
    ${svgLabels.join('\n')}
  </svg>`;

  const contactSheetPath = path.join(OUT_DIR, 'contact-sheet.png');
  await sharp({
    create: { width: sheetW, height: sheetH, channels: 3, background: '#f4f4f6' },
  })
    .composite([...composites, { input: Buffer.from(labelSvg), top: 0, left: 0 }])
    .png()
    .toFile(contactSheetPath);
  console.log(`Contact sheet -> ${contactSheetPath} (${sheetW}x${sheetH})`);

  // --- PDF, one labeled screenshot per page ---
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageW = 595; // A4-ish width in points
  const margin = 36;
  const labelHeight = 40;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pngBytes = await fs.readFile(item.filePath);
    const png = await pdfDoc.embedPng(pngBytes);
    const availW = pageW - margin * 2;
    const scale = availW / png.width;
    const imgH = png.height * scale;
    const pageH = imgH + margin * 2 + labelHeight;

    const pdfPage = pdfDoc.addPage([pageW, pageH]);
    pdfPage.drawText(`${i + 1}. ${item.label}`, {
      x: margin,
      y: pageH - margin - 18,
      size: 16,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    pdfPage.drawImage(png, {
      x: margin,
      y: margin,
      width: availW,
      height: imgH,
    });
  }

  const pdfPath = path.join(OUT_DIR, 'gymmice-visual-documentation.pdf');
  await fs.writeFile(pdfPath, await pdfDoc.save());
  console.log(`PDF -> ${pdfPath} (${items.length} pages)`);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exitCode = 1;
});
