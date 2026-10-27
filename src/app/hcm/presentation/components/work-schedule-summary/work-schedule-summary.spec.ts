import { TestBed } from '@angular/core/testing';
import { WorkScheduleSummary } from './work-schedule-summary';

function render(inputs: Record<string, unknown>): string {
  const fixture = TestBed.createComponent(WorkScheduleSummary);
  for (const [key, value] of Object.entries({ workingDays: ['MONDAY', 'FRIDAY'], ...inputs })) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent ?? '';
}

describe('WorkScheduleSummary', () => {
  it('compares the configured hours with the contract', () => {
    expect(render({ contract: { code: 'CTR-1', weeklyHours: 40 }, configuredHours: 40 })).toContain('exacto y conforme');
    expect(render({ contract: { code: 'CTR-1', weeklyHours: 40 }, configuredHours: 44 })).toContain('+4 hrs sobre lo pactado');
    expect(render({ contract: { code: 'CTR-1', weeklyHours: 40 }, configuredHours: 36 })).toContain('-4 hrs por asignar');
    expect(render({ contract: { code: 'CTR-1', weeklyHours: null }, configuredHours: 36 })).toContain('no pacta horas');
    expect(render({ contract: null, configuredHours: 36 })).toContain('Elige un contrato');
  });

  it('shows the validity, the legal limit and the last change', () => {
    const text = render({ configuredHours: 50, startDate: '2026-01-01', endDate: '2026-06-30', lastModified: '2026-01-15T10:00:00' });
    expect(text).toContain('01 ene 2026');
    expect(text).toContain('al 30 jun 2026');
    expect(text).toContain('48 h');
    expect(text).toContain('2026-01-15');
  });
});
