import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EmployeeRow } from '../../../domain/employee.entity';
import { EmployeeDrawer } from './employee-drawer';

const row = {
  employee: { id: 3, firstName: 'Farid', lastName: 'Coronel', role: 'SUBSCRIPTION_MANAGER', status: 'ACTIVE', corporateEmail: 'farid@alivia.pe',
    phoneNumber: '51987654321', dni: '12345678', birthDate: '2000-01-01', createdAt: '2026-10-27T10:00:00' },
  code: 'ALV-GES-0003', contractState: 'ACTIVE', availability: 'UNAVAILABLE', schedule: null, scheduleDays: null, scheduleHours: null,
  contract: { id: 6, code: 'CTR-ALV-2026-750628', position: 'Gestor', startDate: '2024-12-01', endDate: '2026-12-12' },
} as unknown as EmployeeRow;

describe('EmployeeDrawer', () => {
  it('shows the missing availability requirement and the next action', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(EmployeeDrawer);
    fixture.componentRef.setInput('row', row);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;

    expect(text).toContain('Farid Coronel');
    expect(text).toContain('+51 987 654 321');
    expect(fixture.nativeElement.querySelectorAll('.checks li.met').length).toBe(1);
    expect(text).toContain('Configurar horario');

    let closed = false;
    fixture.componentInstance.closed.subscribe(() => closed = true);
    (fixture.nativeElement.querySelector('.close') as HTMLButtonElement).click();
    expect(closed).toBe(true);
  });
});
