import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IamStore } from '../../../../iam/application/iam.store';

/** Layout of the field technicians' portal. */
@Component({ selector: 'app-technician-shell', imports: [RouterOutlet, RouterLink, RouterLinkActive], templateUrl: './technician-shell.html', styleUrl: './technician-shell.css' })
export class TechnicianShell {
  private readonly iam = inject(IamStore); private readonly router = inject(Router);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly links = [
    { path: 'my-day', label: 'Mi jornada', icon: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a4 4 0 0 1 8 0v6a4 4 0 0 0 4 0V9' },
    { path: 'orders', label: 'Mis órdenes de hoy', icon: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 11h8M8 15h8M8 19h5' },
    { path: 'calendar', label: 'Calendario', icon: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01' },
    { path: 'equipment', label: 'Equipos y bodega móvil', icon: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4' },
    { path: 'performance', label: 'Mi rendimiento', icon: 'M3 21h18M6 17v-3M10 17v-6M14 17v-4M18 17V8M4 12l5-5 4 3 7-6' },
  ] as const;
  protected signOut(): void { this.iam.signOut(); void this.router.navigate(['/sign-in']); }
}
