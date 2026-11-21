import { Component } from '@angular/core';
import { NavSection, PortalShell } from '../portal-shell/portal-shell';

/** Layout of the care portal used by caregivers and relatives. */
@Component({
  selector: 'app-care-shell', imports: [PortalShell],
  template: '<app-portal-shell [sections]="sections" portal="Portal de cuidado" area="Cuidado" roleLabel="Cuidado del hogar" />',
})
export class CareShell {
  protected readonly sections: NavSection[] = [
    { title: 'Cuidado', links: [
      { path: 'agenda', label: 'Mi agenda', icon: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h4' },
      { path: 'medication', label: 'Medicación', icon: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM7 10l7 7' },
    ] },
    { title: 'Analítica', links: [{ path: 'autonomy', label: 'Autonomía', icon: 'M3 17l5-5 4 3 7-7M15 8h4v4M3 21h.01' }] },
  ];
}
