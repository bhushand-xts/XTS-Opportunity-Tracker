// Excel (.xlsx) and PDF downloads for report grids, built in the browser with
// no extra libraries: the .xlsx is a real Office Open XML workbook in a
// stored (uncompressed) zip, and the PDF uses the built-in Helvetica fonts.

export type ExportCell = string | number | null;

export interface ExportColumn {
  header: string;
  align?: "left" | "right" | "center";
  /** Excel column width in characters. */
  excelWidth?: number;
  /** Share of the PDF table width (relative to the other columns). */
  pdfWeight?: number;
  /** Values are fractions (0.6 = 60%) shown as percentages. */
  percent?: boolean;
  /** Values are US dollar amounts, shown as $1,234. */
  currency?: boolean;
}

export interface ExportTable {
  title: string;
  /** Lines under the title, e.g. the period and owner filter. */
  subtitle: string[];
  columns: ExportColumn[];
  rows: ExportCell[][];
  totalRow?: ExportCell[];
  note?: string;
  fileName: string;
}

function triggerDownload(bytes: Uint8Array, mime: string, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const USD_FORMAT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatPercentCell(value: number) {
  return `${Number((value * 100).toFixed(1))}%`;
}

function cellText(value: ExportCell, column: ExportColumn) {
  if (value === null) return "—";
  if (typeof value === "number" && column.percent) return formatPercentCell(value);
  if (typeof value === "number" && column.currency) return USD_FORMAT.format(value);
  return String(value);
}

// ---------------------------------------------------------------- zip ----

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStored(files: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x21, true); // 1980-01-01
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    local.set(name, 30);

    const entry = new Uint8Array(46 + name.length);
    const cv = new DataView(entry.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    entry.set(name, 46);

    chunks.push(local, data);
    central.push(entry);
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((total, entry) => total + entry.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((total, part) => total + part.length, 0));
  let position = 0;
  for (const part of all) {
    out.set(part, position);
    position += part.length;
  }
  return out;
}

// --------------------------------------------------------------- xlsx ----

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function columnLetter(index: number) {
  let letter = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

// Style ids (cellXfs order in STYLES_XML).
const XF = { title: 1, subtitle: 2, header: 3, text: 4, number: 5, percent: 6, totalText: 7, totalNumber: 8, totalPercent: 9, note: 10, center: 11, currency: 12, totalCurrency: 13 };

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="0.0%"/><numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><sz val="15"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="164" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
<xf numFmtId="165" fontId="1" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function downloadExcel(table: ExportTable) {
  const sheetRows: string[] = [];
  let rowNumber = 0;
  const lastColumn = columnLetter(table.columns.length - 1);
  const merges: string[] = [];

  const textCell = (ref: string, value: string, style: number) =>
    `<c r="${ref}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
  const numberCell = (ref: string, value: number, style: number) => `<c r="${ref}" s="${style}"><v>${value}</v></c>`;

  const addRow = (cells: string, height?: number) => {
    rowNumber += 1;
    sheetRows.push(`<row r="${rowNumber}"${height ? ` ht="${height}" customHeight="1"` : ""}>${cells}</row>`);
  };
  const addMergedLine = (value: string, style: number, height?: number) => {
    addRow(textCell(`A${rowNumber + 1}`, value, style), height);
    merges.push(`A${rowNumber}:${lastColumn}${rowNumber}`);
  };

  addMergedLine(table.title, XF.title, 24);
  for (const line of table.subtitle) addMergedLine(line, XF.subtitle);
  addRow("");

  addRow(
    table.columns.map((column, index) => textCell(`${columnLetter(index)}${rowNumber + 1}`, column.header, XF.header)).join(""),
    22
  );

  const dataRow = (values: ExportCell[], total: boolean) =>
    values
      .map((value, index) => {
        const column = table.columns[index];
        const ref = `${columnLetter(index)}${rowNumber + 1}`;
        if (typeof value === "number") {
          const plain = column.align === "center" ? XF.center : XF.number;
          const style = column.percent
            ? total ? XF.totalPercent : XF.percent
            : column.currency
              ? total ? XF.totalCurrency : XF.currency
              : total ? XF.totalNumber : plain;
          return numberCell(ref, value, style);
        }
        const style = total ? (column.align === "right" ? XF.totalNumber : XF.totalText) : column.align === "right" ? XF.number : column.align === "center" ? XF.center : XF.text;
        return textCell(ref, value === null ? "—" : value, style);
      })
      .join("");

  for (const row of table.rows) addRow(dataRow(row, false));
  if (table.totalRow) addRow(dataRow(table.totalRow, true));
  if (table.note) {
    addRow("");
    addMergedLine(table.note, XF.note);
  }

  const cols = table.columns
    .map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.excelWidth ?? 16}" customWidth="1"/>`)
    .join("");

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<cols>${cols}</cols>
<sheetData>${sheetRows.join("")}</sheetData>
<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const sheetName = xmlEscape(table.title.slice(0, 31));
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/styles.xml", content: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml },
  ];

  triggerDownload(
    zipStored(files),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    `${table.fileName}.xlsx`
  );
}

// ---------------------------------------------------------------- pdf ----

// Helvetica advance widths (1/1000 em) for ASCII 32–126, from the standard AFM.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

// Characters outside Latin-1 that WinAnsiEncoding still covers.
const WIN_ANSI: Record<string, number> = { "—": 0x97, "–": 0x96, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "…": 0x85 };

function toWinAnsi(value: string) {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 63;
    if (WIN_ANSI[char] !== undefined) out += String.fromCharCode(WIN_ANSI[char]);
    else if (code < 256) out += char;
    else out += "?";
  }
  return out;
}

function textWidth(value: string, size: number, bold: boolean) {
  let units = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    units += code >= 32 && code <= 126 ? HELVETICA_WIDTHS[code - 32] : 556;
  }
  return (units / 1000) * size * (bold ? 1.06 : 1);
}

function pdfString(value: string) {
  return `(${toWinAnsi(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

function fitText(value: string, maxWidth: number, size: number, bold: boolean) {
  if (textWidth(value, size, bold) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && textWidth(`${cut}…`, size, bold) > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255) as Rgb;
const COLORS = {
  title: rgb("#1E3A8A"),
  muted: rgb("#64748B"),
  text: rgb("#0F172A"),
  header: rgb("#1E40AF"),
  white: rgb("#FFFFFF"),
  stripe: rgb("#F8FAFC"),
  total: rgb("#E2E8F0"),
  line: rgb("#CBD5E1"),
};

export function downloadPdf(table: ExportTable) {
  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const margin = 40;
  const tableWidth = pageWidth - margin * 2;
  const rowHeight = 22;
  const headerHeight = 26;
  const fontSize = 10;

  const weights = table.columns.map((column) => column.pdfWeight ?? 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((weight) => (weight / weightSum) * tableWidth);
  const xs = widths.map((_, index) => margin + widths.slice(0, index).reduce((a, b) => a + b, 0));

  const pages: string[] = [];
  let ops: string[] = [];
  let y = 0;

  const fill = (color: Rgb) => `${color.map((v) => v.toFixed(3)).join(" ")} rg`;
  const stroke = (color: Rgb) => `${color.map((v) => v.toFixed(3)).join(" ")} RG`;
  const text = (value: string, x: number, baseline: number, size: number, bold: boolean, color: Rgb) =>
    ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${fill(color)} ${x.toFixed(2)} ${baseline.toFixed(2)} Td ${pdfString(value)} Tj ET`);

  const cellX = (index: number, value: string, size: number, bold: boolean, align: ExportColumn["align"]) => {
    const padding = 6;
    const width = textWidth(value, size, bold);
    if (align === "right") return xs[index] + widths[index] - padding - width;
    if (align === "center") return xs[index] + (widths[index] - width) / 2;
    return xs[index] + padding;
  };

  const drawRow = (values: string[], options: { bold: boolean; background?: Rgb; color: Rgb; height: number; header?: boolean }) => {
    const top = y;
    const bottom = y - options.height;
    if (options.background) ops.push(`${fill(options.background)} ${margin} ${bottom.toFixed(2)} ${tableWidth} ${options.height} re f`);
    ops.push(`${stroke(COLORS.line)} 0.6 w ${margin} ${bottom.toFixed(2)} m ${margin + tableWidth} ${bottom.toFixed(2)} l S`);
    values.forEach((raw, index) => {
      const column = table.columns[index];
      const value = fitText(raw, widths[index] - 12, fontSize, options.bold);
      const align = options.header ? (column.align === "left" ? "left" : "center") : column.align;
      const baseline = bottom + (options.height - fontSize) / 2 + 2.5;
      text(value, cellX(index, value, fontSize, options.bold, align), baseline, fontSize, options.bold, options.color);
    });
    // Vertical grid lines for this row.
    for (const x of [...xs, margin + tableWidth]) ops.push(`${x.toFixed(2)} ${bottom.toFixed(2)} m ${x.toFixed(2)} ${top.toFixed(2)} l S`);
    y = bottom;
  };

  const startPage = (first: boolean) => {
    ops = [];
    y = pageHeight - margin;
    if (first) {
      text(table.title, margin, y - 16, 18, true, COLORS.title);
      y -= 30;
      for (const line of table.subtitle) {
        text(line, margin, y - 10, 10, false, COLORS.muted);
        y -= 15;
      }
      y -= 10;
    }
    ops.push(`${stroke(COLORS.line)} 0.6 w ${margin} ${y.toFixed(2)} m ${margin + tableWidth} ${y.toFixed(2)} l S`);
    drawRow(table.columns.map((column) => column.header), { bold: true, background: COLORS.header, color: COLORS.white, height: headerHeight, header: true });
  };

  const finishPage = () => pages.push(ops.join("\n"));
  const bottomLimit = margin + 40;

  startPage(true);
  const asText = (values: ExportCell[]) => values.map((value, index) => cellText(value, table.columns[index]));
  table.rows.forEach((row, index) => {
    if (y - rowHeight < bottomLimit) {
      finishPage();
      startPage(false);
    }
    drawRow(asText(row), { bold: false, background: index % 2 ? COLORS.stripe : undefined, color: COLORS.text, height: rowHeight });
  });
  if (table.totalRow) {
    if (y - rowHeight < bottomLimit) {
      finishPage();
      startPage(false);
    }
    drawRow(asText(table.totalRow), { bold: true, background: COLORS.total, color: COLORS.text, height: rowHeight });
  }
  if (table.note) {
    if (y - 24 < bottomLimit) {
      finishPage();
      startPage(false);
    }
    text(table.note, margin, y - 18, 9, false, COLORS.muted);
  }
  finishPage();

  // Footer on every page: generated date and page numbers.
  const generated = `Generated on ${new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  const contents = pages.map((content, index) => {
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    const footer = [
      `${stroke(COLORS.line)} 0.6 w ${margin} ${margin - 8} m ${pageWidth - margin} ${margin - 8} l S`,
      `BT /F1 8 Tf ${fill(COLORS.muted)} ${margin} ${margin - 20} Td ${pdfString(generated)} Tj ET`,
      `BT /F1 8 Tf ${fill(COLORS.muted)} ${(pageWidth - margin - textWidth(pageLabel, 8, false)).toFixed(2)} ${margin - 20} Td ${pdfString(pageLabel)} Tj ET`,
    ].join("\n");
    return toWinAnsi(`${content}\n${footer}`);
  });

  // Objects: 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, then a page
  // and its content stream per page.
  const objects: string[] = [];
  const pageIds = contents.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  contents.forEach((content, index) => {
    const pageId = pageIds[index];
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`;
    objects[pageId + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  const title = toWinAnsi(table.title).replace(/[()\\]/g, "");
  const infoId = objects.length;
  objects[infoId] = `<< /Title (${title}) /Producer (XTS Opportunity Tracker) >>`;

  // Every character is one byte (WinAnsi), so string length = byte offset.
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  triggerDownload(bytes, "application/pdf", `${table.fileName}.pdf`);
}
