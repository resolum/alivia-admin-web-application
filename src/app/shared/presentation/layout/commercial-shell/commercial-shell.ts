import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ShellAccount } from '../../components/shell-account/shell-account';

type NavLink = { path: string; label: string; icon: string };
type NavSection = { title: string; links: NavLink[] };

/** Layout of the commercial portal used by subscription managers; same look as the administration one. */
@Component({ selector: 'app-commercial-shell', imports: [RouterOutlet, RouterLink, RouterLinkActive, ShellAccount], templateUrl: './commercial-shell.html', styleUrls: ['../admin-shell/admin-shell.css', './commercial-shell.css'] })
export class CommercialShell {
  private readonly router = inject(Router);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly collapsed = signal(false);
  protected readonly sections: NavSection[] = [
    { title: 'Principal', links: [{ path: 'home', label: 'Inicio', icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' }] },
    { title: 'Gestión comercial', links: [
      { path: 'plans', label: 'Planes', icon: 'M4 5h16v4H4zM5 9v10h14V9M10 13h4' },
      { path: 'hiring', label: 'Contrataciones', icon: 'M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21zM9 8h6M9 12h6M9 16h3' },
      { path: 'subscriptions', label: 'Suscripciones', icon: 'M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4' },
    ] },
    { title: 'Analítica', links: [{ path: 'metrics', label: 'Métricas', icon: 'M3 17l5-5 4 3 7-7M15 8h4v4M3 21h.01' }] },
  ];

  /** "Portal comercial › Planes", from the title of the active section. */
  protected readonly breadcrumb = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd), startWith(null), map(() => this.currentTitle()),
  ), { initialValue: '' });

  private currentTitle(): string {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return (route.data['title'] as string | undefined) ?? '';
  }

  protected closeMobileMenu(): void { this.mobileMenuOpen.set(false); }
}
