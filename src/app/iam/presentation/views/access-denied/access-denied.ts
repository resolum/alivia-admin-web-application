import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IamStore } from '../../../application/iam.store';

/** Signed-in users whose role has no portal here (US-17, scenario 3). */
@Component({
  selector: 'app-access-denied',
  styleUrl: '../activate-account/activate-account.css',
  template: `
    <main class="activation">
      <header class="portal">
        <img class="logo" src="logo.webp" alt="Alivia" width="64" height="64" />
        <small>PORTAL ADMINISTRATIVO CLÍNICO</small>
      </header>
      <section class="panel" role="alert">
        <div class="badge error-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div>
        <h1>Acceso denegado</h1>
        <p class="lead">Tu cuenta no tiene permiso para usar el portal de negocio. Si crees que es un error, pide al administrador de tu negocio que revise tus responsabilidades.</p>
        @if (email) { <p class="account">{{ email }}</p> }
        <button type="button" class="button primary wide" (click)="signOut()">Iniciar sesión con otra cuenta</button>
      </section>
      <footer>Alivia Asistencia &amp; Salud S.A.C.</footer>
    </main>
  `,
})
export class AccessDenied {
  private readonly iam = inject(IamStore); private readonly router = inject(Router);
  protected readonly email = this.iam.currentEmail();
  protected signOut(): void { this.iam.signOut(); void this.router.navigate(['/sign-in']); }
}
