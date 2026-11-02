import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { IamStore } from '../../../../iam/application/iam.store';
import { ShellAccount } from '../../components/shell-account/shell-account';

type NavLink = { path: string; label: string; icon: string };
type NavSection = { title: string; links: NavLink[] };
export type Crumb = { label: string; link?: string };

@Component({ selector: 'app-admin-shell', imports: [RouterOutlet, RouterLink, RouterLinkActive, ShellAccount], templateUrl: './admin-shell.html', styleUrl: './admin-shell.css' })
export class AdminShell {
  private readonly iam = inject(IamStore); private readonly router = inject(Router);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly collapsed = signal(false);
  /** Line icons drawn on a 24x24 grid, one path per link. */
  protected readonly sections: NavSection[] = [
    { title: 'Principal', links: [{ path: '/home', label: 'Inicio', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' }] },
    { title: 'Capital humano', links: [
      { path: '/hcm/employees', label: 'Empleados', icon: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.3M15.5 4.2a3.5 3.5 0 0 1 0 6.6' },
      { path: '/hcm/contracts', label: 'Contratos', icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6' },
      { path: '/hcm/work-schedules', label: 'Horarios laborales', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2' },
    ] },
    { title: 'Operaciones técnicas', links: [{ path: '/operations', label: 'Órdenes técnicas', icon: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z' }] },
    { title: 'Clientes y servicio', links: [
      { path: '/households', label: 'Hogares', icon: 'M4 10.5 12 4l8 6.5V20H4zM10 20v-5h4v5' },
      { path: '/devices', label: 'Dispositivos', icon: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M12 5a1.5 1.5 0 1 0 0-.01M12 20.5a1.5 1.5 0 1 0 0-.01M5 8.5a1.5 1.5 0 1 0 0-.01M19 8.5a1.5 1.5 0 1 0 0-.01M5 16.5a1.5 1.5 0 1 0 0-.01M19 16.5a1.5 1.5 0 1 0 0-.01M12 6.5V10M12 14v5M6.3 9.2l4 1.8M17.7 9.2l-4 1.8M6.3 15.8l4-1.8M17.7 15.8l-4-1.8' },
    ] },
    { title: 'Gestión comercial', links: [
      { path: '/plans', label: 'Planes', icon: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4' },
      { path: '/hiring', label: 'Contrataciones', icon: 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6M9 12h6M9 16h3' },
      { path: '/subscriptions', label: 'Suscripciones', icon: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4' },
    ] },
    { title: 'Analítica', links: [{ path: '/metrics', label: 'Métricas', icon: 'M3 17l5-5 4 3 7-7M15 8h4v4M3 21h.01' }] },
    { title: 'Configuración', links: [{ path: '/business-profile', label: 'Perfil del negocio', icon: 'M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M15 9h3a2 2 0 0 1 2 2v10M3 21h18M8 7h3M8 11h3M8 15h3' }] },
  ];

  /** Trail declared as `breadcrumb` in the data of the deepest active route. */
  protected readonly breadcrumb = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd), startWith(null), map(() => this.currentBreadcrumb()),
  ), { initialValue: [] as Crumb[] });

  private currentBreadcrumb(): Crumb[] {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return (route.data['breadcrumb'] as Crumb[] | undefined) ?? [];
  }

  protected closeMobileMenu(): void { this.mobileMenuOpen.set(false); }
  protected signOut(): void { this.iam.signOut(); void this.router.navigate(['/sign-in']); }
}
