import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';
import { ShellAccount } from './shell-account';

async function render(staffName: string | null, fallbackName: string | null = null) {
  const iam = { signOut: vi.fn(), staffName: vi.fn().mockResolvedValue(staffName), currentEmail: () => 'diego.ramos@alivia.test' };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: IamStore, useValue: iam }] });
  const fixture = TestBed.createComponent(ShellAccount);
  fixture.componentRef.setInput('role', 'Gestor de suscripciones');
  fixture.componentRef.setInput('fallbackName', fallbackName);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, iam, element: fixture.nativeElement as HTMLElement };
}

describe('ShellAccount', () => {
  it('shows the staff name, its initials and the role', async () => {
    const { element } = await render('Diego Ramos');
    expect(element.querySelector('strong')!.textContent).toBe('Diego Ramos');
    expect(element.querySelector('.avatar')!.textContent).toBe('DR');
    expect(element.textContent).toContain('Gestor de suscripciones');
  });

  it('falls back to the given name and then to the email', async () => {
    expect((await render(null, 'Dra. Mariana Valdivia')).element.querySelector('.avatar')!.textContent).toBe('MV');
    expect((await render(null)).element.querySelector('strong')!.textContent).toBe('diego.ramos@alivia.test');
  });

  it('signs out from its menu', async () => {
    const { fixture, iam, element } = await render('Diego Ramos');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    element.querySelector<HTMLButtonElement>('.more')!.click();
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.account-menu button')!.click();
    expect(iam.signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });
});
