import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { IamStore } from '../../../application/iam.store';
import { AccessDenied } from './access-denied';

describe('AccessDenied', () => {
  it('shows the account and signs out to try another one', () => {
    const iam = { currentEmail: vi.fn(() => 'limpieza@alivia.pe'), signOut: vi.fn() };
    const router = { navigate: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: IamStore, useValue: iam }, { provide: Router, useValue: router }] });
    const fixture = TestBed.createComponent(AccessDenied);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Acceso denegado');
    expect(element.textContent).toContain('limpieza@alivia.pe');
    element.querySelector('button')!.click();
    expect(iam.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
  });
});
