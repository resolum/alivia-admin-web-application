import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';
import { CareShell } from './care-shell';

describe('CareShell', () => {
  it('lists the care sections', () => {
    const iam = { signOut: vi.fn(), staffName: vi.fn().mockResolvedValue(null), currentEmail: () => 'ana.torres@alivia.test' };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: IamStore, useValue: iam }] });
    const fixture = TestBed.createComponent(CareShell);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const label of ['Portal de cuidado', 'Mi agenda', 'Medicación', 'Autonomía']) expect(text).toContain(label);
  });
});
