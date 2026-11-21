import { TestBed } from '@angular/core/testing';
import { servicedHome } from '../domain/serviced-home.fixtures';
import { ServicedHomesApi } from '../infrastructure/serviced-homes.api';
import { ServicedHomesStore } from './serviced-homes.store';

describe('ServicedHomesStore', () => {
  const api = { listHomes: vi.fn(), getHome: vi.fn() };
  let store: ServicedHomesStore;
  beforeEach(() => {
    api.listHomes.mockReset(); api.getHome.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: ServicedHomesApi, useValue: api }] });
    store = TestBed.inject(ServicedHomesStore);
  });

  it('counts the homes, searches and reads one', async () => {
    expect(store.counts().activeShare).toBeNull();
    api.listHomes.mockResolvedValue([servicedHome(), servicedHome({ id: 'b', contactName: 'Luis', paymentStatus: 'FAILED', orders: [] })]);
    await store.load('mine');
    expect(api.listHomes).toHaveBeenCalledWith('mine');
    expect(store.counts()).toEqual({ total: 2, active: 1, activeShare: '50%', openIncidents: 1 });
    store.search.set('luis');
    expect(store.visible().map(home => home.id)).toEqual(['b']);

    api.getHome.mockResolvedValue(servicedHome({ planName: 'Plan Personalizado' }));
    await store.select('draft-a');
    expect(store.selected()?.planName).toBe('Plan Personalizado');
  });

  it('reports failures', async () => {
    api.listHomes.mockRejectedValue(new Error('Tu sesión venció. Vuelve a iniciar sesión.'));
    await store.load('all');
    expect(store.error()).toContain('sesión');
    api.listHomes.mockRejectedValue('boom');
    await store.load('all');
    expect(store.error()).toBe('No se pudieron cargar los hogares.');
    api.getHome.mockRejectedValue('boom');
    await store.select('x');
    expect(store.error()).toBe('No se pudo cargar el hogar.');
    api.getHome.mockRejectedValue(new Error('No encontramos este hogar.'));
    await store.select('x');
    expect(store.error()).toBe('No encontramos este hogar.');
  });
});
