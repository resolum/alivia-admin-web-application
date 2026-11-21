import { Component, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ShellAccount } from '../../components/shell-account/shell-account';

export type NavLink = { path: string; label: string; icon: string };
export type NavSection = { title: string; links: NavLink[] };

/** Sidebar and top bar shared by the commercial and technician portals; same look as the administration one. */
@Component({ selector: 'app-portal-shell', imports: [RouterOutlet, RouterLink, RouterLinkActive, ShellAccount], templateUrl: './portal-shell.html', styleUrls: ['../admin-shell/admin-shell.css', './portal-shell.css'] })
export class PortalShell {
  private readonly router = inject(Router);
  readonly sections = input.required<NavSection[]>();
  /** Portal name that opens the breadcrumb, as "Portal comercial". */
  readonly portal = input.required<string>();
  /** Area shown under the brand. */
  readonly area = input.required<string>();
  /** Shows the area in the accent color of the field portal. */
  readonly fieldArea = input(false);
  readonly badge = input<string | null>(null);
  readonly roleLabel = input.required<string>();
  protected readonly mobileMenuOpen = signal(false);
  protected readonly collapsed = signal(false);
  /** Set on the first toggle, so the brand fade never plays on page load. */
  protected readonly toggled = signal(false);
  protected toggleCollapsed(): void { this.toggled.set(true); this.collapsed.update(value => !value); }

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
