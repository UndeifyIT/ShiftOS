import { describe, it, expect } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { parseCsv, parseSheetTime, parseXlsx, toCsv } from '../../../apps/web/src/lib/spreadsheet.js';
import {
  departmentBreakdown,
  importStats,
  parseImport,
  parseImportDate,
  toImportPayload,
  type ValidationContext
} from '../../../apps/web/src/pages/employees/import/importModel.js';

/** A minimal but real .xlsx: a zip (deflated entries) with a workbook, its rels, shared strings and one sheet. */
function buildXlsx(files: Record<string, string>): ArrayBuffer {
  const encoder = new TextEncoder();
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = Buffer.from(encoder.encode(name));
    const data = deflateRawSync(Buffer.from(encoder.encode(content)));
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  const zip = Buffer.concat([...locals, ...centrals, end]);
  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.length);
}

const context: ValidationContext = {
  departments: [
    { id: 'd-front', name: 'Front End' },
    { id: 'd-ware', name: 'Warehouse' }
  ],
  roles: [
    { id: 'r-emp', name: 'Employee' },
    { id: 'r-sup', name: 'Supervisor' }
  ],
  existingEmails: new Set(['taken@abc.test']),
  existingEmployeeNumbers: new Set(['emp-001'])
};

const HEADER = ['Full Name', 'Email', 'Phone Number', 'Department', 'Role', 'Date of Joining'];

describe('employee import — reading files', () => {
  it('parses quoted CSV fields, doubled quotes, CRLF and a BOM, and round-trips through toCsv', () => {
    const csv = '﻿Full Name,Note\r\n"Doe, Jane","She said ""hi"""\r\nJohn Roe,\r\n';
    expect(parseCsv(csv)).toEqual([
      ['Full Name', 'Note'],
      ['Doe, Jane', 'She said "hi"'],
      ['John Roe', '']
    ]);
    expect(parseCsv(toCsv([['a,b', 'c"d']]))).toEqual([['a,b', 'c"d']]);
  });

  it('reads spreadsheet times on the 12- and 24-hour clock and as Excel fractions', () => {
    expect(parseSheetTime('7:30')).toBe('07:30');
    expect(parseSheetTime('7:30 PM')).toBe('19:30');
    expect(parseSheetTime('12 AM')).toBe('00:00');
    expect(parseSheetTime('0.3125')).toBe('07:30');
    expect(parseSheetTime('25:00')).toBeNull();
    expect(parseSheetTime('7')).toBeNull();
  });

  it('detects semicolon-separated files', () => {
    expect(parseCsv('Full Name;Email\nJane Doe;jane@abc.test')).toEqual([
      ['Full Name', 'Email'],
      ['Jane Doe', 'jane@abc.test']
    ]);
  });

  it('reads the first sheet of an .xlsx with shared strings, inline strings, numbers and gaps', async () => {
    const buffer = buildXlsx({
      'xl/workbook.xml': '<workbook><sheets><sheet name="Staff" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      'xl/sharedStrings.xml': '<sst><si><t>Full Name</t></si><si><t>Date of Joining</t></si><si><r><t>Jane </t></r><r><t>Doe &amp; Co</t></r></si></sst>',
      'xl/worksheets/sheet1.xml':
        '<worksheet><sheetData>' +
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" t="inlineStr"><is><t>skip</t></is></c><c r="C2"><v>45789</v></c></row>' +
        '</sheetData></worksheet>'
    });
    expect(await parseXlsx(buffer)).toEqual([
      ['Full Name', '', 'Date of Joining'],
      ['Jane Doe & Co', 'skip', '45789']
    ]);
  });
});

describe('employee import — validating rows (design handoff VALIDATE_ROWS)', () => {
  it('accepts MM/DD/YYYY, ISO dates and Excel serials, and rejects impossible dates', () => {
    expect(parseImportDate('05/12/2025')).toBe('2025-05-12');
    expect(parseImportDate('2025-05-12')).toBe('2025-05-12');
    expect(parseImportDate('45789')).toBe('2025-05-12');
    expect(parseImportDate('32/05/2025')).toBeNull();
    expect(parseImportDate('02/30/2025')).toBeNull();
  });

  it('reports missing required columns instead of rows', () => {
    const parsed = parseImport([['Full Name', 'Email']], context);
    expect(parsed.missingColumns).toEqual(['Phone Number', 'Department', 'Role', 'Date of Joining']);
    expect(parsed.rows).toEqual([]);
  });

  it('flags each field the way the handoff does, skips blank rows, and spots duplicates', () => {
    const parsed = parseImport(
      [
        HEADER,
        ['James Carter', 'james.carter@email', '+234 801 000 0001', 'Bakery', 'Employee', '05/12/2025'],
        ['Linda Okafor', '', '+234 801 000 0002', 'Front End', '', '05/15/2025'],
        ['', '', '', '', '', ''],
        ['Emeka Ibrahim', 'emeka@abc.test', '+234 801 000 0003', 'warehouse', 'supervisor', '32/05/2025'],
        ['Ada Obi', 'ada@abc.test', '+234 801 000 0004', 'Front End', 'Employee', '2025-05-01'],
        ['Ada Twin', 'ADA@abc.test', '+234 801 000 0005', 'Front End', 'Employee', '2025-05-01'],
        ['Old Hand', 'taken@abc.test', '+234 801 000 0006', 'Warehouse', 'Employee', '2025-05-01']
      ],
      context
    );
    const byName = new Map(parsed.rows.map((row) => [row.name, row]));
    expect(byName.get('James Carter')?.errors).toEqual({ email: 'Invalid email format', department: "Department doesn't exist" });
    expect(byName.get('Linda Okafor')?.errors).toEqual({ email: 'Email is required', role: 'Role is required' });
    expect(byName.get('Emeka Ibrahim')?.errors).toEqual({ hireDate: 'Invalid date format' });
    // Header is row 1 and the blank row 4 still counts, so row numbers match what the manager sees in Excel.
    expect(byName.get('Emeka Ibrahim')).toMatchObject({ departmentId: 'd-ware', roleId: 'r-sup', row: 5 });
    expect(byName.get('Ada Twin')?.duplicateOf).toBe('Same email as row 6');
    expect(byName.get('Old Hand')?.duplicateOf).toBe('Already in your employee list');

    expect(importStats(parsed.rows)).toEqual({ total: 6, valid: 1, withIssues: 3, duplicates: 2 });
    expect(departmentBreakdown(parsed.rows)).toEqual([{ name: 'Front End', n: 1, color: '#7C3AED' }]);
    expect(toImportPayload(parsed.rows, true)).toEqual([
      {
        row: 6,
        firstName: 'Ada',
        lastName: 'Obi',
        email: 'ada@abc.test',
        phone: '+234 801 000 0004',
        departmentId: 'd-front',
        hireDate: '2025-05-01',
        dateOfBirth: null,
        employeeNumber: undefined,
        roleId: 'r-emp'
      }
    ]);
    expect(toImportPayload(parsed.rows, false)[0].roleId).toBeNull();
  });

  it('builds the full name from First/Last columns and needs a last name', () => {
    const parsed = parseImport(
      [
        ['First Name', 'Last Name', 'Email', 'Phone Number', 'Department', 'Role', 'Date of Joining', 'Employee ID'],
        ['Grace', 'Williams', 'grace@abc.test', '08010000007', 'Front End', 'Employee', '05/12/2025', 'EMP-001'],
        ['Cher', '', 'cher@abc.test', '08010000008', 'Front End', 'Employee', '05/12/2025', '']
      ],
      context
    );
    expect(parsed.rows[0]).toMatchObject({ name: 'Grace Williams', errors: { employeeNumber: 'Employee ID already in use' } });
    expect(parsed.rows[1].errors).toEqual({ name: 'Add a last name' });
  });
});
