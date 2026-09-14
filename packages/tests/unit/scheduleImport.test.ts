import { describe, it, expect } from 'vitest';
import { parseScheduleImport, scheduleTemplateRows, type ScheduleImportContext } from '../../../apps/web/src/pages/scheduling/grid/scheduleImportModel.js';

const context: ScheduleImportContext = {
  people: [
    { id: 'e1', name: 'Grace Williams', email: 'grace@abc.test', employeeNumber: 'EMP-001' },
    { id: 'e2', name: 'Michael Brown', email: null, employeeNumber: 'EMP-002' },
    { id: 'e3', name: 'Michael Brown', email: 'mb2@abc.test', employeeNumber: 'EMP-003' }
  ],
  departments: [{ id: 'd-front', name: 'Front End' }],
  dates: ['2025-05-12', '2025-05-13', '2025-05-14', '2025-05-15', '2025-05-16', '2025-05-17', '2025-05-18'],
  weekLabel: 'Week 20 · May 12 – May 18, 2025'
};

describe('schedule import (design handoff schedImport — every row validated before it lands)', () => {
  it('needs someone, a date and both times', () => {
    expect(parseScheduleImport([['Employee', 'Date']], context).missingColumns).toEqual(['Start Time', 'End Time']);
    expect(parseScheduleImport([['Email', 'Date', 'Start', 'End']], context).missingColumns).toEqual([]);
  });

  it('turns good rows into shifts and days off, and explains every rejected row', () => {
    const { rows } = parseScheduleImport(
      [
        ['Employee', 'Employee ID', 'Date', 'Start Time', 'End Time', 'Break (minutes)', 'Department', 'Notes'],
        ['Grace Williams', '', '05/12/2025', '7:30 AM', '5:00 PM', '60', 'front end', 'Opening'],
        ['', 'EMP-003', '2025-05-13', 'OFF', 'OFF', '', '', ''],
        ['Michael Brown', '', '05/14/2025', '09:00', '17:00', '', '', ''],
        ['Nobody Here', '', '05/14/2025', '09:00', '17:00', '', '', ''],
        ['Grace Williams', '', '05/20/2025', '09:00', '17:00', '', '', ''],
        ['Grace Williams', '', '05/15/2025', 'noon', '17:00', 'lots', 'Bakery', ''],
        ['Grace Williams', '', '05/12/2025', '07:30', '17:00', '', '', '']
      ],
      context
    );
    expect(rows[0]).toMatchObject({ employeeId: 'e1', date: '2025-05-12', off: false, startTime: '07:30', endTime: '17:00', breakMinutes: 60, departmentId: 'd-front', notes: 'Opening', problems: [] });
    expect(rows[1]).toMatchObject({ employeeId: 'e3', date: '2025-05-13', off: true, problems: [] });
    expect(rows[2].problems).toEqual(['More than one person has this name — add their Employee ID']);
    expect(rows[3].problems).toEqual(['Employee not found in this branch']);
    expect(rows[4].problems).toEqual(["Date isn't in Week 20 · May 12 – May 18, 2025"]);
    expect(rows[5].problems).toEqual(['Invalid start time', 'Break must be whole minutes (0–240)', "Department doesn't exist"]);
    expect(rows[6].problems).toEqual(['Same shift as row 2']);
  });

  it('writes a template with a shift and a day off in MM/DD/YYYY', () => {
    expect(scheduleTemplateRows('Grace Williams', '2025-05-12', '2025-05-13', 'Front End').slice(1)).toEqual([
      ['Grace Williams', '', '05/12/2025', '07:30', '17:00', '60', 'Front End', ''],
      ['Grace Williams', '', '05/13/2025', 'OFF', 'OFF', '', '', 'Day off']
    ]);
  });
});
