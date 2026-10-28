import { TestBed } from '@angular/core/testing';
import { InvitationPreview } from './invitation-preview';

describe('InvitationPreview', () => {
  it('shows the invitation with the employee being registered', () => {
    const fixture = TestBed.createComponent(InvitationPreview);
    fixture.componentRef.setInput('fullName', 'Ana Pérez');
    fixture.componentRef.setInput('roleLabel', 'Soporte técnico');
    fixture.componentRef.setInput('email', 'ana@alivia.pe');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Hola Ana Pérez');
    expect(text).toContain('Soporte técnico');
    expect(text).toContain('ana@alivia.pe');
    expect(text).toContain('48 horas');
  });

  it('uses placeholders until the form is filled', () => {
    const fixture = TestBed.createComponent(InvitationPreview);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Hola colaborador');
  });
});
