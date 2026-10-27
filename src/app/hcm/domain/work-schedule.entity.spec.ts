import { complianceText, dayBlocksError, formatDate, formatHours, initials, totalHours } from './work-schedule.entity';

describe('work schedule domain helpers', () => {
  it('adds the hours of valid blocks', () => {
    expect(totalHours([{ startTime: '08:00', endTime: '12:00' }, { startTime: '13:00', endTime: '17:30' }])).toBe(8.5);
    expect(totalHours([{ startTime: '18:00', endTime: '08:00' }])).toBe(0);
  });

  it('rejects incomplete, inverted and overlapping blocks', () => {
    expect(dayBlocksError([{ startTime: '08:00', endTime: '12:00' }, { startTime: '13:00', endTime: '17:00' }])).toBeNull();
    expect(dayBlocksError([{ startTime: '', endTime: '12:00' }])).toContain('Completa');
    expect(dayBlocksError([{ startTime: '22:00', endTime: '06:00' }])).toContain('medianoche');
    expect(dayBlocksError([{ startTime: '13:00', endTime: '17:00' }, { startTime: '08:00', endTime: '13:30' }])).toContain('cruzarse');
  });

  it('formats dates, hours and initials', () => {
    expect(formatDate('2024-01-01')).toBe('01 ene 2024');
    expect(formatHours(48)).toBe('48');
    expect(formatHours(44.25)).toBe('44.3');
    expect(initials('Santiago Vega Ruiz')).toBe('SV');
  });

  it('explains how the schedule compares with its contract', () => {
    const contract = { id: 5, code: 'CTR-ALV-2026-0005', modality: 'HOURLY' as const, weeklyHours: 48, startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE' as const };
    expect(complianceText({ contract: null, compliance: 'NO_REFERENCE', weeklyHours: 40 })).toContain('se vincula al publicarlo');
    expect(complianceText({ contract, compliance: 'COMPLIANT', weeklyHours: 48 })).toContain('No presenta horas en exceso');
    expect(complianceText({ contract, compliance: 'OVER', weeklyHours: 52 })).toContain('excede en 4 h');
    expect(complianceText({ contract, compliance: 'UNDER', weeklyHours: 40 })).toContain('faltan 8 h');
  });
});
