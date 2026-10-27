import { TestBed } from '@angular/core/testing';
import { EmployeesStore } from '../../../application/employees.store';
import { HcmApiError } from '../../../infrastructure/hcm.api';
import { EmployeeForm } from './employee-form';

type FormGroupLike = { setValue(value: object): void; patchValue(value: object): void; invalid: boolean; controls: Record<string, { touched: boolean }> };
type Wizard = {
  step(): number; next(): void; back(): void; goTo(step: number): void; submit(): Promise<void>;
  personal: FormGroupLike; access: FormGroupLike & { hasError(code: string): boolean };
  confirmed: { setValue(value: boolean): void }; fullName(): string; message(): string; registered(): unknown;
  invalid(control: unknown): boolean;
  digitsOnly(control: unknown, event: Event): void; mobileError(): string;
};

describe('EmployeeForm', () => {
  const store = { create: vi.fn() };
  let wizard: Wizard;

  beforeEach(() => {
    store.create.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: EmployeesStore, useValue: store }] });
    wizard = TestBed.runInInjectionContext(() => new EmployeeForm()) as unknown as Wizard;
  });

  function fillToReview(): void {
    wizard.personal.setValue({ dni: '47891234', firstName: 'Carlos Daniel', paternalSurname: 'Mendoza', maternalSurname: 'Ugarte', birthDate: '1992-04-10', mobile: '984321890' });
    wizard.next(); wizard.next();
    wizard.access.setValue({ corporateEmail: 'Carlos.Mendoza@alivia.pe', confirmEmail: 'carlos.mendoza@alivia.pe' });
    wizard.next();
  }

  it('does not advance with invalid personal data', () => {
    wizard.next();
    expect(wizard.step()).toBe(1);
    expect(wizard.invalid(wizard.personal.controls['dni'])).toBe(true);
  });

  it('requires both corporate emails to match', () => {
    wizard.personal.setValue({ dni: '47891234', firstName: 'Carlos', paternalSurname: 'Mendoza', maternalSurname: 'Ugarte', birthDate: '1992-04-10', mobile: '984321890' });
    wizard.next(); wizard.next();
    wizard.access.setValue({ corporateEmail: 'a@alivia.pe', confirmEmail: 'b@alivia.pe' });
    wizard.next();
    expect(wizard.step()).toBe(3);
    expect(wizard.access.hasError('emailMismatch')).toBe(true);
  });

  it('navigates back only to completed steps', () => {
    fillToReview();
    expect(wizard.step()).toBe(4);
    wizard.goTo(4);
    expect(wizard.step()).toBe(4);
    wizard.goTo(2);
    expect(wizard.step()).toBe(2);
    wizard.back();
    expect(wizard.step()).toBe(1);
  });

  it('registers the employee after confirmation', async () => {
    fillToReview();
    await wizard.submit();
    expect(store.create).not.toHaveBeenCalled();

    store.create.mockResolvedValue({ id: 52 });
    wizard.confirmed.setValue(true);
    await wizard.submit();
    expect(wizard.fullName()).toBe('Carlos Daniel Mendoza Ugarte');
    expect(store.create).toHaveBeenCalledWith({ corporateEmail: 'carlos.mendoza@alivia.pe', phoneNumber: '51984321890', dni: '47891234', birthDate: '1992-04-10', firstName: 'Carlos Daniel', lastName: 'Mendoza Ugarte', role: 'TECH' });
    expect(wizard.registered()).toEqual({ id: 52 });
  });

  it('explains duplicates and other errors', async () => {
    fillToReview();
    wizard.confirmed.setValue(true);
    store.create.mockRejectedValueOnce(new HcmApiError('The email address is already registered.', 409));
    await wizard.submit();
    expect(wizard.message()).toContain('Revisa el DNI y el correo institucional');

    store.create.mockRejectedValueOnce(new Error('Sin conexión'));
    await wizard.submit();
    expect(wizard.message()).toBe('Sin conexión');
  });

  it('only accepts birth dates before today', () => {
    const birthDate = (wizard.personal.controls as unknown as Record<string, { setValue(value: string): void; hasError(code: string): boolean }>)['birthDate']!;
    birthDate.setValue('2999-01-01');
    expect(birthDate.hasError('notPast')).toBe(true);
    birthDate.setValue('2000-02-29');
    expect(birthDate.hasError('notPast')).toBe(false);
  });

  it('keeps only digits and explains what is wrong with the mobile', () => {
    const mobile = (wizard.personal.controls as unknown as Record<string, { value: string; setValue(value: string): void }>)['mobile']!;
    const input = { value: '98a 4-32' };
    wizard.digitsOnly(mobile, { target: input } as unknown as Event);
    expect(input.value).toBe('98432');
    expect(mobile.value).toBe('98432');
    expect(wizard.mobileError()).toBe('Faltan 4 dígitos: el celular tiene 9.');
    mobile.setValue('');
    expect(wizard.mobileError()).toBe('Ingresa el número de celular.');
    mobile.setValue('812345678');
    expect(wizard.mobileError()).toBe('Un celular en Perú empieza con 9.');
    const clean = { value: '987' };
    wizard.digitsOnly(mobile, { target: clean } as unknown as Event);
    expect(mobile.value).toBe('812345678');
  });
});
