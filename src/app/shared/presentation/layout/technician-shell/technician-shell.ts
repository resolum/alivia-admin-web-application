import { Component } from '@angular/core';
import { NavSection, PortalShell } from '../portal-shell/portal-shell';

/** Layout of the field technicians' portal. */
@Component({
  selector: 'app-technician-shell', imports: [PortalShell],
  template: '<app-portal-shell [sections]="sections" portal="Portal técnico" area="TÉCNICO DE CAMPO" [fieldArea]="true" roleLabel="Técnico de campo" />',
})
export class TechnicianShell {
  protected readonly sections: NavSection[] = [
    { title: 'Principal', links: [{ path: 'home', label: 'Inicio', icon: 'M4 10.5 12 4l8 6.5V20h-5v-6h-6v6H4z' }] },
    { title: 'Operación técnica', links: [
      { path: 'orders', label: 'Mis órdenes técnicas', icon: 'M9 4h6v3H9zM7 5H5v16h14V5h-2M8 11h8M8 15h8M8 19h5' },
      { path: 'calendar', label: 'Calendario', icon: 'M4 6h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01' },
      { path: 'households', label: 'Hogares asignados', icon: 'M3 21V7l6-3v17M9 21V9h12v12M3 21h18M12 12h.01M15 12h.01M18 12h.01M12 16h.01M15 16h.01M18 16h.01' },
      { path: 'equipment', label: 'Equipos y dispositivos', icon: 'M4 5h12v9H4zM2 18h16M17 9h5v11h-5z' },
    ] },
    { title: 'Analítica', links: [{ path: 'metrics', label: 'Métricas', icon: 'M3 17l5-5 4 3 7-7M15 8h4v4M3 21h.01' }] },
  ];
}
