import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { servicedHome } from '../../../domain/serviced-home.fixtures';
import { HomeDetail } from './home-detail';

describe('HomeDetail', () => {
  it('shows the home tab by tab with its map and order links', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HomeDetail);
    fixture.componentRef.setInput('home', servicedHome());
    fixture.componentRef.setInput('orderLink', '/operations');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const tab = (label: string) => [...element.querySelectorAll<HTMLButtonElement>('.tabs button')].find(button => button.textContent?.includes(label))!;

    expect(element.textContent).toContain('Hogar de María');
    expect(element.textContent).toContain('Plan Base');
    expect(element.querySelector<HTMLAnchorElement>('a.map')?.href).toContain('google.com/maps/search/');
    tab('Suscripción').click(); fixture.detectChanges();
    expect(element.textContent).toContain('S/ 99 / mes');
    expect(element.textContent).toContain('Cobro realizado');
    tab('Dispositivos').click(); fixture.detectChanges();
    expect(element.textContent).toContain('Sensor de ventana');
    tab('Órdenes').click(); fixture.detectChanges();
    expect(element.textContent).toContain('INC-2026-0001');
    expect(element.querySelector('a.view-link')?.getAttribute('href')).toBe('/operations/1');
    expect(element.textContent).toContain('1 resueltas');

    fixture.componentRef.setInput('home', servicedHome({ directions: null, devices: [], orders: [] }));
    fixture.componentRef.setInput('orderLink', null);
    fixture.detectChanges();
    expect(element.querySelector('a.map')).toBeNull();
    expect(element.textContent).toContain('no tiene órdenes');
  });
});
