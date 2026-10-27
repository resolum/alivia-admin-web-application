import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';

@Component({ selector: 'app-admin-shell', imports: [RouterOutlet, RouterLink, RouterLinkActive], templateUrl: './admin-shell.html', styleUrl: './admin-shell.css' })
export class AdminShell {
  private readonly iam = inject(IamStore); private readonly router = inject(Router);
  protected readonly mobileMenuOpen = signal(false);
  protected signOut(): void { this.iam.signOut(); void this.router.navigate(['/sign-in']); }
}
