/**
 * Reads the first sheet of an uploaded .csv or .xlsx into rows of strings,
 * with no third-party parser: CSV per RFC 4180 (quoted fields, doubled
 * quotes, CRLF, BOM, comma/semicolon/tab), and .xlsx by unzipping the
 * workbook with the platform's DecompressionStream and reading its sheet
 * XML. Legacy binary .xls is recognised and refused with a clear message.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export class SpreadsheetError extends Error {}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const firstLine = source.slice(0, source.search(/\r?\n|$/));
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length - 1] as const);
  const delimiter = counts.reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&');
}

/** All `<t>` text inside one shared-string or inline-string element (rich text runs included). */
function textOf(xml: string): string {
  let text = '';
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) text += decodeXml(match[1]);
  return text;
}

function columnIndex(ref: string): number {
  let index = 0;
  for (const char of ref.replace(/\d+$/, '')) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  // Copy into a plain ArrayBuffer-backed view: a subarray of the upload can't be handed to Blob as-is.
  const stream = new Blob([new Uint8Array(data)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Minimal zip reader: the central directory tells us where each entry's data starts. */
async function readZip(buffer: ArrayBuffer): Promise<Map<string, () => Promise<string>>> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new SpreadsheetError("This file isn't a valid .xlsx workbook.");
  const entries = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const files = new Map<string, () => Promise<string>>();
  for (let n = 0; n < entries; n++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    files.set(name, async () => {
      const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return decoder.decode(data);
      if (method === 8) return decoder.decode(await inflateRaw(data));
      throw new SpreadsheetError("This workbook uses a compression format we can't read — save it again as .xlsx or .csv.");
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await readZip(buffer);
  const read = async (name: string): Promise<string | null> => (files.has(name) ? (files.get(name) as () => Promise<string>)() : null);

  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = await read('xl/workbook.xml');
  const rels = await read('xl/_rels/workbook.xml.rels');
  const firstSheetRel = workbook?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (firstSheetRel && rels) {
    const target = rels.match(new RegExp(`<Relationship\\b[^>]*\\bId="${firstSheetRel}"[^>]*\\bTarget="([^"]+)"`))?.[1]
      ?? rels.match(new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${firstSheetRel}"`))?.[1];
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  }
  const sheet = await read(sheetPath);
  if (!sheet) throw new SpreadsheetError("We couldn't find a worksheet in this file.");

  const shared: string[] = [];
  const sharedXml = await read('xl/sharedStrings.xml');
  if (sharedXml) for (const match of sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(match[1]));

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] ?? rows.length + 1);
    const cells: string[] = [];
    let nextColumn = 0;
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2] ?? '';
      const ref = attributes.match(/\br="([A-Z]+\d+)"/)?.[1];
      const column = ref ? columnIndex(ref) : nextColumn;
      nextColumn = column + 1;
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = '';
      if (type === 's' && raw !== undefined) value = shared[Number(raw)] ?? '';
      else if (type === 'inlineStr') value = textOf(body);
      else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
      else if (raw !== undefined) value = decodeXml(raw);
      cells[column] = value;
    }
    rows[rowNumber - 1] = Array.from(cells, (cell) => cell ?? '');
  }
  return Array.from(rows, (row) => row ?? []);
}

/** Reads a File the wizard received from the picker or a drop. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.size > MAX_FILE_BYTES) throw new SpreadsheetError('This file is larger than 5MB. Split it into smaller files and import them one at a time.');
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  const head = new Uint8Array(buffer.slice(0, 4));
  if (name.endsWith('.xls') || (head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0)) {
    throw new SpreadsheetError('Older .xls files can’t be read. Open it in Excel, save it as .xlsx or .csv, and upload that instead.');
  }
  if (name.endsWith('.xlsx') || (head[0] === 0x50 && head[1] === 0x4b)) return parseXlsx(buffer);
  if (name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain') return parseCsv(new TextDecoder().decode(buffer));
  throw new SpreadsheetError('Upload an .xlsx or .csv file.');
}

/** MM/DD/YYYY (the templates' format), M/D/YYYY, YYYY-MM-DD, or an Excel date serial → 'YYYY-MM-DD'; null when it isn't a real date. */
export function parseSheetDate(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  let year: number;
  let month: number;
  let day: number;
  let match: RegExpMatchArray | null;
  if ((match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/))) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    [month, day, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if (/^\d{5}(\.\d+)?$/.test(text) && Number(text) > 20000 && Number(text) < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(text)) * 86_400_000);
    return date.toISOString().slice(0, 10);
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || year < 1900) return null;
  return date.toISOString().slice(0, 10);
}

/** '7:30', '07:30', '7:30 AM', '19:00', '1900' or an Excel time fraction (0.3125) → 'HH:MM'; null when it isn't a time. */
export function parseSheetTime(value: string): string | null {
  const text = value.trim().toUpperCase();
  if (!text) return null;
  const pad = (n: number): string => String(n).padStart(2, '0');
  if (/^0?\.\d+$/.test(text) && Number(text) < 1) {
    const minutes = Math.round(Number(text) * 1440) % 1440;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  }
  const match = text.match(/^(\d{1,2})(?::?(\d{2}))?(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  if (match[3]) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (match[3] === 'PM' ? 12 : 0);
  }
  if (hours > 23 || minutes > 59 || (!match[2] && !match[3])) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** A CSV cell, quoted when it needs to be. */
export function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

/** Saves text as a file through a temporary object-URL link. */
export function downloadText(fileName: string, text: string, type = 'text/csv;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
