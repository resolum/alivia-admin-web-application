import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Placeholder for a section whose screens are not built yet; the title comes from the route data. */
@Component({
  selector: 'app-coming-soon',
  template: `<section class="page"><div class="page-heading"><div><h1>{{ title }}</h1><p>Esta sección estará disponible pronto.</p></div></div></section>`,
})
export class ComingSoon {
  protected readonly title: string = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}
