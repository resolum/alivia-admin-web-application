import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';
import { ComingSoon } from '../../views/coming-soon/coming-soon';
import { TechnicianShell } from './technician-shell';

describe('TechnicianShell', () => {
  it('lists the technician sections and signs out from the account menu', () => {
    const iam = { signOut: vi.fn(), staffName: vi.fn().mockResolvedValue('Ana Torres'), currentEmail: () => 'ana.torres@alivia.test' };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: IamStore, useValue: iam }] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(TechnicianShell);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Mis órdenes técnicas');
    expect(text).toContain('Hogares asignados');
    expect(text).toContain('Equipos y dispositivos');
    expect(text).toContain('Técnico de campo');
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.more')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.account-menu button')!.click();
    expect(iam.signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('shows the title of a section that is not built yet', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: { title: 'Calendario' } } } }] });
    const fixture = TestBed.createComponent(ComingSoon);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')!.textContent).toBe('Calendario');
  });
});
